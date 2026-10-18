# Publicação coordenada — 18/10/2026

Produção: https://vezz-mvp.vercel.app

Repositório: https://github.com/alvarocarvalho2-spec/MVP__VEZZ — branch `main`.

## Sequência executada

1. Conferência de `origin/main`, execução dos testes e diagnóstico agregado: nenhuma duplicidade por paciente/dia, múltiplos atendimentos ou consultas ativas sem fila.
2. Cópia local das definições de funções, policies, permissões e bucket, além da Edge Function anterior, em `output/playwright/release/` (fora do Git; não é um backup completo dos dados).
3. Commit/push `b106e3e`: página temporária de manutenção. Confirmados HTTP 503, `Retry-After` e `Cache-Control: no-store` no domínio de produção.
4. Aplicação da migração `20261018163947_auditoria_integridade_acesso.sql`, registrada no histórico do Supabase. Nenhum paciente, consulta ou usuário criado/excluído.
5. Publicação de `accept-clinic-invite` com `index.ts` e `handler.ts`. A integração automática do Supabase também publica funções a cada push: sua execução foi acompanhada para garantir o código correto após o deploy.
6. Commit/push `cfd40869bf8e1a46371ef84b631e255943d99afd`: correções, testes, migração e retirada da manutenção. Vercel e Supabase concluíram com sucesso. A Edge Function foi verificada na versão 8, com o novo handler.
7. Verificação em navegador limpo do site real, bloqueando requisições de gravação. HTTP 200, versão `20261018-security` e CSP publicados.

## Verificações após a publicação

- Migração registrada uma única vez, com arquivo local e histórico remoto alinhados.
- Índices `ux_consulta_paciente_dia_ativo`, `ux_consulta_atendimento_unico` e `idx_convite_solicitacao` presentes.
- Funções internas de fila sem EXECUTE para anônimos; escrita direta na fila revogada dos clientes.
- Abas antigas recebem instrução para recarregar antes de alterar consultas. O cliente atual envia `X-Client-Info: vezz-web/20261018`; esse marcador de compatibilidade não substitui autenticação/RLS.
- Bucket limitado a 6 MB e JPG/PNG/WEBP.
- Convite inexistente retorna 404 com `Cache-Control: no-store`; tentativa sem autenticação de cadastrar gestor retorna 401.
- CORS permite o cabeçalho padrão `X-Client-Info`.
- Início, busca, login, cadastro, recuperação, convite inválido, proteção da área de gestor e login em celular verificados sem erros JavaScript. Nenhum formulário de produção foi submetido.
- 85 testes de segurança/banco/Edge e 20 verificações de lógica/movimento aprovados nesta etapa. A auditoria anterior também aprovou 155 verificações de navegador e 153 verificações legadas.

O teste de produção pode ser repetido com `node tests/release-smoke.mjs`. Ele bloqueia POST/PUT/PATCH/DELETE e salva as evidências em `output/playwright/release/production-smoke.json` e capturas no mesmo diretório.

## Observações operacionais

A proteção contra senhas vazadas continua desativada no Auth. Os avisos restantes sobre funções privilegiadas se referem às RPCs intencionalmente públicas/autenticadas, que têm suas verificações de autorização. As funções internas de escrita já não estão expostas.

Não foram alteradas configurações de confirmação de e-mail, SMTP, planos/custos ou CAPTCHA. Os limites de carga, integração de e-mails e demais ressalvas constam no [relatório de auditoria](AUDITORIA-2026-10-18.md).

Não reverter apenas o frontend: a versão antiga fazia escritas diretas na fila. Para recuperação, manter a versão atual ou coordenar uma revisão compatível de banco, função e frontend. Os registros clínicos não foram apagados pela migração.
