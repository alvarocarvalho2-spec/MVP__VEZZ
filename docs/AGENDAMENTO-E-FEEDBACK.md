# Seleção de horário, mensagens e confirmações VEZZ

Skills aplicadas: frontend-design, motion-design, responsive-ui, ux-audit e
playwright. Preservados HTML/CSS/ES modules, roteamento por hash e regras de
agendamento. Não foi necessário alterar SQL, autenticação ou integrações.

## Causa e correção

**AG-01 — seleção apagada por uma resposta atrasada (alto).** A disponibilidade
guardava o horário selecionado antes de consultar os dados. Se a pessoa escolhia
um horário durante a consulta e a disponibilidade de qualquer outro horário
mudava, a resposta restaurava o valor antigo, que podia estar vazio. Foi
reproduzido `08:00 → vazio → "Selecione um horário."` no navegador com dados locais.

O seletor compartilhado agora lê o valor atual quando aplica a resposta,
preservando horário, destaque e `aria-pressed` se a opção continua livre. Uma
opção que acabou de ser ocupada é removida com aviso específico. Trocar a data
limpa imediatamente a seleção e a grade anterior. Respostas de datas antigas
são descartadas. O formulário mostra o horário escolhido e orienta o foco quando
falta seleção; o envio também tem proteção contra cliques repetidos.

O reagendamento usa o mesmo seletor e descarta respostas fora de ordem.
Os testes comparam o instante armazenado com o horário local escolhido,
considerando a conversão existente para ISO/UTC.

**UX-02 — confirmações do navegador (médio).** As duas chamadas de `confirm()`
estavam no painel do paciente e no histórico. Ambas foram substituídas por
`confirmDialog`, construído sobre o modal do próprio site. A confirmação mostra
clínica, data/hora e especialidade. "Manter consulta" recebe o foco inicial;
somente a confirmação explícita executa o cancelamento.

O componente possui identificação acessível, foco contido, Escape, fechamento
pelo fundo, retorno do foco, página ao fundo inerte e bloqueio de scroll.
Mudar de rota fecha o modal e restaura o estado da página. O reagendamento
recebe a mesma identidade visual.

**UX-03 — mensagens sem identidade e sobreposição (médio).** Os avisos agora
usam Source Sans 3, assinatura Mokoto, mascote oficial, marinho/royal e indicador
de estado acompanhado de texto. Têm botão para dispensar e pausa do prazo
durante hover/foco. Mostram até três avisos em telas amplas e somente o mais
recente no celular. A posição respeita a navegação inferior.

Abrir um modal remove avisos anteriores que poderiam cobrir a decisão. Mensagens
produzidas dentro de um modal aparecem nele. Durante a revisão visual foi
encontrada e corrigida a sobreposição de avisos antigos nos botões em 320px.

As entradas usam opacity/transform por 180–280ms, com saída em 160–200ms.
`prefers-reduced-motion` elimina o movimento e permite fechamento imediato.
Nenhuma biblioteca nova foi adicionada.

## Verificação

- `node tests/logica.mjs`: 15 verificações aprovadas.
- `node tests/motion-timing.mjs`: cinco grupos aprovados, preservando a
  progressão do refinamento anterior.
- `node tests/browser.mjs --local --extended`: 48 verificações aprovadas,
  incluindo reagendamento/cancelamento, foco, responsividade, permissões e
  ações existentes do gestor.
- `tests/feedback-playwright.js`, via Playwright CLI: 40 verificações aprovadas
  de disponibilidade atrasada, resposta fora de ordem, horário ocupado,
  confirmação sem duplicação, modais, mensagens, navegação e movimento reduzido.
  Viewports: 320×568, 375×812, 768×1024, 1280×800 e 1440×900.
- Sem erros JavaScript ou diálogos nativos detectados nos cenários novos.
- Cinco verificações adicionais de geometria aprovadas: ausência de deslocamento
  do header ao abrir modal em 1366, 640 e 320px e avisos acima da navegação
  inferior em 640 e 320px. São 93 verificações de navegador nesta entrega.

O script é uma função para `run-code`, seguindo o mesmo procedimento de
`docs/REFINAMENTO-SCROLL.md`; use `feedback-playwright.js` como nome do cenário.
As capturas estão em `output/playwright/feedback-*.png` e
`output/playwright/cancel-dialog-*.png`. A reprodução anterior ao ajuste ficou
em `output/playwright/before-slot-validation.png`.

Todos os cenários funcionais selecionam o LocalAdapter em contextos/perfis
isolados. A consulta lenta é controlada no navegador para reproduzir a corrida
sem dados reais. Não foram realizadas gravações ou migrações em produção.
Não se afirma validação física de leitores de tela ou de todos os navegadores.

## Arquivos deste ajuste

- `js/lib/ui.js`: seletor compartilhado, avisos e componentes de modal/confirmar.
- `js/pages/public.js`: integração do agendamento, seleção e validação.
- `js/pages/patient.js`: cancelamento e reagendamento.
- `js/app.js`: encerramento de modal na mudança de rota.
- `css/vezz-imersivo.css`: identidade e movimento dos componentes.
- `tests/extended-scenarios.mjs`: confirmação do próprio site nos cenários anteriores.
- `tests/feedback-playwright.js`: regressões do ajuste.

O commit de entrega inclui também os arquivos pendentes do refinamento de
scroll anterior, documentados em `docs/REFINAMENTO-SCROLL.md`.
