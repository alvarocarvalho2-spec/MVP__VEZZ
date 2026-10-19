# Posições da fila pelo horário da consulta

A consulta das 14:00 deve ficar antes da consulta das 18:00, mesmo quando a das
18:00 foi agendada primeiro. O cálculo anterior usava a posição já armazenada
como primeiro critério e preservava a ordem de criação dos agendamentos.

A fila agora considera o horário da consulta em ordem crescente, separada por
clínica e dia em `America/Sao_Paulo`. Quem aguarda recebe posições de 1 a N;
quem já está em atendimento mantém posição zero. Agendar, reagendar, cancelar,
iniciar ou finalizar um atendimento recalcula as posições. Horários iguais
usam a entrada na fila e seu identificador como desempate estável; a proteção
existente contra horários ativos duplicados continua em vigor.

O adaptador local aplica a regra ao inserir e ao carregar dados persistidos.
A lista do gestor e a chamada do próximo paciente usam a mesma ordem. Os
scripts de diagnóstico, ajuste e reindexação também seguem o horário.

## Aplicação no Supabase

Após a migração de segurança de 18/10/2026, aplicar
[`20261019223130_fila_por_horario.sql`](../supabase/migrations/20261019223130_fila_por_horario.sql).
Ela atualiza o cálculo e a RPC de chamada, preserva as permissões e recalcula
todas as filas ativas na mesma transação. Durante essa transação, gravações em
consultas e filas aguardam a conclusão. Consultas, status, identificadores e
horários de entrada/início/fim permanecem iguais.

O diagnóstico em [`sql/diagnostico-agendamento-fila.sql`](../sql/diagnostico-agendamento-fila.sql)
pode ser executado antes e depois: a seção D5 identifica posições diferentes
da ordem dos horários. A migração deve acompanhar a publicação do frontend;
alterar só a ordenação da lista não corrige a posição recebida pelo paciente.

## Validação local

- `npm test`: 93 testes aprovados, incluindo oito regressões de fila no
  adaptador local, transporte remoto simulado e PostgreSQL via PGlite.
- `npm run test:logic`: 20 verificações aprovadas.
- Playwright com `LocalAdapter`, relógio controlado e acesso externo bloqueado:
  agendamento de 18:00 antes de 14:00, ordem e posições na tela do gestor,
  botão “Chamar próximo” e atualização da posição na tela do paciente.
- Evidências em `output/playwright/queue-order/` e nenhum erro de console
  observado na verificação.

Esta entrega foi validada localmente. A migração não foi aplicada ao Supabase
remoto e o frontend não foi publicado nesta alteração.
