---
name: ux-audit
description: Auditar experiência do usuário, interface, acessibilidade e consistência de páginas e fluxos web, priorizar achados e implementar correções seguras. Acione para revisar UX/UI, avaliar navegação, hierarquia, usabilidade, formulários, feedback de estados, acessibilidade ou realizar auditorias antes de lançar.
---

# UX Audit — auditoria prática de interfaces

## Missão
Encontrar problemas reais que afetam clareza, confiança, acessibilidade e conclusão de tarefas, com recomendações acionáveis sustentadas por evidência.

## Escopo e método
1. Leia o pedido, identifique os usuários e as tarefas essenciais.
2. Inspecione páginas, componentes, estrutura de navegação, lógica relevante e design tokens.
3. Quando houver navegador disponível, execute fluxos reais e colete observações e capturas; não invente evidência.
4. Audite separadamente: descoberta/orientação, hierarquia visual, consistência, formulários, mensagens, estados vazios/erro/carregamento, feedback, conteúdo, responsividade, acessibilidade e performance percebida.
5. Use WCAG como referência de acessibilidade, sem declarar conformidade integral sem auditoria suficiente.

## Checklist de experiência
- A ação principal é reconhecível em cada tela?
- Termos, ícones e mensagens têm significado consistente?
- Usuário entende quando está aguardando, o que mudou e o que fazer depois?
- Erros orientam correção sem apagar dados preenchidos?
- Links e botões são semanticamente corretos, focáveis e claramente identificáveis?
- Existem labels de formulário, mensagens de validação associadas aos campos e foco visível?
- A interface funciona sem mouse e com zoom/movimento reduzido?
- Layout não depende apenas da cor para informar status?
- Elementos repetidos seguem o mesmo padrão visual e de interação?
- Fluxos preservam contexto e têm saída ou retorno compreensível?

## Classificação dos achados
Para cada achado use:
- **ID / tela / etapa do fluxo**
- **Severidade**: crítico (impede tarefa/risco de erro grave), alto, médio ou baixo
- **Evidência**: screenshot, comportamento reproduzido ou arquivo/trecho inspecionado
- **Impacto no usuário**
- **Proposta de correção**
- **Critério verificável de aceite**
Diferencie falha observada de hipótese. Ordene primeiro problemas de tarefa, acessibilidade e integridade, depois polimento visual.

## Procedimento de melhoria
1. Apresente um resumo dos achados priorizados.
2. Se o pedido inclui correção, implemente ajustes em pequenos grupos, sem reescrever o produto por estética.
3. Reexecute fluxos afetados e valide que nada regrediu.
4. Entregue relatório com resolvidos, pendentes, riscos e o que não foi possível testar.

## Escopo VEZZ
Fluxos prioritários: paciente encontrar clínica, escolher horário disponível, agendar/reagendar/cancelar, acompanhar posição na fila; gestor iniciar/finalizar atendimento; administrador aprovar cadastro de clínicas. Confira feedback de operações assíncronas e estados de horário ocupado. Não confunda aparência de estado com garantia de exclusividade no backend.

## Limites
Não alegue conformidade WCAG, taxas de conversão, performance ou sucesso de testes sem medição. Não registre dados de pacientes em artefatos de teste.
