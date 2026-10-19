-- =============================================================================
-- VEZZ — REINDEX DAS FILAS  *** MODIFICA O BANCO, MAS NÃO É DESTRUTIVO ***
-- Não cancela consulta, não apaga registro, não muda status de nada: apenas
-- recalcula a coluna DERIVADA `posicao` da fila a partir das consultas
-- existentes (por clínica + data do atendimento).
--
-- Pré-requisito: a migração sql/migracao-agendamento-fila.sql já aplicada
-- (a função vezz_reindex_fila_de precisa existir).
--
-- Quando rodar: se sql/diagnostico-agendamento-fila.sql mostrar posições
-- inconsistentes (D5/D5b). Idempotente — pode rodar várias vezes.
-- A parte de PREVIEW (somente leitura) mostra exatamente o que mudaria.
-- =============================================================================

-- PREVIEW (somente leitura): filas cuja posição guardada difere da recalculada
with esperado as (
  select f.id_fila_atendimento,
         row_number() over (partition by c.id_clinica, (c.data_hora at time zone 'America/Sao_Paulo')::date
                            order by c.data_hora, f.hora_entrada, f.id_fila_atendimento) as rn
    from public.fila_atendimento f
    join public.consulta c on c.id_consulta = f.id_consulta
   where c.status = 'Agendada'
)
select f.id_fila_atendimento,
       f.posicao as posicao_atual,
       e.rn as posicao_correta,
       c.id_clinica,
       c.data_hora
  from public.fila_atendimento f
  join public.consulta c on c.id_consulta = f.id_consulta
  join esperado e on e.id_fila_atendimento = f.id_fila_atendimento
 where f.posicao <> e.rn
 order by c.data_hora, e.rn;

-- AÇÃO (idempotente): recalcula as posições de todas as filas ativas,
-- por (clínica, data) — mesma regra do trigger de reindex.
do $$
declare
  q record;
begin
  for q in
    select distinct c.id_clinica, (c.data_hora at time zone 'America/Sao_Paulo')::date as dia
      from public.consulta c
     where c.status in ('Agendada', 'Em Atendimento')
  loop
    perform public.vezz_reindex_fila_de(q.id_clinica, q.dia);
  end loop;
  raise notice 'VEZZ: filas reindexadas por (clínica, data). Apenas posições derivadas foram recalculadas — nenhuma consulta foi cancelada e nenhum registro foi apagado.';
end $$;
