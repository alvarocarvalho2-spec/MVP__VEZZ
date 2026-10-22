# VEZZ — Reel imersivo

## Edição curta — 37 segundos

Versão condensada a partir da V3, com a demonstração prática completa de busca, agendamento, fila, recepção e atendimento. O bloco explicativo repetido foi retirado e os trechos de marca e home foram encurtados. As telas práticas conservam a velocidade e a leitura da V3.

- Master: `final/VEZZ_Reel_Curto_37s.mp4` (1080 × 1920, 30 fps).
- Prévia: `final/VEZZ_Reel_Curto_Previa.mp4`.
- Editável: `final/VEZZ_Projeto_Editavel_Curto.zip`.
- Roteiro, comandos e limites: `docs/VERSAO_CURTA.md`.

Para produzir e validar: `npm run finish:short`. No Studio, selecione `VEZZ-Reel-Curto`. A edição está em `src/ReelShort.jsx` e `src/direction-short.mjs`.

## Versão 3 — refinamento cinematográfico

A V3 é editada na composição **VEZZ-Reel-V3**, dentro da mesma estrutura. Os finais anteriores e os sete vídeos brutos originais permanecem preservados. Apenas o gestor recebeu uma nova gravação local, em `public/footage/manager-v3.mp4`.

- Master: `final/VEZZ_Reel_Imersivo_V3.mp4`.
- Prévia: `final/VEZZ_Reel_Previa_V3.mp4`.
- Projeto: `final/VEZZ_Projeto_Editavel_V3.zip`.
- Auditoria e plano: `docs/V3_AUDITORIA_E_PLANO.md`.
- Relatório: `docs/V3_RELATORIO.md`.
- Pesquisa: `docs/V3_REFERENCIAS.md`.
- Verificação: `final/quality-report-v3.json`.

```sh
npm ci
npm run finish:v3
```

`finish:v3` gera o mix a partir da instrumentação existente, renderiza o master, decodifica e reproduz o arquivo inteiro no Chrome, mede o áudio, verifica a integridade das mídias anteriores e cria a prévia e o ZIP. O ZIP é validado por descompressão/CRC com Python 3. Para editar sem refazer a captura: `npm run studio`, escolha `VEZZ-Reel-V3`, ajuste `src/ReelV3.jsx` e os keyframes em `src/direction-v3.mjs` e execute `npm run render:v3`.

A nova tomada do gestor pode ser repetida com `npm run capture:manager:v3`. O script usa as telas normais de login local, prepara o cenário fictício e conserva a senha A-071 de forma determinística para a continuidade. Não substitui uma chamada real por estado gráfico: os quatro atendimentos progridem pelos botões originais durante a gravação. Os horários exatos dos cliques ficam no manifesto adicional e são usados pelo áudio V3.

As definições SVG, fontes, vídeo e primitivas Remotion anteriores são reaproveitados. Nenhuma dependência nova foi adicionada para este refinamento. O snapshot de edição anterior está em `archive/v2-src/`; o restante deste README documenta a produção inicial.

Produção independente do site: Remotion + React para edição; Playwright + Chrome DevTools Screencast para gravação real; FFmpeg para conformação e áudio. A aplicação original continua em HTML/CSS/JavaScript, sem migração, commits ou alterações em suas regras.

## Arquivos entregues

- `final/VEZZ_Reel_Imersivo.mp4`: master vertical H.264, 1080 × 1920, 30 fps, 60 s, áudio AAC estéreo.
- `final/VEZZ_Reel_Previa.mp4`: prévia vertical 540 × 960.
- `final/VEZZ_Projeto_Editavel.zip`: código, fontes, SVG, áudio e vídeos de origem, sem `node_modules` ou intermediários de frames. O ZIP é validado por descompressão e CRC.
- `src/`: composição editável e mascote vetorial atual.
- `capture/capture.mjs`: script completo de gravação.
- `capture/server.mjs`: servidor somente local, que substitui a resposta de `js/env.js` por configuração vazia sem ler o arquivo de produção.
- `capture/browser.mjs`: contexto descartável e bloqueio de rede externa.
- `public/footage/`: sete vídeos brutos, sem textos editoriais, câmera ou áudio da edição.
- `raw/capture-manifest.json`: duração, viewport, quantidade de quadros reais e verificações do fluxo.
- `raw/frames/`: quadros do screencast com timestamps e concat lists. São intermediários de gravação; não são uma sequência de prints usada como slideshow.
- `audio/compose.mjs`: composição instrumental original e efeitos, sintetizados por código.
- `public/audio/`: trilha original e mix normalizado a aproximadamente −14 LUFS.
- `public/brand/`: fontes do projeto e cópia do módulo oficial dos mascotes.
- `docs/REFERENCIAS.md`: pesquisa e fontes reais.
- `docs/RELATORIO.md`: cenas, origem, edição e limites da verificação.
- `final/quality-report.json`: verificações do arquivo final, quando executado `--verify`.

## Reproduzir a produção

Use Node.js 24 ou compatível e Chrome instalado. No Windows o caminho padrão é `C:/Program Files/Google/Chrome/Application/chrome.exe`; em outro local/sistema, configure `CHROME_PATH` com o executável. Execute os comandos dentro de `video-vezz/`:

```sh
npm ci
npm run capture
npm run audio
npm run render
node render.mjs --verify
```

A captura precisa do site no diretório pai e inicia seu próprio servidor em `127.0.0.1:8096`. Não é necessário executar `start.sh`. O script recusa recursos externos; nunca se conecta ao Supabase. Usa as contas públicas de demonstração documentadas em `RODAR.md` e uma manhã fictícia de 19/10/2026 para manter horários futuros disponíveis. Não reutiliza o perfil pessoal do navegador.

`npm run studio` abre o editor Remotion. Em ambientes com interface gráfica, escolha a composição `VEZZ-Reel`. O pacote e o lockfile fixam as versões usadas.

A verificação do ZIP usa Python 3, disponível nesta máquina. O render do MP4 em si usa Node, Chrome e os binários FFmpeg instalados pelas dependências. Para refazer de uma vez áudio, master, validação, prévia e ZIP, execute `node render.mjs --finish`.

Para recriar apenas imagens de revisão ou uma prévia:

```sh
node render.mjs --stills
node render.mjs --preview
```

As capturas de inspeção e revisão ficam em `../output/playwright/`, conforme o AGENTS.md. O render usa apenas um trabalhador por causa da memória disponível nesta máquina. O master não depende de serviços de renderização pagos.

## Alterar a edição

Em `src/Reel.jsx`, a constante `scenes` define os inícios e as durações em frames, a 30 fps. Os componentes `Home`, `Journey`, `Booking` etc. controlam câmera, crop e tipografia. `Film` usa os vídeos reais em `OffthreadVideo`; `Bot` instancia as definições SVG atuais e controla expressão, posição, escala, inclinação e flutuação. O apresentador é renderizado como vetor a cada frame.

Os últimos 14 frames de cada cena anterior são mantidos somente sob a máscara da transição; a gravação da cena seguinte continua tocando. Não há tela reconstruída, mockup de IA ou geração artificial de interação.

A composição final usa margem direita de 162 px e rodapé de aproximadamente 330 px para mensagens editoriais; partes secundárias da gravação podem ocupar uma área maior. As áreas ocupadas pelo Instagram variam conforme o aplicativo e o aparelho.

## Segurança e autoria

Todos os nomes, clínicas, consultas e credenciais mostrados vêm do seed local público do repositório. A preparação cancela a consulta pré-carregada de Ana pelo adaptador local antes de gravar, para que o agendamento demonstrado seja de fato criado pelo formulário original. Login ocorre pela tela de autenticação local normal. As chamadas seguintes passam pelos botões reais do painel do gestor.

Nenhuma senha privada, token de produção ou configuração real de ambiente é empacotada. Sem alterações no banco, autenticação de produção ou arquivos do site. Não há URL ou perfil social inventado no encerramento.

A trilha e os efeitos são autorais desta entrega, sem samples externos. A interface, mascotes e fontes mantêm sua titularidade original. Consulte `docs/REFERENCIAS.md` para ferramentas e licenças.
