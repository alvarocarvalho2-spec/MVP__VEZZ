# Evolução visual e movimento — VEZZ

Implementação de 17/10/2026 na aplicação estática existente, sem dependências de produção novas. HTML, CSS, módulos JavaScript e rotas por hash foram preservados. Não há mudança no esquema, nas políticas ou no adaptador Supabase.

## Diagnóstico e efeitos existentes corrigidos

- **Revelações:** havia poucos elementos marcados, sobretudo na home. A existência de estilos não animava cards de clínicas ou páginas internas. Agora a tela registra seus elementos depois da renderização e observa conteúdo inserido posteriormente. Um elemento só fica oculto depois que o observer assume seu controle; formulários ficam imediatamente acessíveis. O observer usa entrada na área visível, sem exigir uma porcentagem impossível de elementos altos.
- **CSS:** a camada imersiva tinha duas definições concorrentes para o palco e o robô, além de breakpoints repetidos. Foi consolidada por componente. Os tokens distinguem microinterações (180 ms), interface (320 ms) e entradas (600 ms).
- **Mascotes:** o mesmo robô podia flutuar no contêiner e no SVG, e a reação substituía a flutuação. Agora a entrada pertence ao contêiner, a flutuação ao SVG e a mudança de expressão faz uma transição curta no rosto. As expressões oficiais existentes foram mantidas.
- **Jornada:** o modo sticky é ativado apenas quando há largura, altura e preferência de movimento adequadas. As quatro etapas ganham estados acessíveis; as etapas inativas ficam fora da navegação e da árvore acessível. Em telas menores e com movimento reduzido, todas aparecem em sequência. A duração passou de 360 para 260 alturas de viewport.
- **Demonstração/parallax:** o parallax retorna ao centro ao sair com o ponteiro e cancela frames pendentes ao trocar de rota. O ciclo da demonstração pausa fora da tela, com aba oculta ou movimento reduzido. Mudar para “É a sua vez” não reinicia a entrada do card.
- **Atualizações operacionais:** os painéis substituíam todo o HTML. A reconciliação agora preserva os nós e atualiza textos, atributos e registros identificados por chave. Os eventos de finalizar e iniciar em “chamar próximo” são agrupados antes da pintura, evitando um estado vazio intermediário. Listeners de ações são substituídos, evitando duplicação. Observers, frames, timers e assinaturas são encerrados ao sair da rota.
- **Agendamento:** a consulta periódica apagava o valor oculto do horário antes de descobrir que nada havia mudado. Agora preserva seleção e foco. Resultados antigos de uma consulta de disponibilidade são ignorados quando a data ou a tela muda.
- **Histórico:** reagendar na própria rota apontava para o mesmo hash, sem atualizar a lista. O histórico agora se atualiza no lugar, mantendo a ação focada. A agenda do gestor também mantém a estrutura durante as ações.

## Novas animações e refinamentos

- Entrada coordenada de título, proposta, links e demonstração. A busca permanece disponível durante a apresentação.
- Revelações em títulos, textos, cards, painéis e etapas verticais; atrasos curtos entre elementos relacionados.
- Navegação pelas quatro etapas da jornada, trilha de progresso e transições conjuntas entre texto, mockup e mascote.
- Saída de página em 150 ms e entrada em 320 ms. Cada rota tem seu próprio contêiner, impedindo que respostas atrasadas substituam a página atual. O título da aba e o foco acompanham a navegação; voltar e avançar continuam nativos.
- Mudanças reais de números e status recebem realce localizado; registros reposicionados usam sua identidade para uma transição curta. Movimentos decorativos pausam fora da área visível.
- Home com grade editorial explícita para quatro clínicas e variantes para zero, um, dois ou três itens. A busca usa grade regular. Imagens, descrições, chips e ações têm proporções e alinhamentos consistentes, incluindo feedback por foco de teclado.
- Painéis com maior hierarquia entre métricas, atendimento atual e próximo paciente. Formulários de cadastro, solicitação e edição de clínica usam grupos semânticos, mantendo os campos e o envio nativo.
- Menu com estado expandido e Escape; link de pular para conteúdo sem interferir no hash; modal com nome acessível, ciclo de Tab e devolução do foco.
- Contagem de clínicas derivada da lista completa disponível. Os “18 min de espera média” e “4 clínicas em Fortaleza” fixos deixaram de ser apresentados como métricas reais. A fila e os mockups continuam identificados como ilustração. Textos evitam prometer posição reservada antes do dia ou chegada sem seguir as orientações da clínica.

## Verificação executada

Chrome headless real, com captura de imagens e inspeção de estilos/DOM via protocolo nativo do navegador. Não foi usada uma simulação de DOM. As imagens e resultados ficam em `tests/artifacts/`, ignorado pelo Git.

**166 verificações no Chrome passaram:** 88 principais, 47 complementares, 14 da revisão de layout e 17 de limpeza do ciclo de vida. Os **15 testes existentes de lógica** também passaram. Houve inspeção visual das capturas de desktop, tablet e celular.

| Área | O que foi efetivamente verificado |
| --- | --- |
| Responsividade | 360, 390, 768, 1024 e 1440 px; home, busca, clínica, login, solicitação, painéis, filas e históricos de paciente/gestor, consultas, pacientes, edição de clínica e novo gestor; sem rolagem horizontal de página |
| Movimento | Demonstração avançando, parallax aplicado, quatro etapas durante a rolagem, pausa do ciclo e das animações fora da tela, revelação dos cards, todas as etapas visíveis com movimento reduzido |
| Navegação | Foco após navegação, página 404, voltar do navegador, troca rápida de rota, menu móvel e Escape, link de pular conteúdo, Tab e Escape no modal |
| Estados | Busca sem resultados; zero a quatro clínicas na home; carregamento com dados pendentes; erro com recuperação; texto longo nas cinco larguras |
| Paciente | Login, fila, histórico, agendamento após atualização de disponibilidade, seleção e foco preservados por mais de um ciclo, reagendamento com atualização imediata do histórico e foco mantido, cancelamento |
| Gestor | Login, chamar próximo preservando nós e foco, iniciar/finalizar atendimento, exibição de métricas, editor com sete dias, adição/remoção de intervalo, manutenção de rascunho, clínica somente para leitura do gestor secundário e guarda do primeiro gestor |
| Solicitação/acesso | Envio de todos os campos agrupados da solicitação, convite inválido, tela administrativa restrita, redirecionamento de paciente sem sessão |
| Limpeza | Três entradas/saídas da home sem timers acumulados; listeners de ponteiro, scroll e resize removidos; observers sem referências a elementos de telas desmontadas; polling cancelado ao sair do gestor |

Os cenários funcionais interceptam **somente no navegador de teste** a configuração pública para selecionar o adaptador local. Usam um perfil separado, limpam os dados desse perfil e não escrevem no Supabase. O arquivo `js/env.js` do projeto permanece intacto.

Para reproduzir no Windows com Chrome instalado, mantenha `python serve.py` aberto e execute:

```powershell
node tests/logica.mjs
node tests/browser.mjs --local --verify
node tests/browser.mjs --local --extended
node tests/browser.mjs --local --extended --layouts-only
node tests/browser.mjs --local --lifecycle
```

`CHROME_PATH` permite indicar outro executável compatível. Os cenários funcionais exigem `--local`. O navegador de teste é fechado ao terminar.

## Limites da validação

- Os fluxos de escrita, sessões e atualizações foram validados no adaptador local. Não foram executados agendamentos, cancelamentos, upload, aprovação de solicitação ou criação de convites no banco real.
- O upload real de fotos e o envio de recuperação por e-mail não foram testados ponta a ponta. A estrutura, os handlers e a integração existentes foram mantidos.
- Administração autenticada, aprovação e aceitação de convite real precisam de credenciais e dados próprios de homologação. Foram verificadas as telas restritas e de convite inválido.
- A validação de acessibilidade cobre foco, teclado, semântica e preferência de movimento; não substitui testes com leitores de tela e aparelhos físicos. Os breakpoints foram exercitados por viewport no Chrome desktop.
- Nenhuma publicação foi realizada; as alterações estão neste checkout.

## Referências consultadas

As referências foram interpretadas mantendo a identidade, os assets e a arquitetura VEZZ: [Blues](https://www.framer.com/marketplace/templates/blues/) para apresentação por rolagem; [HealthTech](https://www.framer.com/marketplace/templates/healthtech/) para clareza da comunicação de saúde; [Bentobox](https://webflow.com/templates/html/bentobox-saas-website-template) para a composição dos cards; [Tabler](https://preview.tabler.io/?theme=light) para hierarquia operacional. Nenhum template ou código dessas referências foi importado.
