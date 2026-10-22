# Referências e direção de edição

Pesquisa realizada em 17/10/2026. Os links abaixo foram retornados ou abertos na pesquisa web; nenhuma imagem, gravação, composição ou trilha dessas páginas foi incorporada ao vídeo. A análise é de padrões de apresentação descritos nas páginas, não uma alegação de ter assistido integralmente a todos os vídeos externos.

| Fonte | Link real | Padrão considerado / aplicação no VEZZ |
|---|---|---|
| Awwwards — Scrolling Websites | https://www.awwwards.com/websites/scrolling/ | Navegação como narrativa contínua. Preservar o deslocamento verdadeiro e o tempo de leitura dos estados sticky. |
| Behance — Motion Design for SaaS Startup, Misha Ruchko | https://www.behance.net/gallery/233071917/Motion-Design-for-SaaS-Startup | Referência encontrada com players e categorias de apresentação de produto/UI. A página direta apresentou erro no leitor; não foram copiados nem presumidos detalhes de seus frames. |
| Dribbble — SaaS Product Launch Animation, Rixlab | https://dribbble.com/shots/27721679-SaaS-Product-Launch-Animation | A descrição destaca tipografia, timing, transições e storytelling centrado no produto. Texto curto por ação e transições orientadas ao movimento. |
| Remotion — Showcase / SuperMotion / Recorder | https://www.remotion.dev/showcase | Demonstrações a partir de gravações, zooms e anotações. Footage do navegador como camada independente, com SVG e texto compostos por frame. |
| Remotion — Editor Starter Demo | https://www.remotion.dev/docs/editor-starter/demo | Edição programática e anúncio de produto como formato. Projeto próprio; não foi utilizado template externo. |
| GSAP — ScrollTrigger | https://gsap.com/docs/v3/Plugins/ScrollTrigger/ | Conceitos de scrub, pin e continuidade após o scroll. A implementação atual do VEZZ é própria: foi gravada sem substituição por GSAP. |
| 21st — Parallax Floating | https://preview.21st.dev/%40danielpetho/components/parallax-floating | Profundidade por movimento e elementos SVG/HTML. Referência conceitual para deslocamento da câmera e flutuação do apresentador. Nenhum código copiado. |
| 21st — Scroll Progress | https://docs.21st.dev/%40cnippet-dev/components/scroll-progress | Progressão visível ligada ao deslocamento; a barra de quatro etapas do VEZZ foi preservada na captura. |

## Direção autoral

Paleta: azul-marinho `#061b4f`, royal `#0b3b8f`, ciano `#3fe6ff`, branco `#f8faff`, azul-claro `#a9c3f5`.

Source Sans 3 para mensagens; Mokoto exclusivamente para a marca. Composição vertical com zona principal x=76–918, y=250–1540; a interface pode sangrar além dessa zona, mas textos editoriais e expressões principais permanecem dentro dela. Margem direita de 162 px e rodapé de 350 px reservados como escolha conservadora de composição, sem alegar uma área universal fixa do Instagram.

Movimento: abertura com rastros cianos e entrada do SVG, câmera em arcos lentos sobre o vídeo verdadeiro, aproximações de 1,03–1,30 nas telas completas, close-ups seletivos na jornada, wipe circular por luz ciano e match cuts da senha. Entrada tipográfica por linhas mascaradas e palavras. Sem parágrafos sobre a interface.

O apresentador é extraído diretamente de `js/lib/bot-sprite.js`: nenhuma característica foi redesenhada. Mudanças entre thinking/calm/surprised/joy/cool/love ocorrem em momentos narrativos, com flutuação, inclinação e escala sutis.

## Documentação técnica consultada

- Remotion renderMedia: https://www.remotion.dev/docs/renderer/render-media
- Remotion selectComposition: https://www.remotion.dev/docs/renderer/select-composition
- Remotion vídeo: https://www.remotion.dev/docs/offthreadvideo
- Playwright CDPSession: https://playwright.dev/docs/api/class-cdpsession

## Áudio e direitos

A trilha e todos os efeitos deste projeto são sintetizados por `audio/compose.mjs`, sem samples externos, música comercial ou materiais das referências. O código e os arquivos de áudio gerados para esta entrega podem ser utilizados e modificados pelo solicitante junto ao Reel. Os mascotes, fontes e interface mantêm a titularidade e as condições originais do projeto VEZZ. Licenças das ferramentas permanecem em suas dependências; a licença comercial do Remotion é própria do fornecedor: https://www.remotion.dev/license.
