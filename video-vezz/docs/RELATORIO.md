# Relatório de produção

## Montagem

| Tempo no Reel | Base gravada no navegador | Animação adicional de edição |
|---|---|---|
| 00:00–00:04,5 | — | Pergunta de abertura por palavras, rastros cianos, aproximação, marca Mokoto e mascote SVG thinking → joy. |
| 00:04,5–00:13,5 | Home atual, entradas, demo da fila, parallax pelo ponteiro, scroll progressivo até as clínicas e hover no card. | Câmera com zoom, deslocamento e perspectiva; texto, máscara luminosa e apresentador independente. |
| 00:13,5–00:28,5 | Scroll storytelling completo: agendar → entrar na fila → acompanhar → ser chamado. Foram percorridas as entradas e saídas, com permanência em cada etapa. | Aproximações nos componentes, tipografia curta, indicadores de capítulo e apresentador thinking/calm/surprised/joy. |
| 00:28,5–00:34 | Digitação de Cardiologia, pesquisa, card da Clínica Sol e abertura de detalhes. | Câmera acompanhando a área de interação, crop vertical e reação do SVG. |
| 00:34–00:40,4 | Seleção real de Cardiologia e 09:30, envio do formulário, criação de consulta no adaptador local e navegação automática ao painel. | Aproximação suave, texto de confirmação e chime autoral. |
| 00:40,4–00:43,9 | Clique em Abrir acompanhamento, tela da senha, posição e estimativa. | Movimento de câmera discreto e apresentador calm. |
| 00:43,9–00:51,4 | Painel do gestor, Abrir fila e quatro chamadas reais usando Finalizar e chamar próximo. A lista diminui e o atendimento muda. | Enquadramento da área operacional, textos curtos, cortes por máscara e robô cool → joy. |
| 00:51,4–00:54,4 | Mesma conta de paciente no acompanhamento, agora com status Em Atendimento, posição agora e estimativa agora. | Reação joy, onda ciano e efeito de confirmação. |
| 00:54,4–01:00 | — | Marca, frase solicitada, chamada Conheça a plataforma e SVG joy → love. Sem URL ou perfil social inventado. |

Sete vídeos reais estão em `public/footage/`. Cada um preserva os tempos da gravação e é conformado para 30 fps; não foi usada aceleração extrema, interpolação de IA, tela reconstruída ou substituição das animações do site. Os últimos 14 frames de cada cena são mantidos apenas como fundo da máscara de transição.

## Ambiente e integridade

- Navegador real: Google Chrome, controlado pelo Playwright. Captura pelo protocolo Screencast, recebendo quadros do compositor com timestamps.
- Viewports: 1200 × 1000 para home/jornada; 640 × 1000 para paciente; 1000 × 1000 para gestor.
- Taxa média de captura por trecho: 38,18–59,94 quadros reais por segundo; exportação estável em 30 fps.
- Aplicação, banco de produção e regras de autenticação permanecem intactos. Servidor somente em loopback; configuração de produção não é servida; contexto descartável bloqueia requisições externas.
- Contas e dados são os fictícios do seed versionado. Antes da filmagem do formulário, a consulta preexistente de Ana é cancelada no adaptador local para liberar um agendamento novo no mesmo dia.
- Após gravar, o script confirmou uma consulta criada e o status final Em Atendimento com posição zero no adaptador local. Manifesto: `raw/capture-manifest.json`.
- Dez expressões vetoriais atuais disponíveis. As utilizadas no Reel vêm de `js/lib/bot-sprite.js`, com formas e filtros preservados. Nenhum robô raster antigo ou personagem de IA foi empregado.

## Edição e áudio

Remotion 4.0.462, projeto separado, React e FFmpeg. A câmera transforma as gravações; tipografia, máscaras, vetores e apresentador são camadas independentes. Os movimentos adicionais não alteram posições ou estados de atendimento dentro da aplicação.

Trilha tecnológica instrumental original em 120 BPM: acordes, arpejos, baixo e percussão sintetizados. Cliques, whooshes, impactos leves e chimes também são gerados por código. Sem música comercial, samples ou material audiovisual das referências. Mix estéreo de 48 kHz normalizado; a medição do MP4 exportado fica no relatório de qualidade.

## Revisão e validação

As imagens de inspeção e composição ficam em `output/playwright/`, fora do projeto de vídeo. A primeira revisão detectou sobreposição entre títulos e legendas, detalhes pequenos na jornada e notificações secundárias ocupando a região inferior do painel. A edição foi ajustada no projeto de vídeo: legendas reposicionadas, zoom maior nos componentes e enquadramento do gestor concentrado na área operacional.

`node render.mjs --verify` inspeciona o MP4 final com FFprobe, decodifica vídeo e áudio inteiros com FFmpeg e reproduz os 60 segundos exportados em Chrome. Também extrai frames diretamente do MP4 para revisão visual, mede volume/true peak, verifica os resultados locais do fluxo e confirma que os arquivos de produção não foram alterados. Resultados executados ficam em `final/quality-report.json`; os resultados da prévia ficam em `final/preview-quality-report.json`.

A conferência visual é feita em frames distribuídos pela montagem e pela reprodução automatizada. Isso não equivale a uma sessão humana de audição em alto-falantes nem a um teste de upload no Instagram. O arquivo não foi publicado automaticamente.

## Entrega técnica

Master pretendido e configurado: 1080 × 1920, 9:16, 60 s, H.264/yuv420p, 30 fps, AAC estéreo. Prévia: 540 × 960. O relatório do arquivo exportado contém os valores efetivamente medidos. `README.md` descreve como editar e repetir a captura/renderização. `docs/REFERENCIAS.md` contém os links reais e registra o alcance da pesquisa.
