# VEZZ — relatório da entrega

Reel vertical de 60 segundos. Master em 1080 × 1920, H.264, 30 fps, áudio AAC estéreo; prévia em 540 × 960.

| Trecho | Gravado diretamente no Chrome | Acrescentado no Remotion |
|---|---|---|
| 0–4,5 s | — | Abertura tipográfica, luz ciano, marca e robô SVG. |
| 4,5–13,5 s | Home atual: entradas, parallax, fila ilustrativa, rolagem e hover nos cards. | Zoom, pan, perspectiva, texto e apresentador. |
| 13,5–28,5 s | Jornada sticky completa: agendar, entrar na fila, acompanhar e ser chamado, com frames intermediários de scroll. | Câmera nos componentes, títulos, indicadores e reações do robô. |
| 28,5–43,9 s | Pesquisa, detalhes, especialidade, horário, confirmação real do agendamento local, painel e acompanhamento. | Enquadramento vertical, aproximações, textos e efeitos de clique/confirmação. |
| 43,9–54,4 s | Painel do gestor, controle da fila, quatro chamadas e paciente com status Em Atendimento. | Câmera, transições, robô cool/joy e efeito de chamada. |
| 54,4–60 s | — | Encerramento com SVG joy/love, marca e chamada para conhecer a plataforma. |

**Origem:** sete vídeos reais, capturados com Playwright/CDP. Taxas médias de 38,18–59,94 quadros reais por segundo, conformadas para 30 fps. Sem reconstrução das telas ou interfaces geradas por IA.

**Mascotes:** exclusivamente as definições vetoriais atuais de `js/lib/bot-sprite.js`. O apresentador permanece em SVG na composição e recebe flutuação, inclinação, escala e mudanças de expressão.

**Dados:** somente seed e contas fictícias do modo local. O script confirmou a consulta criada e o atendimento iniciado. Nenhuma requisição externa ou alteração em arquivos de produção foi registrada. A demonstração aparece identificada no vídeo.

**Áudio:** trilha tecnológica e efeitos originais sintetizados por código, sem samples ou músicas comerciais. Referências externas serviram apenas como pesquisa; links em `REFERENCIAS.md`.

**Verificação:** metadados, decodificação integral, reprodução completa no Chrome, medição de áudio e frames extraídos do MP4. Os resultados efetivos estão em `final/quality-report.json`. Não houve publicação no Instagram. A revisão não inclui audição humana em alto-falantes.

O ZIP editável reúne composição, vídeos de origem, fontes, SVG, áudio, scripts, documentação e lockfile. Instruções em `README.md`.
