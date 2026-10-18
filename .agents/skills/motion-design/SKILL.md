---
name: motion-design
description: Planejar, implementar, refatorar e validar animações, transições, efeitos de rolagem e microinterações em interfaces web usando CSS e JavaScript, com GSAP apenas quando justificado. Acione em pedidos de motion design, animações, efeitos de hover, transições entre estados e polimento de movimento.
---

# Motion Design — interfaces web

## Missão
Entregar movimento intencional, sofisticado, acessível e estável sem quebrar funcionalidades ou alterar a arquitetura desnecessariamente.

## Antes de começar
1. Inspecione framework, CSS/JS existente, dependências, componentes e tokens do projeto.
2. Determine o objetivo de cada animação: feedback, orientação, continuidade, hierarquia ou narrativa.
3. Identifique componentes com estado sensível (formulários, autenticação, filas, consultas) que não devem ter seu fluxo alterado.
4. Proponha um plano conciso: alvo, efeito, gatilho, duração aproximada, fallback e critério de validação.

## Critérios de implementação
- Prefira CSS transitions/keyframes em efeitos simples e mudanças de estado.
- Use Web Animations API ou GSAP somente quando houver necessidade real de timelines, coordenação complexa, scroll ou controle fino. Verifique se a dependência já está instalada antes de adicioná-la.
- Anime principalmente `transform` e `opacity`. Evite animar propriedades que desencadeiem layout repetidamente.
- Defina tokens reutilizáveis para duração e easing, alinhados à linguagem visual existente.
- Use movimentos discretos em páginas operacionais; reserve efeitos expressivos a áreas de apresentação.
- Garanta que elementos interativos sejam utilizáveis durante/após as animações. Não bloqueie cliques, foco ou a leitura.
- Evite animações que escondam informações essenciais ou façam o usuário esperar por ações básicas.
- Respeite `prefers-reduced-motion: reduce`, com alternativa sem movimento não essencial.
- A animação deve funcionar ao navegar para trás, alterar filtros, atualizar estados e repetir interações.
- Em efeitos ligados ao scroll, faça limpeza de listeners/observers e evite duplicação na reentrada de páginas.

## Cuidados especiais para o VEZZ
- Não use animação para alterar posição na fila, disponibilidade de horário, status de consulta ou permissões: esses estados vêm da lógica e do backend.
- Em atualizações de fila, preserve leitura, foco e anúncio acessível de mudanças importantes.
- Não adicione GSAP, Lenis ou Three.js como requisito universal. Escolha a menor ferramenta adequada.
- Mantenha identidade visual profissional, coerente com a clínica e a interface existente.

## Validação obrigatória
1. Teste hover, clique, foco/teclado, navegação e repetição de estados.
2. Verifique viewport estreita e ampla, desempenho básico e rolagem.
3. Verifique modo de movimento reduzido.
4. Se houver navegador automatizado, faça captura visual e corrija regressões; caso contrário, declare o limite de verificação.
5. Informe arquivos alterados, bibliotecas adicionadas e comportamentos efetivamente testados.

## Não fazer
- Não substituir interface funcional por demo visual.
- Não remover validações, handlers, atributos de acessibilidade ou estados de carregamento.
- Não alegar testes que não foram executados.
