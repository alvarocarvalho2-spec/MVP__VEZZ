import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LocalAdapter, SupabaseAdapter } from '../js/lib/db.js';
import { APP } from '../js/config.js';
import { combineDateTime, todayISO, weekdayKey } from '../js/lib/utils.js';
import { database, ids, asRole } from './helpers/database.mjs';

const migration = new URL('../supabase/migrations/20261019223130_fila_por_horario.sql', import.meta.url);
const day = '2099-01-05';
let pg;
before(async () => {
  pg = await database();
  const hours = Object.fromEntries(['dom','seg','ter','qua','qui','sex','sab'].map(key => [key,['08:00-19:00']]));
  await pg.query('update clinica set horarios=$1::jsonb', [JSON.stringify(hours)]);
});
after(async () => { await pg?.close(); });
beforeEach(async () => {
  await pg.exec('truncate consulta cascade');
  const storage = new Map();
  globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key,value) => storage.set(key,String(value)), removeItem: key => storage.delete(key) };
  globalThis.window = new EventTarget();
});

const actor = (email, sql) => asRole(pg, 'authenticated', email, sql);
async function book(patient, time, date = day, clinic = ids.clinic) {
  const patients = { a: ids.patient, b: ids.otherPatient, c: ids.thirdPatient };
  return (await actor(`patient-${patient}@example.test`, `insert into consulta(id_paciente,id_clinica,data_hora)
    values('${patients[patient]}','${clinic}','${date} ${time}-03') returning id_consulta`)).rows[0].id_consulta;
}
async function positions(date = day, clinic = ids.clinic) {
  return (await pg.query(`select c.id_consulta,f.posicao from consulta c join fila_atendimento f using(id_consulta)
    where c.id_clinica=$1 and (c.data_hora at time zone 'America/Sao_Paulo')::date=$2 and c.status in ('Agendada','Em Atendimento')
    order by f.posicao`, [clinic,date])).rows.map(row => [row.id_consulta,row.posicao]);
}

test('database inserts 14:00 ahead of an already booked 18:00 and updates patient queue info', async () => {
  const late = await book('a','18:00');
  const early = await book('b','14:00');
  assert.deepEqual(await positions(), [[early,1],[late,2]]);
  assert.equal((await actor('patient-a@example.test', `select vezz_fila_info('${late}') as info`)).rows[0].info.a_frente, 1);
  assert.equal((await actor('patient-b@example.test', `select vezz_fila_info('${early}') as info`)).rows[0].info.posicao, 1);
});

test('database repositions a same-day reschedule earlier and later, then closes cancellation gaps', async () => {
  const late = await book('a','18:00');
  const middle = await book('b','14:00');
  const early = await book('c','10:00');
  await actor('patient-a@example.test', `update consulta set data_hora='${day} 09:00-03' where id_consulta='${late}'`);
  assert.deepEqual(await positions(), [[late,1],[early,2],[middle,3]]);
  await actor('patient-a@example.test', `update consulta set data_hora='${day} 16:00-03' where id_consulta='${late}'`);
  assert.deepEqual(await positions(), [[early,1],[middle,2],[late,3]]);
  await actor('patient-b@example.test', `update consulta set status='Cancelada' where id_consulta='${middle}'`);
  assert.deepEqual(await positions(), [[early,1],[late,2]]);
});

test('database keeps clinic/day queues separate and reindexes both days on reschedule', async () => {
  const late = await book('a','18:00');
  const early = await book('b','14:00');
  const tomorrow = await book('c','17:00','2099-01-06');
  const other = await book('c','09:00',day,ids.otherClinic);
  assert.deepEqual(await positions(day,ids.otherClinic), [[other,1]]);
  await actor('patient-b@example.test', `update consulta set data_hora='2099-01-06 10:00-03' where id_consulta='${early}'`);
  assert.deepEqual(await positions(), [[late,1]]);
  assert.deepEqual(await positions('2099-01-06'), [[early,1],[tomorrow,2]]);
  assert.deepEqual(await positions(day,ids.otherClinic), [[other,1]]);
});

test('migration repairs existing positions, preserves records and is idempotent', async () => {
  const late = await book('a','18:00');
  const early = await book('b','14:00');
  await pg.query('update fila_atendimento set posicao=case when id_consulta=$1 then 1 else 2 end', [late]);
  const before = (await pg.query('select * from consulta order by id_consulta')).rows;
  const queueBefore = (await pg.query('select id_fila_atendimento,hora_entrada,hora_inicio,hora_fim,id_consulta from fila_atendimento order by id_consulta')).rows;
  for (let i = 0; i < 2; i++) {
    await pg.exec(await readFile(migration,'utf8'));
    assert.deepEqual(await positions(), [[early,1],[late,2]]);
    assert.deepEqual((await pg.query('select * from consulta order by id_consulta')).rows, before);
    assert.deepEqual((await pg.query('select id_fila_atendimento,hora_entrada,hora_inicio,hora_fim,id_consulta from fila_atendimento order by id_consulta')).rows, queueBefore);
  }
});

test('call-next follows appointment time and preserves an ongoing service at position zero', async () => {
  // Existing appointments may be earlier than the test execution time.
  await pg.exec('alter table consulta disable trigger trg_validar_consulta');
  let late, early;
  try {
    late = await book('a','18:00',todayISO());
    early = await book('b','14:00',todayISO());
  } finally { await pg.exec('alter table consulta enable trigger trg_validar_consulta'); }
  const next = async current => (await actor('manager-a@example.test', `select vezz_chamar_proximo('${ids.clinic}',${current ? `'${current}'` : 'null'}) as id`)).rows[0].id;
  assert.equal(await next(null),early);
  assert.deepEqual(await positions(todayISO()), [[early,0],[late,1]]);
  // Adding an earlier appointment cannot displace someone already being seen.
  await pg.exec('alter table consulta disable trigger trg_validar_consulta');
  let earlier;
  try { earlier = await book('c','10:00',todayISO()); }
  finally { await pg.exec('alter table consulta enable trigger trg_validar_consulta'); }
  assert.deepEqual(await positions(todayISO()), [[early,0],[earlier,1],[late,2]]);
  assert.equal(await next(early),earlier);
  assert.equal(await next(earlier),late);
});

async function local() {
  const api = new LocalAdapter();
  await api.init();
  api.db.consultas = []; api.db.fila = [];
  api.db.clinicas[0].horarios[weekdayKey(day)] = ['08:00-19:00'];
  return api;
}
const localBook = (api,index,time) => api.bookAppointment({ id_paciente: api.db.pacientes[index].id_paciente, id_clinica: api.db.clinicas[0].id_clinica, data: day, horario: time });
const localPositions = api => api.listAppointments({ id_clinica: api.db.clinicas[0].id_clinica, day }).filter(c => c.status === 'Agendada').map(c => [c.id_consulta,c.fila.posicao]);

test('local bookings, same-day reschedules and cancellations order positions by appointment time', async () => {
  const api = await local();
  const late = await localBook(api,0,'18:00');
  const early = await localBook(api,1,'14:00');
  assert.deepEqual(localPositions(api), [[early.id_consulta,1],[late.id_consulta,2]]);
  await api.rescheduleAppointment(late.id_consulta,day,'09:00');
  assert.deepEqual(localPositions(api), [[late.id_consulta,1],[early.id_consulta,2]]);
  await api.rescheduleAppointment(late.id_consulta,day,'17:00');
  assert.deepEqual(localPositions(api), [[early.id_consulta,1],[late.id_consulta,2]]);
  await api.cancelAppointment(early.id_consulta);
  assert.deepEqual(localPositions(api), [[late.id_consulta,1]]);
});

test('local init repairs persisted positions and starts each day at one', async () => {
  const api = await local();
  const late = await localBook(api,0,'18:00');
  const early = await localBook(api,1,'14:00');
  api.db.clinicas[0].horarios[weekdayKey('2099-01-06')] = ['08:00-19:00'];
  const otherDay = await api.bookAppointment({ id_paciente: api.db.pacientes[0].id_paciente, id_clinica: late.id_clinica, data: '2099-01-06', horario: '10:00' });
  api.db.fila.forEach((f,i) => { f.posicao = i + 7; });
  localStorage.setItem(APP.storageKey,JSON.stringify(api.db));
  const loaded = new LocalAdapter(); await loaded.init();
  assert.deepEqual(localPositions(loaded), [[early.id_consulta,1],[late.id_consulta,2]]);
  assert.equal(loaded.getAppointment(otherDay.id_consulta).fila.posicao,1);
});

test('remote queue displays appointment time order even when stored positions are stale', async () => {
  const api = new SupabaseAdapter({ url: 'https://supabase.example.test', anonKey: 'public-test-key' });
  const late = { id_consulta: 'late', status: 'Agendada', data_hora: combineDateTime(day,'18:00'), fila: { posicao: 1 } };
  const early = { id_consulta: 'early', status: 'Agendada', data_hora: combineDateTime(day,'14:00'), fila: { posicao: 2 } };
  const running = { id_consulta: 'running', status: 'Em Atendimento', data_hora: combineDateTime(day,'17:00'), fila: { posicao: 0 } };
  api.listAppointments = async options => options.status ? [running] : [late,early,running];
  assert.deepEqual((await api.getQueue(ids.clinic)).map(c => c.id_consulta), ['running','early','late']);
});
