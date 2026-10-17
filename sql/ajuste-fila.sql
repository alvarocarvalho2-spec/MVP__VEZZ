-- =============================================================================
-- VEZZ — ajuste único: reindexa as posições da fila
--
-- Corrige entradas de fila criadas com a posição fixa antiga (99): renumera
-- de 1..N, por clínica, só quem está AGUARDANDO (status 'Agendada'), na ordem
-- de posição/data. Não apaga nada — só corrige o número da posição.
-- Rode UMA vez no SQL Editor do projeto.
-- =============================================================================
with ordered as (
  select f.id_fila_atendimento,
         row_number() over (partition by c.id_clinica order by f.posicao, c.data_hora) as rn
  from public.fila_atendimento f
  join public.consulta c on c.id_consulta = f.id_consulta
  where c.status = 'Agendada'
)
update public.fila_atendimento f
   set posicao = ordered.rn
  from ordered
 where f.id_fila_atendimento = ordered.id_fila_atendimento;
