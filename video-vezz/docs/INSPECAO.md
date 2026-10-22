# Inspeção da versão atual do VEZZ

## Execução e arquitetura

O site é uma SPA estática em HTML, CSS e módulos JavaScript, com roteamento por hash. `start.sh` chama `python3 serve.py`; o servidor normal usa a porta 8080. A produção do vídeo usa o servidor independente `capture/server.mjs` na porta 8096, servindo os mesmos arquivos atuais.

Rotas públicas encontradas em `js/app.js`: `#/`, `#/como-funciona`, `#/clinicas`, `#/clinica/:id`, `#/agendar/:id`, `#/login`, `#/cadastro`, `#/recuperar-senha`, `#/solicitar-clinica` e `#/convite/:token`. Há também `#/admin-vezz`, indisponível no adaptador local.

Rotas autenticadas de paciente: `#/paciente`, `#/paciente/fila`, `#/paciente/historico` e `#/paciente/consultas`. De gestor: `#/gestor`, `#/gestor/fila`, `#/gestor/consultas`, `#/gestor/pacientes`, `#/gestor/clinica` e `#/gestor/novo-gestor` (apenas gestor principal). As guardas originais são preservadas; os logins da captura passam pelo formulário e pelo adaptador local.

## Dados e demonstração

`js/lib/db.js` oferece `LocalAdapter` e `SupabaseAdapter`. O primeiro usa `localStorage`, seed e credenciais públicas documentadas em `RODAR.md`. A escolha depende de `js/config.js` e da configuração de ambiente. O servidor de vídeo nunca lê `js/env.js`: responde a esse caminho com chaves vazias. Um contexto novo do Playwright não tem configurações persistidas e bloqueia todas as origens externas.

Pesquisa, filtros, detalhes, disponibilidade, agendamento, painel do paciente, fila e operações do gestor funcionam com o adaptador local existente. Foram essas funções as gravadas. Aprovação de clínicas, convites reais, recuperação de senha e administração dependem de backend/autenticação apropriados e não integram o Reel.

## Movimento e scroll

- `js/lib/motion.js`: `initReveal` usa observação de visibilidade para entradas; `initParallax` responde ao ponteiro no hero; `startQueueDemo` faz a fila ilustrativa progredir e troca a expressão do robô.
- `initJornada` no mesmo módulo usa uma seção sticky e progresso real de scroll, suavizado em `requestAnimationFrame`, sem GSAP. O modo aprimorado depende de largura mínima de 961 px, altura mínima de 650 px, ausência de movimento reduzido e conteúdo que caiba no palco.
- `js/lib/motion-timing.js`: calcula entrada, permanência, saída e sobreposição das quatro etapas; o script de captura importa essa geometria para percorrer gradualmente cada intervalo.
- `css/vezz-imersivo.css`: transições de rota, entrada do hero, flutuação, estados de cards/botões e variáveis de cada camada da jornada.
- `js/lib/ui.js`: reconciliação de dados ao vivo e transições de valores de posição/status sem reconstrução da interface para a gravação.

A captura da jornada usa viewport 1200 × 1000 e foi verificada em `data-step`: 1 → 2 → 3 → 4. A rolagem é atualizada continuamente em cada `requestAnimationFrame`, com movimentos de aproximadamente 0,7–1,25 s e permanências de 1,55–1,65 s. Não há salto direto para as etapas finais.

## Mascotes

Fonte confirmada: `js/lib/bot-sprite.js`. Contém cabeça compartilhada, gradientes e dez rostos: calm, joy, worried, cool, sad, angry, love, thinking, shy e surprised. Os componentes usam SVG inline e `<use href="#bot-…">`.

As definições desse arquivo foram copiadas integralmente para `src/bot.generated.js`, preservando formas, cores, gradientes e filtros. A cópia original também está em `public/brand/bot-sprite-source.js`. O apresentador usa as mesmas definições no Remotion; seu movimento adicional atua no grupo inteiro. Nenhum braço ou corpo novo foi criado. Nenhum PNG antigo dos robôs foi utilizado no vídeo.
