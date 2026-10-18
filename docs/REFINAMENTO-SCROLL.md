# Refinamento de motion e scroll — VEZZ

Data: 17/10/2026. Mantidos HTML/CSS, módulos JavaScript, roteamento por hash,
identidade visual, conteúdo e mascotes oficiais. Nenhuma dependência nova e
nenhuma migração para projeto com build.

Skills aplicadas: `frontend-design`, `motion-design`, `responsive-ui`,
`ux-audit` e `playwright`, conforme `AGENTS.md`.

## Ponto de restauração

Antes da implementação foi criado o commit `b01a1dd`
(`Checkpoint antes do refinamento de scroll e motion`) e a branch
`backup/antes-refinamento-scroll-2026-10-17`. Esse checkpoint inclui as skills
e suas instruções que já estavam presentes no diretório de trabalho.

## Diagnóstico e inventário

Os caminhos citados no pedido continuam válidos. A lógica de tempo espacial
foi separada em `js/lib/motion-timing.js`; a integração permanece em
`js/lib/motion.js` e na home em `js/pages/public.js`.

| Classe | Efeitos existentes | Diagnóstico e decisão |
| --- | --- | --- |
| Entrada no viewport | Títulos, clínicas, KPIs, split, estatísticas e CTA | O observer compartilhava um gatilho quase imediato. Em 1366×768, uma clínica iniciava a entrada com o topo a 740px: apenas cerca de 28px visíveis, ainda considerando sua translação. Foram criados perfis de visibilidade e escalonamento por grupo. |
| Progresso da rolagem | Jornada sticky de quatro passos e trilha | O índice era calculado por quartos de uma distância aproximada, seguido por transições CSS de 600ms. Isso misturava tempo e distância, encurtava as etapas e produzia sobreposição em mudanças rápidas. A altura real encontrada era 260vh, não os 360vh históricos. |
| Linha do tempo após disparo | Cards, chip e mascote do hero | Os keyframes começavam na montagem, inclusive quando o hero visual estava abaixo da dobra no celular. Agora a apresentação começa quando uma parte significativa do palco está visível. |
| Atualização temporizada | Demonstração ilustrativa da fila | O intervalo de 3200ms começava com qualquer interseção. Agora exige enquadramento, permite leitura por 4200ms e continua pausando fora da área visível/aba ativa. |
| Decorativa | Flutuação dos mascotes, brilho e pulsação | Preservadas, com pausa fora do viewport e preferência por movimento reduzido. O parallax existente responde ao ponteiro, não ao scroll; foi preservado e seu RAF pendente agora é cancelado na saída. |
| Transição de estado | Hover, foco, botões, toast, contadores e troca de rota | Preservadas. Formulários e busca continuam imediatamente utilizáveis. Contadores continuam mostrando números reais. Não houve mudança em estados reais da fila. |
| Progresso do header | Transparência da pílula durante a rolagem | Preservado; não concorre com propriedades da jornada. |

Havia ainda um desvio geométrico independente: a jornada lia
`getBoundingClientRect()` enquanto o `main` executava a transição da rota
(`translateY(12px)`). Essa posição visual transitória ficava guardada como início
do sticky. A medição agora usa os offsets de layout dos ancestrais, sem incorporar
essa animação. Resize, carregamento de fontes e mudanças de tamanho das seções
vizinhas solicitam nova medição.

## Direção implementada

### Reveals

| Perfil | Elementos | threshold | Recuo inferior do viewport |
| --- | --- | --- | --- |
| Texto | Títulos e textos de apresentação | 0,08 | 12% da altura, limitado a 120px |
| Card | Clínicas e KPIs | 0,12 | 16%, limitado a 120px |
| Cena | Mockups, mascotes, estatísticas, split e CTA | 0,06 | 22%, limitado a 140px |

Os perfis não dependem apenas de uma porcentagem do próprio elemento: o recuo
retira a borda inferior da área de disparo. O observer é reconstruído ao
redimensionar, preservando os elementos já apresentados. Cards irmãos usam
stagger local de 85ms, limitado a três intervalos. Não há delay global baseado na
posição do elemento no documento. A duração de entrada é 640ms.

Na medição posterior em 1366×768, o primeiro card disparou com topo a 571px,
permitindo acompanhar a construção dentro da tela. Esse número inclui a
translação inicial; não é uma constante usada no código.

### Hero

O palco é armado somente com observer disponível. Com pelo menos 45% da menor
altura entre palco e viewport em interseção, inicia uma sequência única:
card principal (80ms), card secundário (230ms), chip (390ms), mascote (540ms).
As entradas duram 600–650ms. A flutuação começa depois dessa apresentação.
A primeira mudança de posição da demonstração espera 4200ms de visibilidade.
Não se exige espera para usar a busca ou os botões.

### Jornada

A altura é `altura real do palco + distância total da narrativa`, calculada
conforme o viewport e a composição de cada passo. Não existe mais `260vh`
fixo. O peso de leitura usa palavras do texto e quantidade de detalhes do mockup,
com limites para não alongar a página indefinidamente.

Em 1366×768, com palco de 672px:

| Fase | Distância |
| --- | --- |
| Construção inicial | 121px |
| Composição completa: Agendar | 362px |
| Transição entre passos | 148px cada |
| Composição completa: Entrar na fila | 310px |
| Composição completa: Acompanhar | 322px |
| Composição completa: Ser chamado | 292px |
| Permanência adicional no final | 108px |

A seção passou de aproximadamente 1997px para 2630px nessa tela. A distância
útil anterior era cerca de 331px por etapa, incluindo sua troca; agora há
intervalos exclusivos de leitura, além da construção/transição. Os valores
mudam com o palco e têm limites explícitos no módulo de timing.

Texto, mascote e mockup ocupam fases diferentes da construção. O texto anterior
sai antes do próximo ganhar destaque, evitando duas mensagens sobrepostas.
Os mascotes oficiais continuam associados às quatro etapas: thinking, calm,
surprised e joy. A trilha e a etapa atual usam a mesma posição da narrativa.
Os botões da trilha levam ao centro do intervalo de leitura correspondente.

O progresso usa suavização exponencial com constante de 65ms, independente da
taxa de quadros. Saltos maiores que 65% da altura do palco assumem diretamente a
posição atual. Não há interceptação de wheel, touch ou teclado. O RAF termina
quando alcança o alvo; não existe loop permanente de scroll. Somente JavaScript
controla as propriedades da jornada, sem transições CSS concorrentes.

Em larguras até 960px, altura abaixo de 650px, conteúdo que não cabe no palco
ou movimento reduzido, os quatro passos ficam em fluxo vertical. No mobile,
texto, mascote e mockup recebem seus próprios reveals, em vez de revelar uma
etapa inteira antes de seu conteúdo caber na tela. Trocar orientação ou a
preferência do sistema libera `inert`/`aria-hidden` das etapas sequenciais.

## Pesquisa real no 21st.dev

As cinco páginas abaixo foram acessadas antes de alterar o código. O catálogo
informa licença MIT em todas elas; as dependências e exemplos TSX foram
conferidos. Nenhum código desses componentes foi incorporado ao VEZZ.

| Referência | Tecnologia e requisitos da distribuição consultada | Padrão avaliado e aplicação |
| --- | --- | --- |
| [Reveal — asanshay](https://preview.21st.dev/@asanshay/components/reveal) | React/TSX, pacote `motion`; exemplo com classes utilitárias e import de componente local. MIT. | Entrada ao entrar no viewport e stagger por índice. Adaptado como stagger local e disparo por perfil, sem copiar o blur. |
| [Text Reveal — Magic UI](https://preview.21st.dev/@dillionverma/components/text-reveal) | React/TSX, `framer-motion`, utilitário `cn`/classes Tailwind no exemplo. MIT. | Construção distribuída pelo scroll. Aproveitado para dirigir fases da jornada; evitada a fragmentação palavra a palavra do texto funcional e a altura fixa de demonstração. |
| [Text Blur Reveal — Wensity](https://preview.21st.dev/@wensity/components/text-blur-reveal) | React/TSX, `framer-motion`; fonte em registry JSON de componente. MIT. | Sequência por palavras/letras e controle de início. Inspirou a hierarquia texto → visual, sem custo de blur contínuo ou texto oculto por longos períodos. |
| [Container Scroll Animation — Aceternity](https://preview.21st.dev/@manuarora700/components/container-scroll-animation) | React/TSX e `framer-motion`; demonstração usa `next/image` e classes Tailwind. MIT. | Continuidade entre título e produto em camadas. Aplicação discreta no mockup com entrada por translação/escala; a grande rotação 3D e o espaço extra do demo não foram adotados. |
| [Shutter Text — Joly UI, scroll demo](https://preview.21st.dev/@dev.shejanmahamud/components/shutter-text/shutter-text-scroll-demo) | React/TSX e `framer-motion`, componente local e classes utilitárias. MIT. | Separação explícita de gatilhos load/scroll/interação. Adotada a distinção entre montar e apresentar o hero; o shutter decorativo não favorece a leitura clínica e foi descartado. |

Instalar esses componentes literalmente exigiria um ambiente React capaz de
compilar TSX, os pacotes indicados, os componentes locais do registry e a
configuração de estilos/imports dos exemplos. O VEZZ não tem essa arquitetura.
As páginas oferecem opções Code/CLI, mas não foi executado nenhum instalador:
introduzir React/build para esses padrões não oferece vantagem concreta aqui.
Como a implementação é própria, não foram adicionadas cópias ou avisos de
licença de componentes externos. As licenças das skills existentes permanecem
preservadas.

### Bibliotecas consideradas

- [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/): adequado
  para timelines extensas, pin/scrub e coordenação complexa. A composição atual
  tem quatro cenas simples; CSS sticky e uma única função de progresso oferecem
  o controle necessário sem dependência extra.
- [Motion scroll](https://motion.dev/docs/scroll): tem API JavaScript sem React
  e controle de progresso. Não é necessário migrar o app para usá-lo, mas os
  mesmos requisitos desta seção foram atendidos pelo módulo nativo.
- [Lenis](https://lenis.dev/): suaviza o transporte da rolagem. O problema estava
  no enquadramento e na distribuição da narrativa; mantida a rolagem nativa.
- [CSS animation-timeline](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-timeline):
  considerado para progresso nativo. A narrativa precisa de pesos por conteúdo,
  fallback por espaço disponível, `inert` e navegação sincronizada; centralizar
  o estado em JavaScript evita dois controladores da mesma cena.
- IntersectionObserver, CSS e requestAnimationFrame: escolhidos para gatilhos,
  sticky e progresso, respectivamente. Sem novas bibliotecas.

## Verificação

Os testes usam o servidor local `python serve.py` e interceptam somente
`js/env.js` no navegador para selecionar o LocalAdapter. Nenhuma operação de
teste grava no Supabase de produção.

- `node tests/logica.mjs`: 15 verificações da lógica existente aprovadas.
- `node tests/motion-timing.mjs`: progressão, permanência, continuidade, saltos,
  inversão e limites em palcos de 554, 672, 804 e 1600px aprovados.
- Chrome por Playwright CLI: rolagem lenta por wheel, distâncias de leitura,
  transições, saltos rápidos, retorno às etapas, PageDown, entrada por âncora,
  término da trilha, troca de preferência de movimento e janela 1366×600.
  As 22 verificações desktop passaram, sem erros JavaScript.
- Matriz responsiva: 45 verificações aprovadas em 320×568, 375×812, 768×1024,
  1024×768, 1280×800 e 1440×900. Sem overflow horizontal, com texto/mockups
  legíveis nos quatro passos, hero aguardando enquadramento quando começa fora
  da tela, mudança de orientação e preferência de movimento. O gesto de toque
  foi emulado com eventos nativos do Chrome; também foi observado deslocamento
  de 0 para 321px em uma execução isolada em 390×844.
- Lifecycle e fallbacks: 19 verificações aprovadas, incluindo três saídas e
  retornos à home sem acumular timers/listeners/observers, parallax e reset de
  ponteiro, ausência de IntersectionObserver e JavaScript desativado.

São 86 verificações de navegador aprovadas nos três scripts Playwright,
além dos testes Node. Um clique real pelo botão “Acompanhe” também confirmou
a etapa 3 em seu intervalo de leitura, com texto/mockup completamente visíveis
e `aria-current="step"` no botão correspondente.
A API de gesto sintético agregado do Chrome não moveu a
página nesta sessão; o teste de toque usa uma sequência nativa de touchStart,
touchMove e touchEnd, que efetivamente deslocou o viewport.

Capturas e scripts temporários de investigação ficam em `output/playwright/`.
Os cenários de validação foram preservados em `tests/scroll-playwright.js`,
`tests/responsive-scroll-playwright.js` e `tests/motion-fallbacks-playwright.js`.
São funções para `run-code` da CLI, sem instalar um framework de testes.
Os cenários
anteriores em `tests/visual-scenarios.mjs` agora usam os botões da narrativa e
aguardam o intervalo atual do demo, evitando dependência da antiga divisão em
quartos. O teste de lifecycle foi atualizado para reconhecer o listener de
resize do observer pertencente à view atual.

O `index.html` agora contém uma apresentação estática e as quatro etapas,
substituídas normalmente pelo app. Se os módulos não carregarem ou JavaScript
estiver desativado, essa introdução continua legível e informa quais serviços
interativos precisam de JavaScript. A ausência da API de observer também deixa
os reveals e o demo visíveis.

Limites: input touch e preferência do sistema são emulados no Chrome; isso não
substitui observar um tablet/notebook físico nem uma medição de Core Web Vitals
em produção. As rotas e serviços interativos continuam dependendo de JavaScript;
o fallback garante leitura da apresentação, sem simular operações do sistema.
As classes de ocultação de motion só são armadas depois de registrar o observer.

### Reproduzir no Windows

Na raiz do projeto, execute `python serve.py`. Em outro PowerShell, também na
raiz, execute (artefatos ficam em `output/playwright/`):

```powershell
$vezzPw = (Resolve-Path '.agents/skills/playwright/scripts/playwright_cli.sh').Path
$vezzBash = 'C:\Program Files\Git\bin\bash.exe'
New-Item -ItemType Directory -Force -Path 'output/playwright' | Out-Null
Set-Location 'output/playwright'
& $vezzBash $vezzPw -s=vezz-scroll open about:blank --browser chrome
foreach ($vezzCase in @('scroll-playwright.js', 'responsive-scroll-playwright.js', 'motion-fallbacks-playwright.js')) {
  & $vezzBash $vezzPw -s=vezz-scroll run-code "async page => { await page.route('**/js/env.js', route => route.fulfill({contentType:'application/javascript',body:'export const VEZZ_ENV={supabaseUrl:String(),supabaseAnonKey:String()};'})); const source=await (await page.request.get('http://localhost:8080/tests/$vezzCase')).text(); return await new Function('return ('+source+')')()(page); }"
}
& $vezzBash $vezzPw -s=vezz-scroll close
```

O carregamento das funções lê somente os scripts locais versionados. O servidor
de preview deve permanecer ativo durante a execução.

## Arquivos envolvidos

- `js/lib/motion.js`: observers, apresentação do hero, timers e integração da jornada.
- `js/lib/motion-timing.js`: nova matemática de fases e distâncias.
- `css/vezz-imersivo.css`: estados de apresentação e propriedades da jornada.
- `js/pages/public.js`: identificação de composições para os perfis de reveal.
- `index.html`: apresentação estática para falha/ausência de JavaScript.
- `tests/motion-timing.mjs`: novo teste geométrico sem dependências.
- `tests/visual-scenarios.mjs`, `tests/browser.mjs`: compatibilidade dos cenários anteriores.
- `tests/*-playwright.js`: cenários atuais de scroll, responsividade e fallbacks.
- `docs/REFINAMENTO-SCROLL.md`: diagnóstico, decisões, referências e validação.

Próxima avaliação útil: experiência física de touchpad/toque em diferentes
taxas de atualização e navegadores. Os limites de leitura podem ser refinados
com observação de usuários quando o conteúdo das demonstrações evoluir.
