-- =============================================================================
-- VEZZ — ajuste único: reindexa as posições da fila
--
-- Corrige entradas de fila criadas com a posição fixa antiga (99): renumera
-- de 1..N, por clínica e dia, só quem está AGUARDANDO (status 'Agendada'),
-- pelo horário da consulta. Não apaga nada — só corrige o número da posição.
-- Rode UMA vez no SQL Editor do projeto.
-- =============================================================================
with ordered as (
  select f.id_fila_atendimento,
         row_number() over (partition by c.id_clinica, (c.data_hora at time zone 'America/Sao_Paulo')::date
                            order by c.data_hora, f.hora_entrada, f.id_fila_atendimento) as rn
  from public.fila_atendimento f
  join public.consulta c on c.id_consulta = f.id_consulta
  where c.status = 'Agendada'
)
update public.fila_atendimento f
   set posicao = ordered.rn
  from ordered
 where f.id_fila_atendimento = ordered.id_fila_atendimento;
