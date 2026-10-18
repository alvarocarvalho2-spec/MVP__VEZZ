# Auditoria VEZZ — 18/10/2026

Foram encontradas falhas de autorização, integridade de agendamentos, recuperação de senha, tratamento de erros e acessibilidade. **As correções foram publicadas em produção em 18/10/2026, após autorização do usuário, com manutenção coordenada, migração, Edge Function e frontend.** A liberação do código está no commit `cfd40869bf8e1a46371ef84b631e255943d99afd`. Veja [o registro de publicação](PUBLICACAO-2026-10-18.md).

Não houve criação, alteração ou exclusão de pacientes, consultas ou usuários em produção. Na auditoria, o Supabase foi inspecionado por consultas de metadados e contagens agregadas; na publicação autorizada, foram alterados schema, permissões, configurações do bucket e código da Edge Function. Os testes funcionais usam dados sintéticos e serviços isolados. A verificação do site publicado bloqueou requisições de gravação.

## Resultados verificáveis

| Bateria | Resultado | Evidência |
|---|---|---|
| Segurança, adaptadores, PostgreSQL/RLS, transações e Edge Function | 85 testes aprovados | `npm test`; `tests/security.test.mjs`, `tests/database.test.mjs`, `tests/edge.test.mjs` |
| Lógica e geometria das animações | 20 verificações aprovadas | `npm run test:logic` |
| Nova matriz de navegador | 155 verificações aprovadas | `npm run test:browser`; `output/playwright/audit-results.json` |
| Cenários legados de navegador | 88 + 48 + 17 verificações aprovadas | `node tests/browser.mjs --local --verify --extended --lifecycle`; JSONs em `tests/artifacts/` |
| Acessibilidade automática | 20 telas sem violações nas regras WCAG A/AA aplicadas pelo axe | Campo `a11y` de `output/playwright/audit-results.json` |
| Dependências npm | 0 vulnerabilidades reportadas | `npm audit --json` |
| Sintaxe e alterações | JavaScript, Python e `git diff --check` aprovados | Verificação executada nos arquivos da aplicação |

As contagens são de verificações executadas, com sobreposição entre baterias; não representam funcionalidades distintas nem cobertura percentual. Os cenários de feedback, rolagem, toque e fallback de animação também são executados pela nova matriz e geram relatórios próprios em `output/playwright/`.

## Fluxos e condições cobertos

- Visitante: início, explicação do produto, busca com e sem resultados, filtros, detalhes de clínica, clínica inexistente, solicitação de cadastro, convite inválido e rotas inexistentes.
- Paciente: validação do cadastro, cadastro válido, login, logout, recuperação e redefinição locais, solicitação/conclusão da recuperação Supabase com transporte simulado, painel, histórico, agendamento, reagendamento, cancelamento, fila e atualização de disponibilidade.
- Gestor: painel, iniciar/finalizar atendimento, chamar próximo, agenda, pacientes, cadastro de gestor adicional, edição da clínica, horários, inclusão/remoção de intervalos e restrições do gestor secundário.
- Administrador: acesso reservado, autorização por `app_metadata`, aprovação e convite na mesma transação, rejeição, convite persistente após reabrir a página e feedback quando a rejeição falha. A interface administrativa é testada com sessão sintética; a autorização é exercitada separadamente no PostgreSQL.
- Segurança: leitura entre clínicas, leitura entre pacientes, consultas de terceiros, alteração de proprietário, promoção de gestor, alteração de identidade da clínica, falsificação de fila, aprovações forjadas, permissões de funções internas, privilégios excedentes, erros de autenticação e HTML armazenado/refletido.
- Resiliência: sessão expirada, renovação concorrente, logout durante renovação, erro na disponibilidade, PATCH sem linhas afetadas, perfil incompleto, falha intermediária no cadastro de clínica, compensação de usuário Auth e resposta de transação perdida.
- Interface: teclado, foco após atualizações, skip link, menu e Escape, modal e retorno do foco, texto longo, rolagem nativa, movimento reduzido, ausência de JavaScript/observers e limpeza de timers/listeners.
- Viewports: 320×568, 375×812, 768×1024, 1280×800 e 1440×900; os testes legados acrescentam 360, 390, 1024 e outros tamanhos de notebook/toque.
- Datas: rejeição de datas impossíveis, horário passado, clínica fechada, intervalo incompleto, horários duplicados, fusos UTC/São Paulo/Auckland/Los Angeles e virada do dia.

## Achados e correções

As correções da tabela foram publicadas. Permanecem os limites e itens de configuração detalhados ao final, incluindo proteção contra senhas vazadas desativada no Auth.

| ID | Gravidade | Evidência e impacto | Correção e aceite verificado | Publicação |
|---|---|---|---|---|
| VZ-01 | Alta | A policy publicada de pacientes permitia a qualquer gestor ler todos os pacientes. Reproduzida no schema anterior em PostgreSQL isolado. | Leitura limitada aos pacientes com consulta na clínica do gestor, com helper privado que evita recursão RLS. Matriz de seis identidades aprovada. | Publicado |
| VZ-02 | Alta | O paciente podia alterar o próprio status diretamente para “Em Atendimento”. Reproduzido no schema anterior. | Trigger distingue paciente/gestor e valida transições; paciente não inicia nem finaliza atendimento. | Publicado |
| VZ-03 | Alta | Funções internas `SECURITY DEFINER`, incluindo reindexação com escrita, tinham EXECUTE para anônimos. Confirmado nos catálogos e advisors publicados. | EXECUTE revogado das funções internas; dados agregados de fila exigem autenticação e vínculo. Privilégios TRUNCATE/REFERENCES/TRIGGER também reduzidos como defesa adicional. | Publicado |
| VZ-04 | Alta | Faltavam garantias de uma consulta ativa por paciente/dia e um atendimento por clínica. Verificações da interface podiam ser contornadas ou disputar entre si. | Índices únicos parciais garantem ambas as regras, inclusive contra inserções privilegiadas. | Publicado |
| VZ-05 | Alta | Consulta, entrada/saída da fila e timestamps eram alterados em requisições separadas; falha parcial podia deixar estado inconsistente. | Trigger sincroniza tudo na transação da consulta. Chamar próximo usa RPC transacional com conferência do atendimento esperado. | Publicado |
| VZ-06 | Alta | Solicitação pública podia trazer `status='Aprovada'`; aprovação administrativa e geração do convite eram independentes. | Policy exige solicitação pendente sem análise; RPC de análise bloqueia a linha e aprova/recusa uma única vez. | Publicado |
| VZ-07 | Alta | Convite era consumido depois de criar usuário, clínica, endereço e gestor; não havia reserva atômica, expiração nem vinculação ao e-mail aprovado. | Reserva condicional, validade de sete dias, e-mail do responsável e finalização relacional transacional. Concorrência do handler cria só um usuário. Falhas SQL provocam compensação. | Publicado |
| VZ-08 | Alta | Horários e chaves de dias eram concatenados como HTML na página pública e na visualização da clínica. | Escape dos valores, inclusive chaves inesperadas; teste de HTML armazenado e CSP adicionada. | Publicado |
| VZ-09 | Alta | A conclusão de recuperação de senha Supabase apenas lançava uma exceção. | Callback validado, tokens removidos da URL, formulário e PUT autenticado para nova senha; sessão de recuperação não dá acesso ao painel. | Publicado |
| VZ-10 | Média | RPC podia renovar a sessão indefinidamente; renovações concorrentes disputavam tokens; resposta pendente podia restaurar sessão após logout. | Uma repetição por chamada, renovação compartilhada e conferência da sessão antes de gravar o resultado. | Publicado |
| VZ-11 | Média | Erro de compressão/validação fazia o upload enviar o arquivo original, contornando tipo/tamanho. Bucket publicado não tinha limite nem MIME permitido. | Somente JPG/PNG/WEBP, até 6 MB, sem fallback inseguro; limites também no bucket. | Publicado |
| VZ-12 | Média | RLS podia impedir PATCH e devolver zero linhas, enquanto a interface anunciava sucesso. | Escritas exigem exatamente uma linha afetada; indisponibilidade de registro vira erro acionável. | Publicado |
| VZ-13 | Média | Falha na RPC de ocupação caía em leitura parcial escondida por RLS, anunciando horários de outros pacientes como livres. | Disponibilidade falha explicitamente, preservando a garantia dos índices do banco. | Publicado |
| VZ-14 | Média | Dia era filtrado após baixar o histórico; limites de página da API podiam ocultar consultas recentes e pacientes posteriores ao primeiro lote. | Filtro diário enviado ao servidor, paginação ordenada e IDs de pacientes consultados em lotes menores. | Publicado |
| VZ-15 | Média | Data/hora dependiam do fuso do navegador, enquanto o banco interpreta a agenda em São Paulo. | Datas, horários, ocupação e virada do dia usam o fuso da clínica. Quatro fusos testados. | Publicado |
| VZ-16 | Média | Atendimento anterior à meia-noite podia sumir do painel do dia, impedindo chamar o próximo com o atendimento esperado. | Atendimento em andamento continua acessível até finalizar, inclusive após a virada do dia. | Publicado |
| VZ-17 | Média | Ao passar de clínica ociosa para atendimento iniciado, o botão era recriado e o foco se perdia. | Resumo e ações têm estrutura estável, preservando identidade e foco do botão. Regressão combinada aprovada. | Publicado |
| VZ-18 | Média | Contraste insuficiente em textos auxiliares, status e dia fechado; erros de formulário sem associação acessível. | Tokens de contraste corrigidos, links textuais sublinhados, erros com `aria-invalid`/`aria-describedby` e envio duplicado bloqueado nos formulários afetados. | Publicado |
| VZ-19 | Média | Servidor de desenvolvimento escutava toda a rede e podia servir arquivos ocultos/listagens. Hospedagem não tinha CSP/anti-frame. | Servidor usa loopback por padrão, bloqueia arquivos ocultos/listagens e compartilha cabeçalhos com Vercel. | Publicado |
| VZ-20 | Média | Reagendamento local excluía pelo texto do horário antigo, podendo ignorar o mesmo horário ocupado em outro dia. | Exclusão por ID, validação do dia do paciente e do funcionamento. | Publicado |
| VZ-21 | Baixa | URI malformada interrompia o roteador; perfil Supabase inexistente virava paciente fictício; credenciais demo apareciam em produção. | Rota inválida recuperável, cadastro incompleto explícito, sessão parcial limpa e caixa demo restrita ao modo local. | Publicado |
| VZ-22 | Média | Alocação da fila promovia lock da tabela inteira dentro do INSERT; o mesmo padrão concorrente pode provocar deadlock e bloquear clínicas independentes. | Alocação serializada por clínica/dia com advisory lock transacional; funções internas continuam inacessíveis pela API. | Publicado |

O teste do schema anterior conserva reproduções das falhas VZ-01/VZ-02/VZ-03. O schema base permanece em `sql/schema.sql`; a instalação completa exige a migração posterior, conforme `SETUP.md`.

## Inspeção somente leitura da produção

- RLS estava habilitado nas oito tabelas públicas da aplicação. Isso não compensava as permissões excessivas descritas acima.
- Advisors indicaram sete funções privilegiadas executáveis por anônimos e sete por autenticados. Funções públicas intencionais de disponibilidade devem continuar acessíveis; helpers internos não precisam dessa exposição. [Orientação do advisor](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
- A proteção contra senhas vazadas estava desativada. Essa configuração ainda precisa ser habilitada pelo responsável no Auth. [Configuração e requisitos](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- A verificação agregada não encontrou pacientes com duas consultas ativas no mesmo dia, clínicas com múltiplos atendimentos ou consultas ativas sem fila naquele momento: contagens 0/0/0. Isso não substitui a garantia dos novos índices.
- Nenhuma das três contas de demonstração documentadas existia no Auth publicado: contagem agregada 0. Não foram feitas tentativas de login de teste na produção.
- O bucket de fotos era público, sem limite de tamanho/MIME. A migração preserva a leitura pública de fotos e restringe uploads.
- O advisor de desempenho apontou a FK de convite sem índice, corrigida na migração; reavaliação de Auth por linha em policies continua como oportunidade de otimização. Não foram removidos índices por indicação de “nunca usado” em um MVP.
- A chave configurada no frontend é do papel `anon`; a busca no código não encontrou os formatos de chaves privadas/secretas procurados. A segurança depende das policies, não de esconder essa chave.

## Publicação coordenada

Executada em 18/10/2026. A sequência abaixo documenta o procedimento; a migração local foi alinhada à versão registrada pelo Supabase (`20261018163947`). Banco novo: primeiro o schema base. Banco existente: não recriar tabelas nem executar scripts de tratamento/exclusão de duplicidades sem necessidade.

1. Reservar uma janela de manutenção. O frontend antigo escreve diretamente na fila; a migração passa esse trabalho para triggers e revoga a escrita direta. Não deixar as versões misturadas em uso.
2. Fazer backup e repetir os diagnósticos agregados de duplicidade. Se surgir conflito, revisar os registros com a clínica; a migração aborta sem apagar dados.
3. Aplicar `supabase/migrations/20261018163947_auditoria_integridade_acesso.sql`. O arquivo usa transação e foi reaplicado com sucesso no banco isolado.
4. Publicar `supabase/functions/accept-clinic-invite/index.ts` **e** `handler.ts`. A mesma função atende convites e `?action=create-manager`, que exige JWT válido de gestor principal. A configuração `verify_jwt=false` é necessária para o convite público; a ação de equipe verifica a identidade no servidor.
5. Publicar o frontend e `vercel.json` desta revisão, liberar a manutenção e pedir recarregamento de abas antigas.
6. Em homologação, verificar e-mail real de recuperação, URLs de redirecionamento permitidas, cadastro com a configuração real de confirmação de e-mail, convite e foto. Só fazer gravações de teste em produção com autorização específica.
7. Reexecutar os advisors e conferir permissões/índices/headers em modo somente leitura.

Não reaplicar `sql/policies.sql` ou migrações antigas após esta correção sem reaplicar a migração final. Reverter somente o frontend também deixa versões incompatíveis; uma reversão operacional precisa ser coordenada com banco/Edge.

## Limites e riscos remanescentes

- PGlite executa PostgreSQL, roles, RLS, constraints e triggers reais em memória. Os schemas Auth/Storage do teste são mínimos e não substituem o GoTrue, PostgREST, Storage, gateway e permissões de um Supabase completo. Os estados do handler Edge são testados com cliente simulado; o deploy foi realizado posteriormente, sem teste real de SMTP.
- A configuração histórica exige confirmação de e-mail desativada para cadastro imediato. Com confirmação ativada, a interface agora explica que a confirmação/conclusão é necessária, sem criar sessão fictícia. O provisionamento completo desse modo em outro dispositivo permanece pendente de um fluxo próprio de cadastro confirmado. Avaliar esse requisito antes de habilitar a confirmação.
- Proteção contra senhas vazadas e limites/CAPTCHA contra abuso do formulário público dependem de configuração/serviço. O formulário possui validação e trava de envio, que não substituem limitação no servidor.
- Não houve teste de carga distribuída ou múltiplas conexões PostgreSQL reais. Os índices e transações foram exercitados; concorrência de resgate do convite e renovação de sessão foi simulada. Não se afirma capacidade máxima ou ausência de deadlocks sob carga.
- Se a resposta de uma transação se perder, o handler preserva o usuário e o convite reservado para não desfazer um cadastro possivelmente confirmado. Se a compensação de Auth falhar, o convite também fica reservado. Esses casos exigem inspeção administrativa e recuperação orientada, sem exclusão automática às cegas.
- Uma alteração conjunta de dados da clínica e endereço ainda envolve duas atualizações; falha na segunda pode exigir nova tentativa para completar o endereço. Consultas/fila e criação da clínica por convite já são transacionais.
- Sem auditoria manual com leitores de tela, Safari/iOS ou Firefox, não se declara conformidade WCAG integral nem compatibilidade completa entre navegadores. Não houve análise formal de LGPD, restauração de backup, infraestrutura ou invasão externa.
- Tokens continuam no armazenamento do navegador, conforme a arquitetura existente. A CSP, o escape e o RLS reduzem o impacto de injeção; uma mudança para cookies HttpOnly exigiria backend e outra arquitetura.

## Reprodução

```powershell
npm ci
npm test
npm run test:logic
npm run test:browser
```

Para os cenários legados, iniciar `python serve.py` em outro terminal e executar `npm run test:legacy`. Nenhum desses comandos deve usar contas/dados reais. Os artefatos novos ficam em `output/playwright/`; as capturas legadas permanecem em `tests/artifacts/`.

Referências técnicas usadas para revisar as garantias: [RLS do Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [funções e permissões](https://supabase.com/docs/guides/database/functions) e [advisory locks do PostgreSQL](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS).
