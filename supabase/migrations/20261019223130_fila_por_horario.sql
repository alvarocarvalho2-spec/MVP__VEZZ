-- A posição é derivada do horário da consulta, por clínica e dia em São Paulo.
-- O número provisório atribuído no INSERT não define a prioridade da fila.
begin;
lock table public.consulta, public.fila_atendimento in share row exclusive mode;

create or replace function public.vezz_reindex_fila_de(p_id_clinica uuid, p_dia date)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.fila_atendimento f
     set posicao = 0
    from public.consulta c
   where c.id_consulta = f.id_consulta
     and c.id_clinica = p_id_clinica
     and (c.data_hora at time zone 'America/Sao_Paulo')::date = p_dia
     and c.status = 'Em Atendimento';

  with ordenadas as (
    select f.id_fila_atendimento,
           row_number() over (order by c.data_hora, f.hora_entrada, f.id_fila_atendimento) as rn
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
revoke all on function public.vezz_reindex_fila_de(uuid,date) from public,anon,authenticated;

-- A chamada usa o mesmo critério do cálculo das posições.
create or replace function public.vezz_chamar_proximo(p_id_clinica uuid,p_atual_esperado uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_atual uuid; v_proximo uuid;
begin
  if not vezz_private.gestor_da_clinica(p_id_clinica) then raise exception 'Acesso restrito à clínica.' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id_clinica::text,0));
  select id_consulta into v_atual from public.consulta where id_clinica=p_id_clinica and status='Em Atendimento' for update;
  if v_atual is distinct from p_atual_esperado then raise exception 'A fila mudou. Atualize antes de chamar novamente.' using errcode='40001'; end if;
  select c.id_consulta into v_proximo from public.consulta c join public.fila_atendimento f using(id_consulta)
    where c.id_clinica=p_id_clinica and c.status='Agendada'
    and (c.data_hora at time zone 'America/Sao_Paulo')::date=(now() at time zone 'America/Sao_Paulo')::date
    order by c.data_hora,f.hora_entrada,f.id_fila_atendimento limit 1 for update of c;
  if v_atual is not null then update public.consulta set status='Finalizada' where id_consulta=v_atual; end if;
  if v_proximo is not null then update public.consulta set status='Em Atendimento' where id_consulta=v_proximo; end if;
  return v_proximo;
end $$;
revoke all on function public.vezz_chamar_proximo(uuid,uuid) from public,anon;
grant execute on function public.vezz_chamar_proximo(uuid,uuid) to authenticated;

-- Corrige as filas existentes na mesma transação, sem alterar consultas.
do $$
declare q record;
begin
  for q in
    select distinct id_clinica, (data_hora at time zone 'America/Sao_Paulo')::date as dia
      from public.consulta
     where status in ('Agendada','Em Atendimento')
     order by id_clinica, dia
  loop
    perform public.vezz_reindex_fila_de(q.id_clinica,q.dia);
  end loop;
end $$;
commit;
