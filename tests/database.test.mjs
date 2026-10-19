import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { database, applyMigrations, ids, asRole } from './helpers/database.mjs';

let pg;
before(async () => { pg = await database(); });
after(async () => { await pg?.close(); });
const actor = (email, sql, options) => asRole(pg, 'authenticated', email, sql, options);
const denied = async action => assert.rejects(action, /permission denied|row-level security|restrito|paciente|consulta|atendimento|horário|Horário|imutável|fila mudou|duplicate key/i);

test('baseline reproduces cross-clinic patient disclosure and privileged anonymous RPC', async () => {
  const old = await database({ migrate: false });
  try {
    assert.equal((await asRole(old,'authenticated','manager-a@example.test','select count(*)::int as n from paciente')).rows[0].n,3);
    assert.equal((await old.query("select has_function_privilege('anon','public.vezz_reindex_fila_de(uuid,date)','execute') as allowed")).rows[0].allowed,true);
    assert.equal((await asRole(old,'authenticated','patient-a@example.test',`update consulta set status='Em Atendimento' where id_consulta='${ids.appointment}' returning status`)).rows[0].status,'Em Atendimento');
  } finally { await old.close(); }
});

for (const [email, count] of [['patient-a@example.test',1],['patient-b@example.test',1],['manager-a@example.test',1],['manager-b@example.test',1],['staff@example.test',1],['outsider@example.test',0]]) {
  test(`patient RLS isolates ${email}`, async () => assert.equal((await actor(email,'select count(*)::int as n from paciente')).rows[0].n,count));
  test(`appointment RLS isolates ${email}`, async () => assert.equal((await actor(email,'select count(*)::int as n from consulta')).rows[0].n,count));
}
for (const role of ['anon','authenticated']) {
  for (const name of ['vezz_reindex_fila_de(uuid,date)','vezz_fila_proxima_posicao(uuid)','vezz_reindex_fila()','vezz_fila_atribuir_posicao()']) {
    test(`${role} cannot execute ${name}`, async () => assert.equal((await pg.query(`select has_function_privilege('${role}','public.${name}','execute') as allowed`)).rows[0].allowed,false));
  }
  for (const table of ['clinica','endereco','paciente','gestor','consulta','fila_atendimento','solicitacao_clinica','convite_gestor']) {
    test(`${role} cannot truncate ${table}`, async () => assert.equal((await pg.query(`select has_table_privilege('${role}','${table}','truncate') as allowed`)).rows[0].allowed,false));
  }
}
test('anonymous user cannot read private tables', async () => {
  for (const table of ['paciente','gestor','consulta','fila_atendimento','solicitacao_clinica','convite_gestor']) {
    const result = await asRole(pg,'anon',null,`select count(*)::int as n from ${table}`);
    assert.equal(result.rows[0].n,0,table);
  }
});
test('old browser tabs cannot mutate consultations after deployment',async()=>{
  await assert.rejects(asRole(pg,'authenticated','patient-a@example.test',`update consulta set status='Cancelada' where id_consulta='${ids.appointment}'`,{client:null}),/Recarregue/);
});
test('patient cannot start or finish own appointment through direct SQL', async () => {
  for (const status of ['Em Atendimento','Finalizada']) await denied(() => actor('patient-a@example.test',`update consulta set status='${status}' where id_consulta='${ids.appointment}'`));
});
test('staff cannot promote self or move clinic', async () => {
  await denied(() => actor('staff@example.test',"update gestor set principal=true where email='staff@example.test'"));
  await denied(() => actor('staff@example.test',`update gestor set id_clinica='${ids.otherClinic}' where email='staff@example.test'`));
});
test('principal cannot create another principal', async () => denied(() => actor('manager-a@example.test',`insert into gestor(nome,email,id_clinica,principal) values('Intruso','evil@example.test','${ids.clinic}',true)`)));
test('principal can create ordinary staff and read returned row', async () => {
  assert.equal((await actor('manager-a@example.test',`insert into gestor(nome,email,id_clinica) values('Novo Gestor','new@example.test','${ids.clinic}') returning principal`)).rows[0].principal,false);
});
test('queue cannot be forged or edited directly', async () => {
  await denied(() => actor('patient-a@example.test',`delete from fila_atendimento where id_consulta='${ids.appointment}'`));
  await denied(() => actor('manager-a@example.test',`update fila_atendimento set posicao=99`));
});
test('public requests reject forged approval', async () => {
  const insert = status => `insert into solicitacao_clinica(nome_clinica,cnpj,responsavel,email_responsavel,telefone_responsavel,telefone_clinica,especialidades,rua,bairro,cidade,cep,status) values('Teste','1','Responsável Teste','owner@example.test','85999999999','85999999999','Geral','Rua','Bairro','Cidade','60000000','${status}')`;
  await denied(() => asRole(pg,'anon',null,insert('Aprovada')));
  await asRole(pg,'anon',null,insert('Pendente'));
});
test('booking validates future, opening hours, slot alignment and owner', async () => {
  for (const time of ["'2000-01-01 09:00-03'","'2099-01-05 03:00-03'","'2099-01-05 09:15-03'","'2099-01-05 09:00:01-03'"]) {
    await denied(() => actor('patient-c@example.test',`insert into consulta(id_paciente,id_clinica,data_hora) values('${ids.thirdPatient}','${ids.clinic}',${time})`));
  }
  await denied(() => actor('patient-a@example.test',`insert into consulta(id_paciente,id_clinica,data_hora) values('${ids.thirdPatient}','${ids.clinic}','2099-01-05 09:00-03')`));
});
test('booking, reschedule and cancellation keep queue atomic', async () => {
  const created = (await actor('patient-c@example.test',`insert into consulta(id_paciente,id_clinica,data_hora) values('${ids.thirdPatient}','${ids.clinic}','2099-01-05 09:00-03') returning id_consulta`)).rows[0].id_consulta;
  assert.equal((await pg.query(`select count(*)::int as n from fila_atendimento where id_consulta='${created}'`)).rows[0].n,1);
  await denied(() => actor('patient-c@example.test',`insert into consulta(id_paciente,id_clinica,data_hora) values('${ids.thirdPatient}','${ids.clinic}','2099-01-05 10:00-03')`));
  await actor('patient-c@example.test',`update consulta set data_hora='2099-01-06 09:30-03' where id_consulta='${created}'`);
  assert.equal((await pg.query(`select count(*)::int as n from fila_atendimento where id_consulta='${created}'`)).rows[0].n,1);
  await denied(() => actor('manager-a@example.test',`update consulta set status='Em Atendimento' where id_consulta='${created}'`));
  await actor('patient-c@example.test',`update consulta set status='Cancelada' where id_consulta='${created}'`);
  assert.equal((await pg.query(`select count(*)::int as n from fila_atendimento where id_consulta='${created}'`)).rows[0].n,0);
  await denied(() => actor('patient-c@example.test',`update consulta set status='Agendada' where id_consulta='${created}'`));
});
test('manager starts and finishes today; patient sees accurate status', async () => {
  await actor('manager-a@example.test',`update consulta set status='Em Atendimento' where id_consulta='${ids.appointment}'`);
  const fila=(await pg.query(`select posicao,hora_inicio from fila_atendimento where id_consulta='${ids.appointment}'`)).rows[0];
  assert.equal(fila.posicao,0); assert.ok(fila.hora_inicio);
  assert.equal((await actor('patient-a@example.test',`select public.vezz_fila_info('${ids.appointment}') as info`)).rows[0].info.status,'Em Atendimento');
  assert.equal((await actor('patient-b@example.test',`select public.vezz_fila_info('${ids.appointment}') as info`)).rows[0].info,null);
  await denied(() => actor('manager-b@example.test',`select public.vezz_chamar_proximo('${ids.clinic}',null)`));
  await denied(() => actor('manager-a@example.test',`select public.vezz_chamar_proximo('${ids.clinic}',null)`));
  await actor('manager-a@example.test',`update consulta set status='Finalizada' where id_consulta='${ids.appointment}'`);
  assert.ok((await pg.query(`select hora_fim from fila_atendimento where id_consulta='${ids.appointment}'`)).rows[0].hora_fim);
  await denied(() => actor('manager-a@example.test',`update consulta set status='Em Atendimento' where id_consulta='${ids.appointment}'`));
});
test('migration is idempotent and public image bucket is restricted', async () => {
  await applyMigrations(pg);
  const bucket=(await pg.query("select * from storage.buckets where id='fotos-clinicas'")).rows[0];
  assert.equal(Number(bucket.file_size_limit),6291456); assert.deepEqual(bucket.allowed_mime_types,['image/jpeg','image/png','image/webp']);
});

test('unique indexes prevent patient/day duplicates and two services even for privileged writes',async()=>{
  const indexes=(await pg.query("select indexname from pg_indexes where schemaname='public'")).rows.map(x=>x.indexname);
  assert.ok(indexes.includes('ux_consulta_paciente_dia_ativo'));assert.ok(indexes.includes('ux_consulta_atendimento_unico'));
  // Temporarily disable business validation as owner to independently exercise indexes.
  await pg.exec('begin');
  try {
    await pg.exec('alter table consulta disable trigger trg_validar_consulta');
    await pg.exec(`insert into consulta(id_paciente,id_clinica,data_hora,status) values('${ids.patient}','${ids.clinic}','2098-01-06 09:00-03','Em Atendimento')`);
    await assert.rejects(pg.exec(`insert into consulta(id_paciente,id_clinica,data_hora,status) values('${ids.otherPatient}','${ids.clinic}','2098-01-06 10:00-03','Em Atendimento')`),/ux_consulta_atendimento_unico/);
  }finally{await pg.exec('rollback');}
});
test('call-next atomically starts, rejects stale calls and finishes the current appointment',async()=>{
  await pg.exec('begin');
  let id;
  try {
    await pg.exec('alter table consulta disable trigger trg_validar_consulta');
    id=(await pg.query(`insert into consulta(id_paciente,id_clinica,data_hora) values('${ids.thirdPatient}','${ids.clinic}',((now() at time zone 'America/Sao_Paulo')::date+time '12:00') at time zone 'America/Sao_Paulo') returning id_consulta`)).rows[0].id_consulta;
    await pg.exec('alter table consulta enable trigger trg_validar_consulta;commit');
  }catch(error){await pg.exec('rollback');throw error;}
  assert.equal((await actor('manager-a@example.test',`select vezz_chamar_proximo('${ids.clinic}',null) as id`)).rows[0].id,id);
  await denied(()=>actor('manager-a@example.test',`select vezz_chamar_proximo('${ids.clinic}',null)`));
  assert.equal((await actor('manager-a@example.test',`select vezz_chamar_proximo('${ids.clinic}','${id}') as id`)).rows[0].id,null);
  const row=(await pg.query(`select c.status,f.hora_inicio,f.hora_fim from consulta c join fila_atendimento f using(id_consulta) where id_consulta='${id}'`)).rows[0];
  assert.equal(row.status,'Finalizada');assert.ok(row.hora_inicio);assert.ok(row.hora_fim);
});
test('clinic identity and patient ownership are immutable through direct API privileges',async()=>{
  await denied(()=>actor('manager-a@example.test',`update clinica set id_clinica='90000000-0000-4000-8000-000000000002' where id_clinica='${ids.clinic}'`));
  await denied(()=>actor('patient-a@example.test',`update consulta set id_paciente='${ids.otherPatient}' where id_consulta='${ids.appointment}'`));
  await denied(()=>actor('patient-a@example.test',"update paciente set email='stolen@example.test' where email='patient-a@example.test'"));
});
test('administrator approval atomically creates one invite and cannot be repeated',async()=>{
  const id=(await actor('admin@example.test','select id_solicitacao from solicitacao_clinica limit 1',{admin:true})).rows[0].id_solicitacao;
  await denied(()=>actor('patient-a@example.test',`select vezz_analisar_solicitacao('${id}',true)`));
  const result=(await actor('admin@example.test',`select vezz_analisar_solicitacao('${id}',true) as result`,{admin:true})).rows[0].result;
  assert.equal(result.request.status,'Aprovada');assert.ok(result.invite.token);
  await assert.rejects(actor('admin@example.test',`select vezz_analisar_solicitacao('${id}',true)`,{admin:true}),/já analisada/);
  assert.equal((await pg.query(`select count(*)::int as n from convite_gestor where id_solicitacao='${id}'`)).rows[0].n,1);
});
test('invite finalization is service-only and rolls back all relational records on failure',async()=>{
  assert.equal((await pg.query("select has_function_privilege('authenticated','vezz_concluir_convite(text,uuid,text,text,text)','execute') as allowed")).rows[0].allowed,false);
  const invite=(await pg.query('select token from convite_gestor limit 1')).rows[0];
  await pg.exec(`update convite_gestor set usado=true where token='${invite.token}'`);
  const sql=`select vezz_concluir_convite('${invite.token}','90000000-0000-4000-8000-000000000001','Responsável Teste','owner@example.test','Gestor')`;
  const before=(await pg.query('select count(*)::int as n from clinica')).rows[0].n;
  // Missing Auth FK makes the last insert fail: the preceding clinic/address roll back.
  await assert.rejects(asRole(pg,'service_role',null,sql),/foreign key/);
  assert.equal((await pg.query('select count(*)::int as n from clinica')).rows[0].n,before);
  await pg.exec("insert into auth.users values('90000000-0000-4000-8000-000000000001')");
  await asRole(pg,'service_role',null,sql);
  assert.equal((await pg.query('select count(*)::int as n from clinica')).rows[0].n,before+1);
  await pg.exec(`update convite_gestor set criado_em=now()-interval '8 days' where token='${invite.token}'`);
  await assert.rejects(asRole(pg,'service_role',null,sql),/Convite inválido/);
});
