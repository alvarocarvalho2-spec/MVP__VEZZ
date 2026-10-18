---
name: responsive-ui
description: Projetar, implementar e testar layouts responsivos mobile-first em HTML, CSS e JavaScript ou no framework existente. Acione quando o pedido envolver celular, tablet, desktop, grids fluidos, breakpoints, menus adaptativos, overflow ou problemas de layout em tamanhos de tela diferentes.
---

# Responsive UI — mobile-first e interfaces adaptativas

## Missão
Tornar páginas e fluxos utilizáveis em telas pequenas e grandes, preservando consistência visual, conteúdo e interatividade.

## Diagnóstico
1. Inspecione a stack, os estilos atuais e componentes reutilizáveis.
2. Liste páginas críticas, elementos densos, tabelas, formulários, modais, cabeçalhos e menus.
3. Identifique overflow horizontal, textos truncados, toques apertados, conteúdo escondido, zoom e problemas de teclado virtual.
4. Registre o estado atual antes de modificar layouts extensos.

## Diretrizes
- Comece pelo conteúdo e pelas restrições das menores telas suportadas; expanda progressivamente.
- Prefira CSS Grid/Flexbox, `minmax()`, `clamp()`, `%`, `rem`, containers e queries orientadas ao conteúdo.
- Estabeleça breakpoints conforme o layout quebra; não force números fixos sem motivo.
- Evite larguras rígidas e alturas fixas em áreas com texto dinâmico.
- Garanta controles com tamanho e espaço suficientes para toque, foco visível, labels e boa legibilidade.
- Menus compactos devem ser operáveis por toque, teclado e leitor de tela; respeite estados abertos/fechados.
- Para tabelas e dashboards, escolha rolagem horizontal contextualizada, layout em cartões ou colunas prioritárias sem ocultar dados essenciais.
- Considere textos longos, mensagens de erro, estados vazios, carregamento e múltiplos itens em filas.
- Utilize imagens responsivas, proporções estáveis e previna deslocamento visual (CLS) sempre que possível.
- Mantenha a lógica de estado independente do tamanho da tela.

## Matriz de teste sugerida
- 320 × 568: tela estreita
- 375 × 812: celular típico
- 768 × 1024: tablet
- 1280 × 800: desktop
- 1440 × 900: desktop amplo
Essas dimensões são cenários de teste, não breakpoints obrigatórios. Verifique também rotação, zoom e textos maiores quando possível.

## Critérios de aceite
- Sem overflow horizontal global inesperado.
- Navegação, formulários, modais e botões plenamente acessíveis.
- Nenhuma informação essencial perdida em breakpoint algum.
- Layout mantém hierarquia visual, contraste e espaçamento coerentes.
- Sem regressões na versão desktop ou nos fluxos de agendamento.

## Fluxo de trabalho
1. Reproduzir o problema com viewport definida.
2. Aplicar a menor alteração de CSS/estrutura possível.
3. Validar em toda a matriz relevante com screenshots quando ferramenta permitir.
4. Reportar telas testadas, alterações e limitações verificadas.

## Regras para VEZZ
Priorize cadastro/login, busca de clínicas, agendamento, consulta/posição de fila, dashboard de gestor e administração. Não altere o cálculo de posições nem disponibilidade de horários para resolver problemas visuais.
