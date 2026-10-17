-- =============================================================================
-- VEZZ — MIGRAÇÃO SEGURA: agendamento sem conflito + posição correta da fila
-- Idempotente (pode rodar de novo). NÃO PERDE DADOS: este arquivo não cancela
-- consulta, não apaga registro de fila e não altera status de nada — ele só
-- cria funções, triggers, policies e (se os dados forem compatíveis) o índice
-- único. Nenhum INSERT/UPDATE/DELETE é executado fora de corpos de função
-- (que só rodam depois, em eventos de trigger).
--
-- ORDEM DE APLICAÇÃO (scripts separados, na pasta sql/):
--   0) Faça BACKUP antes (Dashboard → Database → Backups, ou pg_dump).
--   1) sql/diagnostico-agendamento-fila.sql  — SOMENTE LEITURA (rode antes).
--   2) ESTE arquivo                           — modifica o banco (estruturas).
--   3) Se o diagnóstico achou duplicidades: resolva caso a caso com
--      sql/tratamento-duplicidades.sql (decisão explícita por registro) e
--      re-rode este arquivo para aplicar o índice único.
--   4) Se o diagnóstico achou posições inconsistentes:
--      sql/reindexar-filas.sql (recalcula posições derivadas, sem perda de dados).
--   5) sql/diagnostico-agendamento-fila.sql de novo — validação final (Etapa E).
--
-- ETAPA A — Diagnóstico: script somente leitura (passo 1 acima).
-- ETAPA B — Preparação (este arquivo): funções, triggers e policies novas +
--           endurecimento do gestor. Nada de INSERT/UPDATE/DELETE em dados.
-- ETAPA C — Tratamento de inconsistências: NÃO é automático. Duplicidades
--           exigem decisão explícita do operador (sql/tratamento-duplicidades.sql).
-- ETAPA D — Restrições (este arquivo): o índice único parcial só é criado se
--           não existirem consultas ativas duplicadas no mesmo (clínica,
--           data_hora). Havendo conflito, a migração avisa (WARNING) e o índice
--           fica para depois da Etapa C — a Etapa E mostra o que ficou pendente.
-- ETAPA E — Validação (este arquivo + diagnóstico): SELECTs de conferência.
--
-- Fuso usado para "dia": America/Sao_Paulo (o app é todo local, BR).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ETAPA B1 — Horários ocupados de uma clínica numa data (security definer).
-- A policy consulta_select esconde as consultas dos outros pacientes; sem
-- esta função o paciente não enxergava a agenda e podia marcar em cima de outro.
-- -----------------------------------------------------------------------------
create or replace function public.vezz_horarios_ocupados(p_id_clinica uuid, p_dia date, p_exclude_consulta uuid default null)
returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(h order by h), '{}'::text[])
    from (
      select distinct to_char(c.data_hora at time zone 'America/Sao_Paulo', 'HH24:MI') as h
        from public.consulta c
       where c.id_clinica = p_id_clinica
         and (c.data_hora at time zone 'America/Sao_Paulo')::date = p_dia
         and c.status in ('Agendada', 'Em Atendimento')
         and c.id_consulta is distinct from p_exclude_consulta
    ) s
$$;

-- -----------------------------------------------------------------------------
-- ETAPA B2 — Próxima posição da fila, por (clínica, data do atendimento).
-- O LOCK serializa inserções simultâneas: cada paciente entra no fim da fila
-- da sua clínica no seu dia, sem repetir posição — à prova de corrida.
-- -----------------------------------------------------------------------------
create or replace function public.vezz_fila_proxima_posicao(p_id_consulta uuid)
returns int
language plpgsql volatile security definer set search_path = public as $$
declare
  v_id_clinica uuid;
  v_dia date;
  v_max int;
begin
  select c.id_clinica, (c.data_hora at time zone 'America/Sao_Paulo')::date
    into v_id_clinica, v_dia
    from public.consulta c
   where c.id_consulta = p_id_consulta;
  if v_id_clinica is null then
    return 1;
  end if;
  lock table public.fila_atendimento in share row exclusive mode;
  select coalesce(max(f.posicao), 0) + 1
    into v_max
    from public.fila_atendimento f
    join public.consulta c on c.id_consulta = f.id_consulta
   where c.id_clinica = v_id_clinica
     and (c.data_hora at time zone 'America/Sao_Paulo')::date = v_dia
     and c.status in ('Agendada', 'Em Atendimento');
  return v_max;
end $$;

-- -----------------------------------------------------------------------------
-- ETAPA B3 — Toda consulta que entra na fila recebe a posição pelo banco
-- (trigger). Antes o frontend calculava a posição e, por causa da policy de
-- leitura, enxergava só a própria consulta → todo mundo recebia posição 1.
-- -----------------------------------------------------------------------------
create or replace function public.vezz_fila_atribuir_posicao()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.posicao := public.vezz_fila_proxima_posicao(new.id_consulta);
  return new;
end $$;

drop trigger if exists trg_fila_atribuir_posicao on public.fila_atendimento;
create trigger trg_fila_atribuir_posicao
  before insert on public.fila_atendimento
  for each row execute function public.vezz_fila_atribuir_posicao();

-- -----------------------------------------------------------------------------
-- ETAPA B4 — Reindex da fila por (clínica, data), security definer, também no
-- reagendamento (quando a data da consulta muda). A fila se reorganiza sozinha
-- a cada cancelamento/início/fim de atendimento.
-- -----------------------------------------------------------------------------
create or replace function public.vezz_reindex_fila()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_nova_data date := (new.data_hora at time zone 'America/Sao_Paulo')::date;
  v_velha_data date := (old.data_hora at time zone 'America/Sao_Paulo')::date;
begin
  perform public.vezz_reindex_fila_de(new.id_clinica, v_nova_data);
  if (old.id_clinica, v_velha_data) is distinct from (new.id_clinica, v_velha_data) then
    perform public.vezz_reindex_fila_de(old.id_clinica, v_velha_data);
  end if;
  return new;
end $$;

create or replace function public.vezz_reindex_fila_de(p_id_clinica uuid, p_dia date)
returns void
language plpgsql security definer set search_path = public as $$
begin
  -- quem está em atendimento ocupa a posição 0
  update public.fila_atendimento f
     set posicao = 0
    from public.consulta c
   where c.id_consulta = f.id_consulta
     and c.id_clinica = p_id_clinica
     and (c.data_hora at time zone 'America/Sao_Paulo')::date = p_dia
     and c.status = 'Em Atendimento';

  -- quem aguarda fica em 1..N, na ordem da fila, só daquela clínica e data
  with ordenadas as (
    select f.id_fila_atendimento,
           row_number() over (order by f.posicao, f.hora_entrada, f.id_fila_atendimento) as rn
      from public.fila_atendimento f
      join public.consulta c on c.id_consulta = f.id_consulta
     where c.id_clinica = p_id_clinica
       and (c.data_hora at time zone 'America/Sao_Paulo')::date = p_dia
       and c.status = 'Agendada'
  )
  update public.fila_atendimento f
     set posicao = ordenadas.rn
    from ordenadas
   where f.id_fila_atendimento = ordenadas.id_fila_atendimento;
end $$;

drop trigger if exists trg_vezz_reindex on public.consulta;
create trigger trg_vezz_reindex
  after update of status, data_hora on public.consulta
  for each row execute function public.vezz_reindex_fila();

-- -----------------------------------------------------------------------------
-- ETAPA B5 — Info real da fila para o dono da consulta (posição, à frente,
-- total, quem atende agora). A policy esconde as consultas dos outros, então
-- os números reais vêm daqui (security definer, só o dono/gestor da clínica).
-- -----------------------------------------------------------------------------
create or replace function public.vezz_fila_info(p_id_consulta uuid)
returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_dono boolean;
  v_clinica uuid;
  v_dia date;
  v_status text;
  v_pos int;
  v_total int;
  v_atual_nome text;
begin
  -- só o dono da consulta (paciente) ou um gestor da clínica pode consultar
  select exists (
    select 1
      from public.consulta c
     where c.id_consulta = p_id_consulta
       and (
         exists (select 1 from public.paciente p
                  where p.id_paciente = c.id_paciente
                    and p.email = auth.jwt()->>'email')
         or exists (select 1 from public.gestor g
                     where g.id_clinica = c.id_clinica
                       and g.email = auth.jwt()->>'email')
       )
  ) into v_dono;
  if not v_dono then
    return null;
  end if;

  select c.id_clinica, (c.data_hora at time zone 'America/Sao_Paulo')::date, c.status
    into v_clinica, v_dia, v_status
    from public.consulta c
   where c.id_consulta = p_id_consulta;

  select count(*) into v_total
    from public.consulta c
   where c.id_clinica = v_clinica
     and (c.data_hora at time zone 'America/Sao_Paulo')::date = v_dia
     and c.status in ('Agendada', 'Em Atendimento');

  if v_status = 'Em Atendimento' then
    v_pos := 0;
  else
    select f.posicao into v_pos
      from public.fila_atendimento f
     where f.id_consulta = p_id_consulta;
    if v_pos is null then
      v_pos := 1;
    end if;
  end if;

  select split_part(p.nome, ' ', 1) into v_atual_nome
    from public.consulta c
    join public.paciente p on p.id_paciente = c.id_paciente
   where c.id_clinica = v_clinica
     and (c.data_hora at time zone 'America/Sao_Paulo')::date = v_dia
     and c.status = 'Em Atendimento'
   limit 1;

  return json_build_object(
    'posicao', v_pos,
    'a_frente', greatest(v_pos - 1, 0),
    'total', v_total,
    'status', v_status,
    'atual_nome', v_atual_nome
  );
end $$;

-- -----------------------------------------------------------------------------
-- ETAPA B6 — endurecimento do gestor: email/id_clinica/principal não podem
-- ser alterados pela API por um gestor comum (senão ele se promoveria).
-- -----------------------------------------------------------------------------
drop policy if exists "gestor_update_self" on public.gestor;
create policy "gestor_update_self" on public.gestor for update
  using (email = auth.jwt()->>'email')
  with check (email = auth.jwt()->>'email');
-- Privilégios: o Supabase concede UPDATE em NÍVEL DE TABELA por padrão —
-- revoke por coluna não restringe nada (um gestor comum ainda conseguia se
-- promover a principal ou trocar de clínica pela API). Revogamos UPDATE geral
-- (nível de tabela + todas as colunas) e re-concedemos SOMENTE o que o gestor
-- pode editar no próprio cadastro.
revoke update on public.gestor from authenticated;
revoke update on public.gestor from anon;
revoke update (id_gestor, auth_id, nome, email, senha, cargo, foto, principal, id_clinica, created_at) on public.gestor from authenticated;
revoke update (id_gestor, auth_id, nome, email, senha, cargo, foto, principal, id_clinica, created_at) on public.gestor from anon;
grant update (nome, cargo, foto, senha) on public.gestor to authenticated;

-- -----------------------------------------------------------------------------
-- ETAPA D — Restrição de unicidade (só se os dados existentes forem
-- compatíveis). Um horário ativo por (clínica, data_hora): Cancelada/Finalizada
-- liberam o horário. À prova de corrida: duas requisições simultâneas para o
-- mesmo horário → só uma grava (a outra recebe erro de chave duplicada, que o
-- app traduz em mensagem amigável).
-- Se existirem duplicidades ativas, o índice NÃO é criado: a migração avisa
-- (WARNING) e o índice fica para depois do tratamento (Etapa C).
-- -----------------------------------------------------------------------------
do $$
declare
  v_grupos_conflito int;
  v_consultas_excedentes int;
begin
  select count(*), coalesce(sum(n - 1), 0)
    into v_grupos_conflito, v_consultas_excedentes
    from (
      select count(*) as n
        from public.consulta
       where status in ('Agendada', 'Em Atendimento')
       group by id_clinica, data_hora
      having count(*) > 1
    ) t;
  if v_grupos_conflito > 0 then
    raise warning 'VEZZ: % grupo(s) com horário duplicado (% consulta(s) excedente(s)). Índice único NÃO criado. Rode sql/diagnostico-agendamento-fila.sql, resolva caso a caso com sql/tratamento-duplicidades.sql e re-rode esta migração.', v_grupos_conflito, v_consultas_excedentes;
  else
    execute 'create unique index if not exists ux_consulta_slot_ativo on public.consulta (id_clinica, data_hora) where status in (''Agendada'', ''Em Atendimento'')';
    raise notice 'VEZZ: índice único ux_consulta_slot_ativo aplicado (sem duplicidades ativas).';
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- ETAPA E — Validação (somente leitura)
-- -----------------------------------------------------------------------------
-- E1: o índice único existe? (esperado: 1)
select count(*) as indice_ux_consulta_slot_ativo_existe
  from pg_indexes
 where schemaname = 'public'
   and indexname = 'ux_consulta_slot_ativo';

-- E2: sobrou grupo com duplicidade ativa? (esperado: 0)
select count(*) as grupos_com_duplicidade_ativa
  from (
    select 1
      from public.consulta
     where status in ('Agendada', 'Em Atendimento')
     group by id_clinica, data_hora
    having count(*) > 1
  ) t;

-- E3: consultas ativas sem entrada na fila? (esperado: 0 — toda consulta entra na fila)
select count(*) as ativas_sem_fila
  from public.consulta c
 where c.status in ('Agendada', 'Em Atendimento')
   and not exists (select 1 from public.fila_atendimento f where f.id_consulta = c.id_consulta);

-- E4: funções no lugar? (esperado: 6 linhas)
select p.proname as funcao
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('vezz_horarios_ocupados', 'vezz_fila_proxima_posicao',
                     'vezz_fila_atribuir_posicao', 'vezz_reindex_fila',
                     'vezz_reindex_fila_de', 'vezz_fila_info')
 order by 1;

-- E5: triggers no lugar? (esperado: 2 linhas)
select t.tgname as trigger
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public'
   and t.tgname in ('trg_fila_atribuir_posicao', 'trg_vezz_reindex')
   and not t.tgisinternal
 order by 1;
