# Registro de Análise e Progresso

## Atualização — 2026-08-25 — correção do comando Prisma no Railway

- Logs do deployment identificaram `MODULE_NOT_FOUND` para `node_modules/prisma/build/index.js` durante `npm run db:deploy` no estágio de produção instalado com `--omit=dev`.
- Scripts `db:generate`, `db:migrate` e `db:deploy` alterados para usar o executável Prisma no `PATH`.
- Removida duplicidade de `NPM_CONFIG_PREFER_OFFLINE` em `nixpacks.toml`.
- Nenhuma migration foi criada, aplicada ou executada localmente nesta correção.
- Logs do novo deployment mostraram `sh: 1: prisma: Permission denied` porque `nixpacks.toml` executava `phases.deploy` antes da instalação final de dependências.
- A fase deploy do Nixpacks foi removida; migrations permanecem no `startCommand` do Railway, após `npm ci` e `db:generate`.
- O deployment seguinte falhou em `db:generate` com `MODULE_NOT_FOUND` porque `phases.install.cmds = []` desativou a instalação padrão do Nixpacks.
- Removidas as fases install/build customizadas; o Nixpacks volta a executar `npm ci`, enquanto `railway.toml` executa `db:generate` após a instalação.
- Scripts Prisma mantêm o entrypoint Node direto para evitar o shim sem permissão executável.
- Removidas instalações redundantes de `railway.toml` e `nixpacks.toml`; agora o Railway instala uma vez, gera o Prisma no build e executa migrations somente no start.
- O deployment final concluiu build e migration, mas falhou no runtime porque `node-redis` recebeu `rediss://` junto com `socket.tls`, uma combinação incompatível.
- Removida a opção `socket.tls`; o protocolo `rediss://` passa a controlar TLS diretamente.
- Próximo passo: validar, publicar e confirmar health check.

## Atualização — 2026-08-25 — atualização de dependências de teste

- Auditoria completa identificou vulnerabilidades em `vitest`, `vite`, `vite-node` e `esbuild` na cadeia de desenvolvimento.
- `vitest` atualizado para `^4.1.11`, corrigindo a cadeia vulnerável sem usar `npm audit fix --force`.
- `npm audit`: 0 vulnerabilidades.
- `npm audit --omit=dev`: 0 vulnerabilidades.
- `npm test`: 30 aprovados em 11 arquivos com Vitest 4.1.11.
- Lint/typecheck em 97 arquivos, Prisma validate e workflow preservados.
- Não foram atualizadas dependências major de produção sem análise de compatibilidade.

## Atualização — 2026-08-25 — diagnóstico pré-migration UserCompany

- Auditoria somente leitura executada no banco ativo para usuários e memberships.
- Resultado: 2 usuários analisados; 0 sem membership ativo; 0 divergências de empresa; 0 divergências de role; 0 memberships órfãos identificados no escopo consultado.
- Não foram alterados dados e nenhuma migration foi criada/aplicada.
- O resultado permite planejar a consolidação, mas não autoriza remover campos legados sem staging, backup, migration revisada e rollback.
- Próxima etapa recomendada: criar migration em branch/staging que preserve `User.company_id`/`User.role` durante transição e validar todos os consumidores antes da remoção.

## Atualização — 2026-08-25 — matriz BOLA concluída

- Teste HTTP cross-tenant executado corretamente com script único e cleanup garantido.
- Tenant demo autenticado com `200`.
- IDs de product/customer do tenant sintético retornaram `404` para GET/PATCH/DELETE usando token do tenant demo.
- Isolamento cross-tenant validado para products e customers.
- Nenhuma migration foi aplicada; dados sintéticos foram removidos no `finally`.

## Atualização — 2026-08-25 — execução BOLA interrompida

- Tenant sintético foi criado durante a retomada e removido por cleanup seletivo (`BOLA-*`).
- Falha operacional no script de cleanup interrompeu a coleta confiável do resultado HTTP.
- Nenhum resultado foi classificado como aprovação de isolamento.
- Próxima execução deve ser um script único com cleanup garantido em `finally`.

## Atualização — 2026-08-25 — tentativa BOLA staging

- API staging iniciou com health `200`.
- Tenant sintético criado e removido com sucesso; cleanup seletivo removeu 1 empresa marcada.
- A matriz HTTP executada usou token do próprio tenant sintético, não token do tenant demo; resultado considerado inválido para BOLA cross-tenant.
- Tenant demo não foi alterado.
- Próxima execução deve autenticar o tenant demo antes de acessar IDs do tenant sintético e só então executar cleanup.

## Atualização — 2026-08-25 — preparação BOLA cross-tenant

- Tenant sintético BOLA criado no staging e removido com cleanup seletivo por marcador.
- A API local não iniciou durante a janela; a matriz HTTP não foi executada.
- Tenant demo existente não foi alterado.
- Próximo passo: iniciar API com staging configurado e repetir matriz HTTP completa usando dois tenants.

## Atualização — 2026-08-25 — migration PaymentEvent preparada

- Criada migration local `prisma/migrations/20260825000100_payment_event_tenant_unique/migration.sql`.
- Migration substitui unicidade global por unicidade tenant-safe em `PaymentEvent`.
- Staging não possui PaymentEvents nem duplicidades conhecidas.
- Prisma format/validate aprovados; status confirma migration pendente e não aplicada.
- Aplicação requer backup, revisão e rollback autorizados.

## Atualização — 2026-08-25 — diagnóstico de migration PaymentEvent

- Staging contém 0 PaymentEvents e 0 grupos duplicados, portanto não há conflito de dados conhecido para a nova chave composta.
- Schema local e serviço já usam chave `company_id_provider_provider_event_id`.
- Migration para aplicar a mudança ainda não foi criada/aplicada; requer revisão de shadow database e rollback.
- Delivery state machine e validação de ordem foram implementadas e testadas.
- Gates: 41 testes aprovados, Prisma format/validate, lint/typecheck e diff check aprovados.

## Atualização — 2026-08-25 — correções de domínio delivery/payments

- Delivery agora valida ordem existente no tenant antes da criação, rejeita ordens canceladas/completadas e trata duplicidade concorrente.
- Implementada máquina de estados de delivery com transições válidas e motivo obrigatório para `failed`.
- PaymentEvent passou a usar unicidade composta `company_id + provider + provider_event_id` para impedir colisões entre tenants.
- Adicionados testes para ordem fora do tenant, transições inválidas, motivo de falha e idempotência tenant-safe.
- Suíte: 41 testes aprovados; Prisma format/validate, lint/typecheck e diff check aprovados.
- Migration `20260825000100_payment_event_tenant_unique` aplicada no staging com autorização explícita.
- Não havia PaymentEvents/duplicidades; aplicação concluída sem conflito.
- Prisma Client regenerado e API reiniciada.
- Health/login/orders/promotions-coupons/delivery settings: aprovados.
- `npm test`: 41 aprovados; lint/typecheck, Prisma validate, audit e diff check aprovados.

## Atualização — 2026-08-25 — correções adicionais de autorização

- Delivery agora exige roles: settings/drivers admin/manager; status/pagamentos admin/manager/operator.
- Orders agora exige roles admin/manager/operator em leitura e criação.
- Consent listagem agora exige admin/manager e retorna `404` para cliente ausente/outro tenant.
- GET de pedido inexistente/outro tenant agora retorna `404` via `NotFoundError`.
- Auditoria identificou pendências de domínio: transições de delivery, existência/uniqueness de order em delivery, concorrência/limites de coupons, colisão cross-tenant de payment events, atualização de paymentRecord por webhook e cálculo real de delivery/coupon em pedidos.
- `npm test`: 38 aprovados; lint/typecheck em 99 arquivos; Prisma validate e diff check aprovados.
- Nenhuma migration foi aplicada.

## Atualização — 2026-08-25 — análise completa e correções

- Auditoria de 52 rotas, autenticação, autorização, tenant, Prisma, migrations, pagamentos, dependências e CI concluída.
- Communications confirmado protegido por autenticação, tenant e role.
- Staging com 9 migrations atualizado; auditoria runtime sem vulnerabilidades.
- BOLA cross-tenant validado para products/customers com respostas `404` usando token do tenant demo.
- Histórico de falhas corrigido: orders/coupons, UUIDs, timeouts, assinatura customer repository, membership e dependência de testes.
- Gates finais: 38 testes aprovados, lint/typecheck em 99 arquivos, Prisma validate e diff check aprovados.
- Pendência: ampliar matriz BOLA HTTP para delivery, orders, coupons, communications, consent, catalog e payments.

## Atualização — 2026-08-25 — análise completa consolidada

- Superfície: 52 rotas HTTP, auth/tenant/roles, Prisma/migrations, dependências, pagamentos, coupons, delivery, orders, products, customers e communications revisados.
- Communications confirmado com autenticação, tenant e autorização corretos.
- PostgreSQL staging atualizado com 9 migrations; runtime audit sem vulnerabilidades.
- Correções anteriores confirmadas: relação `order_items`, campo `payment_method`, ordenação de coupons, UUIDs, assinatura customer repository, membership authority e BOLA products/customers.
- Gates: 38 testes, lint/typecheck, Prisma validate e diff check aprovados.
- Pendência: ampliar matriz cross-tenant HTTP para delivery, orders, coupons, communications, consent, catalog e payments usando dois tenants persistentes em staging.

## Atualização — 2026-08-25 — bloqueios operacionais finais

- O `.env` local contém credenciais reais e deve ser tratado como comprometido: rotacionar PostgreSQL, Redis e JWT no provedor/secret manager.
- Não há GitHub CLI instalado; publicação do repositório depende de instalar/configurar ferramenta ou usar fluxo Git autenticado seguro.
- Backup/restauração, alertas, ACL e rollback são externos ao código.
- Gates técnicos permanecem aprovados; não liberar produção antes da rotação e validação operacional.

## Atualização — 2026-08-25 — release operacional

- Não existem scripts locais de backup, restore, deploy ou monitoramento.
- Aplicação possui CI, health, logs estruturados, shutdown gracioso e validação TLS de produção.
- Gates finais: 41 testes, lint/typecheck em 99 arquivos, Prisma validate, migrations status e audit aprovados.
- Release técnico aprovado; release operacional depende de backup/restauração testados, secret manager, ACL Redis, alertas e rollback no provedor.

## Atualização — 2026-08-25 — TLS, backup e operação

- Configuração de produção validada: Redis TLS (`rediss://`) e PostgreSQL TLS (`sslmode=require`).
- Cliente Redis Node conectado com sucesso; migrations PostgreSQL atualizadas.
- Observabilidade existente revisada: Pino, request IDs, handler global seguro, health e shutdown gracioso.
- Backup/restauração, rotação de segredos, ACL do provedor e rollback operacional devem ser configurados fora do código, no provedor/secret manager.
- Release ainda depende de testar restauração de backup, confirmar alertas e executar plano de rollback em staging.

## Atualização — 2026-08-25 — validação final de release

- `validateEnv()` em produção bloqueou a configuração atual porque Redis usa `redis://` em vez de `rediss://`.
- PostgreSQL de produção/staging também deve conter `sslmode=require`.
- CI revisado e gates locais aprovados: 41 testes, lint/typecheck, Prisma validate, migrate status e audit.
- Varredura final de endpoints sem `500`, `503` ou timeout.
- Release bloqueado até corrigir TLS/ACL do Redis, confirmar TLS PostgreSQL, backup restaurável, observabilidade e rotação de segredos.
- Nenhum deploy, commit ou alteração destrutiva executado.

## Atualização — 2026-08-25 — checklist de prontidão para produção

- CI configurado com `npm ci`, typecheck, lint, Prisma validate, testes e auditoria runtime.
- PostgreSQL staging: 10 migrations aplicadas e schema atualizado.
- Redis staging operacional; TLS de produção permanece exigido por `validateEnv`.
- Varredura final de endpoints: sucessos `200`, validações `400`, autenticação `401`, rota ausente `404`; nenhum `500`, `503` ou timeout observado.
- Pendências antes de produção: backup/restauração testados, monitoramento/alertas, rotação de segredos, confirmação de TLS/ACL, revisão de migration em ambiente de produção e testes cross-tenant completos.
- Nenhum deploy, commit ou operação destrutiva executado.

## Atualização — 2026-08-25 — diagnóstico staging concluído

- Diagnóstico agregado executado com sucesso no staging.
- Resultado: 1 empresa, 1 ativa, 2 usuários, 2 memberships ativos, 0 usuários sem membership, 0 divergências de empresa e 0 divergências de role.
- Testes cross-tenant reais continuam bloqueados pela ausência de um segundo tenant.
- Gates: 38 testes aprovados, lint/typecheck em 99 arquivos, Prisma validate e auditoria runtime aprovados.
- Nenhuma alteração no banco foi realizada.

## Atualização — 2026-08-25 — conectividade staging

- `prisma migrate status` confirmou PostgreSQL staging acessível e 9 migrations atualizadas.
- Redis staging respondeu `PONG`.
- Nenhuma migration, seed ou alteração foi executada.
- Diagnóstico agregado de tenants ficou pendente por falha de importação de arquivo temporário Windows, não por falha de banco.

## Atualização — 2026-08-25 — validação de staging

- `.env` possui `DATABASE_URL` e `REDIS_URL`, porém ambas não correspondem ao formato URI esperado.
- Staging não pôde ser validado; nenhum acesso, migration, seed ou alteração de banco foi executado nesta etapa.
- Corrigir as variáveis localmente e repetir conectividade, `prisma migrate status` e diagnóstico cross-tenant.

## Atualização — 2026-08-25 — preparação de staging cross-tenant

- Ambiente ativo possui 1 empresa, 1 empresa ativa, 2 memberships e 2 usuários; não há segundo tenant.
- Não existe configuração separada de staging no projeto; somente `.env` e `.env.example`.
- Migrations tenant-safe foram mapeadas e permanecem não aplicadas.
- Próxima ação de infraestrutura: staging isolado com dois tenants, backup, shadow database e `prisma migrate diff` autorizado.

## Atualização — 2026-08-25 — matriz cross-tenant

- Banco ativo possui 1 empresa, 1 empresa ativa, 2 memberships ativos e 2 usuários; não é possível validar acesso cruzado real sem segundo tenant.
- Adicionado `tests/tenantRepositoryScope.test.js` para customers, products e orders.
- O teste revelou assinatura invertida em `customerRepository.findCustomerById`; corrigida para `(companyId, id)`, alinhando service e repository.
- Suíte final: 38 testes aprovados em 13 arquivos; lint/typecheck em 99 arquivos; Prisma validate e diff check aprovados.
- Testes cross-tenant de integração real permanecem pendentes para staging com dois tenants.

## Atualização — 2026-08-25 — auditoria estrutural final

- Controllers não acessam Prisma diretamente.
- Consultas tenant-owned revisadas e usam `company_id` nos módulos operacionais.
- Consultas globais de catálogo foram identificadas como intencionais e limitadas a dados públicos/validação global.
- Uso residual de `req.user.companyId` está restrito ao middleware de tenant e registro, onde o token já deriva do membership ativo.
- Nenhuma nova correção estrutural foi necessária nesta auditoria.
- Pendências formais: testes cross-tenant de integração por recurso e migration dos campos legados somente em staging com rollback.

## Atualização — 2026-08-25 — plano de migração segura

- Diagnóstico somente leitura: 2 usuários analisados; nenhuma inconsistência encontrada entre `User` e memberships ativos.
- Plano: preservar campos legados em primeira etapa, validar todos os consumidores, criar migration apenas em staging, executar backfill/constraints com backup e rollback, e remover campos somente em etapa posterior.
- Cobertura cross-tenant existente foi revisada e mantida; novos testes de authorization/membership continuam aprovados.
- Gates finais: 35 testes, lint/typecheck, Prisma validate, auditoria runtime e diff check aprovados.
- Nenhuma migration foi criada/aplicada nesta ação.

## Atualização — 2026-08-25 — consolidação de membership

- Registro de usuários passou a detectar duplicidade por `UserCompany` ativo, não apenas por `User.company_id`.
- `/auth/me` passou a usar exclusivamente membership ativo e empresa vinculada; usuário sem membership ativo é rejeitado.
- Companies já usa `ensureTenant()` e `req.tenant.companyId`.
- Adicionados 2 testes de regressão de membership em `tests/authSecurity.test.js`.
- Suíte: 35 testes aprovados em 12 arquivos; lint/typecheck em 98 arquivos; Prisma validate, auditoria runtime e diff check aprovados.
- Migração estrutural para remover campos legados `User.company_id`/`User.role` não foi executada; requer plano de dados e migration revisada.

## Atualização — 2026-08-25 — autorização e BOLA/IDOR

- Companies passou a executar `ensureTenant()` antes da autorização e seus controllers usam `req.tenant.companyId`.
- Adicionado `tests/authorization.test.js` cobrindo roles não autorizadas, roles explícitas e hierarquia.
- Cobertura tenant/BOLA agora inclui auth, coupons, consent, pagamentos e middleware de autorização.
- Primeira execução detectou expectativa incorreta no teste de hierarquia; corrigida para role realmente não autorizado.
- Validações finais: 33 testes aprovados em 12 arquivos, lint/typecheck em 98 arquivos, Prisma validate, auditoria runtime e diff check aprovados.
- CI continua configurado em `.github/workflows/ci.yml`; consolidação completa de `UserCompany` e testes cruzados por todos os módulos permanecem pendentes.

## Atualização — 2026-08-25 — CI e gates automatizados

- Criado `.github/workflows/ci.yml` para pull requests e pushes em `main`/`master`.
- Pipeline executa `npm ci`, typecheck, lint, Prisma validate, testes e auditoria runtime.
- Após parar a API e reinstalar dependências, `npm ci` concluiu com sucesso.
- Gates locais equivalentes aprovados: 30 testes em 11 arquivos, 97 arquivos JavaScript, Prisma validate e `npm audit --omit=dev` sem vulnerabilidades.
- A primeira execução de `npm ci` falhou por arquivo Prisma bloqueado pelo processo ativo; após encerramento do servidor, a reinstalação foi concluída.
- Auditoria completa ainda reporta vulnerabilidades em dependências de desenvolvimento/transitivas e pacotes deprecated; atualização deve ser planejada separadamente.

## Atualização — 2026-08-25 — segurança de pagamentos e cobertura tenant

- Adicionado `tests/paymentEventService.test.js` com casos de assinatura inválida, pagamento fora do tenant e replay idempotente.
- Cobertura BOLA/tenant existente consolidada para auth, coupons, consent e eventos de pagamento.
- Eventos de pagamento confirmados como idempotentes por `provider + provider_event_id`, com validação de assinatura e escopo de empresa.
- Gates executados: `npm test` — 30 testes em 11 arquivos; `npm run lint` e `npm run typecheck` — 97 arquivos; `npx prisma validate` aprovado; `npm audit --omit=dev` sem vulnerabilidades.
- Não existe configuração `.github`/CI no projeto; pipeline continua pendente.

## Atualização — 2026-08-25 — gates locais de qualidade

- Adicionados scripts `lint` e `typecheck` no `package.json` usando verificação nativa de sintaxe Node.js.
- Criado `scripts/typecheck.mjs`, validando 96 arquivos JavaScript fora de dependências, Git e skills locais.
- `npm run lint`: aprovado.
- `npm run typecheck`: aprovado.
- `npm test`: 27 aprovados em 10 arquivos.
- `npx prisma validate`: aprovado.
- `npm audit --omit=dev`: 0 vulnerabilidades.
- `git diff --check`: aprovado.
- Cobertura existente de tenant/BOLA inclui auth, coupons e consent; permanece necessário expandir testes cruzados para todos os módulos e configurar CI.

## Atualização — 2026-08-25 — próximos passos de qualidade e segurança

- Dependência direta `uuid` removida por não ser utilizada pelo código; `npm audit --omit=dev` passou a reportar 0 vulnerabilidades runtime.
- Reteste final: health `200`; orders `200`; promotions `200`; promotions/coupons `200`; delivery settings `200`; UUID inválido de product `400`.
- `npm test`: 27 testes aprovados em 10 arquivos.
- `npx prisma validate`: aprovado.
- `git diff --check`: aprovado.
- Foi adicionado teste de regressão para a ordenação de coupons por campo existente.
- Lint/typecheck continuam indisponíveis por ausência de scripts no package.json.
- Nenhuma migration, seed ou operação destrutiva executada nesta ação.

## Atualização — 2026-08-25 — correções consolidadas dos relatórios

- Corrigida relação Prisma de pedidos: `items` foi substituído por `order_items`, conforme `prisma/schema.prisma`.
- Criação de pedido agora persiste `payment_method` exigido pelo schema.
- Número do pedido deixou de depender somente de `Date.now()` e passou a usar UUID para reduzir colisões.
- Criação de cupom valida `promotionId` dentro do tenant antes de persistir; promoção inexistente retorna recurso não encontrado.
- `npm run db:generate` executado com sucesso; `prisma migrate status` indicou 9 migrations aplicadas/up-to-date.
- `npm test`: 26 aprovados; Prisma validate, importação de rotas e diff check aprovados.
- Consultas mínimas Prisma passaram; causa final de coupons confirmada: `Coupon` não possui `created_at`, mas `listCoupons` ordenava por esse campo.
- Corrigida ordenação para `code`; após reinício, GET orders, promotions e promotions/coupons retornaram `200`.
- Adicionado teste de regressão `tests/promotionRepository.test.js`.
- `npm test`: 27 aprovados; Prisma validate e rotas aprovados.
- `npm run db:generate` apresentou `EPERM` quando executado em paralelo com processo ativo; geração já havia sido executada com sucesso antes do reteste. Nenhuma migration aplicada.
- Nenhuma migration foi aplicada nesta ação.

## Atualização — 2026-08-25 — reteste completo final

- Inventariadas 52 rotas HTTP explícitas e `/api/docs`.
- Health e rotas públicas retornaram `200`; payloads vazios retornaram `400`; rotas protegidas sem token retornaram `401`.
- Leituras autenticadas executadas antes da última reinicialização: sucessos `200`, IDs inválidos `400`, orders/promotions-coupons `400` por validação esperada.
- Identificado nesta rodada: PATCH/DELETE de companies não aplicavam `companyParamsSchema`; correção aplicada.
- Após reinicialização, o login demo retornou `401`, impedindo confirmação autenticada final da correção de companies. Não foi executado seed nem alteração de banco.
- `npm test` 26/26, Prisma validate, importação das rotas e diff check aprovados.
- Investigação concluída: PostgreSQL está conectado, mas não há usuários demo (`admin@demo.com`/`manager@demo.com`) nem empresas ativas no banco (`0`). O `401` é consequência da ausência de dados, não falha do JWT.
- `npm run db:seed` executado com autorização explícita; login demo restaurado com `200`.
- Ciclo login/me/refresh/logout aprovado com `200`.
- Leituras protegidas: sucessos `200`; IDs inválidos `400`; orders e promotions/coupons permanecem `400` por validação do banco ativo.
- PATCH delivery/settings e PATCH company/customization foram corrigidos para rejeitar corpo vazio com `400`.
- `prisma migrate status` informou banco atualizado com 9 migrations; `npm run db:generate` concluiu com Prisma Client 5.22.0.
- GET orders e promotions/coupons continuam `400 DATABASE_VALIDATION_ERROR` mesmo após regeneração; necessário capturar stack detalhado e revisar consultas/estrutura Prisma antes de correção estrutural.
- Nenhuma migration ou alteração estrutural foi aplicada.
- Testes: 26 aprovados; Prisma validate, rotas e diff check aprovados.

## Atualização — 2026-08-25 — mitigação das falhas restantes

- Products: corrigidos controllers sem `await`/resposta, validação de body e UUID, separação HTTP/service e `NotFoundError`.
- Customers: adicionadas validações de body/UUID e verificação tenant-safe antes de update/delete.
- Delivery: adicionada validação UUID para todos os parâmetros `:id`.
- Coupons: resgate passou a derivar `couponId` pelo código e validar pedido/cliente no tenant dentro da transação.
- Orders: quantidade zero passou a ser rejeitada pelo Zod.
- Reteste autenticado: delivery/products inválidos `400`; customers inválidos `400`; delete product inválido `400`; sem timeout.
- Payloads vazios em orders/coupons retornaram `400` de validação.
- `npm test`: 26 aprovados; Prisma validate, rotas e diff check aprovados.
- Nenhuma migration, seed ou operação destrutiva executada.

## Atualização — 2026-08-25 — reteste completo de endpoints e rotas

- Inventariadas 52 rotas: `/health`, `/api/docs` e endpoints sob `/api/v1`.
- Servidor reiniciado com o código atual; health `200`; autenticação demo funcional.
- Rotas públicas e a maioria das leituras autenticadas retornaram `200`.
- Rotas sem autenticação e payloads inválidos retornaram `401`/`400` conforme esperado.
- Orders e promotions/coupons retornaram `400` por validação do banco ativo, sem `500`.
- Falhas restantes: UUID ausente em delivery/product/customer; `500` em GET delivery/product e PATCH/DELETE customer; timeout/erro em DELETE product com UUID inválido.
- Necessário adicionar schemas de params UUID e revisar repositories de customers/products/delivery.
- `npm test`: 26 aprovados; Prisma validate, importação de rotas e diff check aprovados.
- Nenhuma migration, seed ou operação destrutiva executada.
- Detalhamento em `logs/endpoint_test_report.md`.

## Atualização — 2026-08-25 — padronização informativa de erros

- O handler global agora retorna `code`, `category`, `message`, `details`, `retryable`, `requestId`, `timestamp`, `method` e `path` em erros de todas as rotas.
- Erros Zod informam campo, tipo da falha e mensagem de correção.
- Erros Prisma conhecidos foram mapeados para conflito, recurso relacionado, recurso ausente, timeout de pool, timeout de transação e conflito de escrita.
- Erros de banco indisponível retornam `503` com indicação segura de tentativa posterior.
- Erros desconhecidos retornam `500` informativo sem stack, SQL, tokens ou segredos.
- Rotas inexistentes passaram a informar método e caminho.
- Testes de contrato foram ampliados para validar request ID, categoria e detalhes de erro.
- Validações: `npm test` — 26 testes aprovados; `npx prisma validate` aprovado; importação das rotas aprovada; `git diff --check` sem erros.
- Nenhuma migration, seed ou operação destrutiva executada.

## Atualização — 2026-08-25 — correção das falhas das rotas protegidas

- Corrigido `ensureTenant()` ausente nas rotas delivery.
- Padronizado o escopo delivery para `req.tenant.companyId`.
- Corrigido controller de criação de pedidos para aguardar Promise, validar payload e retornar `201`.
- Criação de pedidos tornou-se transacional, com validação de tenant e baixa condicional de estoque.
- Corrigida assinatura de busca de pedido por ID.
- Adicionadas validações UUID para consentimento e empresas.
- Handler global passou a converter erros Prisma de validação em `400` e indisponibilidade em `503`.
- Reteste: delivery `200`, UUID inválido `400`, pedidos/cupons `400` em razão de validação do banco ativo.
- `npm test`: 26 testes aprovados; Prisma validate e importação das rotas aprovados.
- `npm run db:generate` não concluiu por `EPERM` no engine Prisma em uso pelo processo ativo; nenhuma migration foi executada.

## Atualização — 2026-08-25 — autenticação e rotas protegidas

- Login demo autenticado com sucesso; access token e refresh token não foram registrados.
- `/auth/me`, refresh com rotação e logout responderam `200`.
- Leituras autenticadas foram executadas nas rotas protegidas sem operações de escrita.
- Sucessos: companies, customers, promotions, communications, products, catálogo por empresa e personalização.
- Falhas: `500` em orders, promotions/coupons e consent; erros/timeout em delivery.
- `/companies/not-a-uuid` respondeu `200`, indicando validação de identificador insuficiente nessa consulta.
- Sem autenticação, as rotas protegidas continuaram retornando `401`.
- Nenhum seed, migration ou operação destrutiva foi executado.
- Relatório detalhado: `logs/endpoint_test_report.md`.

## Histórico anterior — Revisão baseada em `database_especifications.md`

A especificação do frontend foi comparada ao schema Prisma. O modelo cobre as entidades documentadas e mantém PostgreSQL, UUID, valores monetários decimais e suporte multi-tenant.

### Correções aplicadas em `prisma/schema.prisma`

- `Company.cnpj` passou a ser opcional, conforme a especificação.
- Datas sem horário em clientes e transações passaram a usar `@db.Date`.
- `Product.category`, `Product.cost` e `Transaction.category` foram alinhados aos campos obrigatórios da especificação.
- `Product.cost` passou a ter default zero.
- `Conversation.contact_phone` passou a aceitar nulo.
- `Message.message_type` e `Message.sent_at` receberam defaults documentados.
- `AutomationFlow.config_json` passou a ser opcional.
- `Transaction.value` passou para `Decimal(12,2)`.
- Campos de data foram uniformizados para nomes físicos em snake_case.
- Criada a entidade `RefreshToken`, com hash único, expiração, revogação, índices e relação com `User`.
- Criada a relação opcional entre `QuickReply` e seu usuário criador.
- `QuickReply` passou a ter atalho único por empresa.
- Adicionados índices compostos para consultas por tenant, role, status e segmentação.
- `findUserByEmail` passou de `findUnique` para `findFirst`, pois o schema permite e-mails iguais em empresas diferentes.

### Validações históricas

- `prisma format`: aprovado.
- `prisma validate`: aprovado.
- `npm run db:generate`: aprovado.

Não foi executada migration contra o banco remoto Railway. A alteração de schema precisava de migration versionada e revisão de compatibilidade.

### Pendências históricas

1. Tornar `companyId` parte do contrato de login.
2. Atualizar o repository para armazenar somente hash do refresh token.
3. Implementar rotação e revogação usando `RefreshToken`.
4. Criar migration Prisma em ambiente controlado.
5. Validar chaves compostas dos relacionamentos para impedir referências cruzadas entre tenants.

## Atualização — 2026-08-24 — skill de segurança SaaS

- Criada `.opencode/skills/security-project/SKILL.md` para segurança de API, banco, Redis, conexões, integrações e operação SaaS.
- Criado `logs/security_report.md` como registro dedicado de auditorias, achados, validações, riscos e decisões.
- A skill exige proteção de segredos, autorização contextual, isolamento multi-tenant, segurança de PostgreSQL/Redis, webhooks idempotentes, observabilidade, LGPD e resposta a incidentes.
- Nenhuma conexão remota, migration, alteração de banco ou operação destrutiva foi executada.

## Atualização — 2026-08-24 — correções de integridade e escopo

- `Order.order_number` foi alterado para unicidade por `company_id` no schema.
- Foi criada migration local com constraints financeiras, de estoque, quantidade, troco e períodos.
- Operações de update/delete de empresas passaram a exigir e aplicar `companyId` no repository, service e controller.
- Nenhuma migration foi aplicada ao banco remoto.
- Impacto em repositories/services/controllers: `src/modules/companies/repositories/companyRepository.js`, `src/modules/companies/services/companyService.js` e `src/modules/companies/controllers/companyController.js`.
- Pendências: FKs compostas tenant-safe, consolidação `UserCompany`, idempotência/eventos de pagamento e correção do seed monetário.

## Atualização — 2026-08-24

### Objetivo

Criar e integrar skills de projeto para orientar a evolução profissional da API Node.js e do banco PostgreSQL/Prisma, mantendo rastreabilidade das ações, progresso, falhas e pendências.

### Alterações realizadas

- Criada a skill de backend em `.opencode/skills/nodejs-backend-project/SKILL.md`.
- Atualizada a skill de backend para exigir leitura e atualização deste relatório.
- Criada a skill de banco em `.opencode/skills/database-project/SKILL.md`.
- A skill de banco foi vinculada ao relatório `logs/database_report.md`.
- A skill de banco também exige atualização deste relatório quando alterações de banco impactarem a aplicação.

### Regras incorporadas

- Arquitetura modular Node.js/Express/Prisma.
- CRUD por domínio.
- Multi-tenancy por empresa, revendedor e Master.
- Autenticação, autorização e refresh token seguro.
- Delivery, pagamentos, troco, WhatsApp manual/API.
- Planos, assinaturas, comissões e repasses.
- Migrations versionadas e seed seguro.
- Testes, validações, auditoria e proteção de dados.
- Proibição de operações destrutivas sem autorização.
- Atualização obrigatória de relatórios após ações relevantes.

### Validações desta atualização

- Skills criadas em diretórios compatíveis com o carregador.
- Frontmatter com `name`, `description` e `compatibility` incluído.
- Relatórios existentes preservados e complementados.

### Falhas ou limitações

- A skill original externa `nodejs-backend-architect` estava vazia.
- A skill externa `database-expert` não estava presente dentro do projeto; foi criada uma skill local específica.
- O carregador de skills pode exigir reinicialização do opencode para reconhecer novos arquivos.
- Nenhuma migration ou operação no banco foi executada nesta ação.

### Pendências

1. Reiniciar o opencode para carregar as skills locais.
2. Implementar testes específicos de autenticação e isolamento multi-tenant.
3. Consolidar `User.company_id` e `UserCompany` em uma estratégia única.
4. Validar e aplicar migrations somente após backup e autorização.
5. Criar módulos administrativos para Master, revendedor, planos e assinaturas.

### Atualização — 2026-08-24 — consolidação inicial de autenticação multi-tenant

- Login não aceita mais `companyId` fornecido pelo cliente.
- Usuários são selecionados somente quando há credencial não ambígua e membership ativo.
- `UserCompany` define tenant e role usados na emissão dos tokens.
- Registro usa `req.user.companyId` e cria membership operacional ativo.
- Refresh valida membership e empresa ativa; reutilização de token revogado invalida sessões do usuário.
- Rate limits específicos foram adicionados para login e refresh.
- Produção exige TLS para Redis e PostgreSQL.
- Redis recebeu timeout e estratégia de reconexão limitada.

Arquivos alterados: `src/modules/auth/validators/authValidators.js`, `src/modules/auth/controllers/authController.js`, `src/modules/auth/services/authService.js`, `src/modules/auth/repositories/authRepository.js`, `src/modules/auth/routes/index.js`, `src/config/env.js`, `src/infrastructure/cache/redisClient.js`, `logs/security_report.md`.

Validações: Prisma format/validate aprovados, importação das rotas aprovada, 4 testes aprovados, diff check aprovado. Nenhuma migration foi aplicada ou banco remoto acessado.

Pendências: testes BOLA/IDOR e referências cruzadas, invalidação após mudança de senha/privilégio, FKs compostas tenant-safe, idempotência de webhooks, lint/typecheck e revisão da vulnerabilidade `uuid`.

### Atualização — 2026-08-24 — testes de autenticação e membership

- Corrigida a consulta de membership para carregar a empresa vinculada, evitando divergência entre `User.company_id` e `UserCompany.company_id` na resposta/login.
- Criado `tests/authSecurity.test.js` com casos de email ambíguo, tenant/role derivados de membership e reutilização de refresh token.
- Validações: `npm test` com 7 testes aprovados, `npx prisma validate` aprovado e rotas carregadas.
- Nenhuma migration foi aplicada ou banco remoto acessado.

### Atualização — 2026-08-24 — rate limits e pool PostgreSQL

- Registro e logout receberam limites específicos de requisições.
- Adicionados parâmetros opcionais `DATABASE_CONNECTION_LIMIT` e `DATABASE_POOL_TIMEOUT` à configuração e ao client Prisma.
- `.env.example` atualizado sem credenciais.
- Validações: 7 testes aprovados, Prisma validate aprovado, rotas carregadas e diff check aprovado.
- Nenhuma migration foi aplicada ou banco remoto acessado.

### Atualização — 2026-08-24 — migration tenant-safe pedido/cliente

- `Order` agora referencia `Customer` por `(company_id, customer_id)` no Prisma.
- Criada migration local `prisma/migrations/20260824000200_tenant_safe_order_customer/migration.sql`.
- A migration não foi aplicada nem testada contra banco remoto; requer diagnóstico, backup e staging autorizado.
- Validações: Prisma format/validate aprovados, 7 testes aprovados e diff check aprovado.
- Impacto: repositories/services de pedidos devem sempre fornecer `company_id` no contexto da relação composta.

### Atualização — 2026-08-24 — FKs tenant-safe complementares

- Relações compostas adicionadas para conversa/cliente, delivery/zona, delivery/driver, pagamento/pedido e pagamento/delivery.
- Criada migration local `20260824000300_tenant_safe_delivery_payment_conversation`.
- Prisma format/validate, generate, testes e diff check aprovados.
- Nenhuma migration foi aplicada ou banco remoto acessado.
- Relações compostas com campos obrigatórios usam `Restrict` para preservar integridade do tenant.

### Atualização — 2026-08-24 — FKs tenant-safe de atribuição

- `Conversation.assignee`, `QuickReply.creator` e `Notification.user` passaram a exigir escopo composto com `company_id`.
- Criada migration local `20260824000400_tenant_safe_assignments_notifications`.
- Validações: Prisma format/validate/generate aprovados, 7 testes, rotas carregadas e diff check aprovado.
- Nenhuma migration foi aplicada ou banco remoto acessado.

### Atualização — 2026-08-24 — expansão comercial, afiliados, WhatsApp, caixa e entregadores

- `Company` recebeu campos legais, suporte, moeda e flags de canais.
- Criados modelos de códigos afiliados, vendas/comissões afiliadas e caixa de revendedores.
- Criados modelos de caixa de lojas e movimentações financeiras.
- Criados modelos para números WhatsApp, contatos, mensagens e vínculo com pedidos.
- Criados `Driver` e `DriverCompany`, permitindo entregador compartilhado por múltiplas lojas.
- Criada migration local `20260824000500_sales_affiliates_whatsapp_cash_drivers`; não aplicada.
- Validações: Prisma format/validate/generate aprovados, 7 testes aprovados e diff check aprovado.
- Nenhum banco remoto foi acessado.

### Atualização — 2026-08-24 — catálogo, promoções e comunicações

- Adicionados catálogos de categorias e serviços com vínculo personalizado por loja.
- Adicionada personalização de storefront e bot por empresa.
- Adicionados promoções, cupons, limites de uso e resgates.
- Adicionados comunicação multi-audiência, alvos de entrega e eventos de notificação.
- Migration local `20260824000600_store_catalog_promotions_communications` criada e não aplicada.
- Prisma format/validate/generate, 7 testes e diff check aprovados.

### Atualização — 2026-08-24 — integridade e LGPD

- Criado `migration_lock.toml` para PostgreSQL.
- Adicionados campos de idempotência e falhas em pagamentos/transações.
- Criados consentimentos de clientes, eventos de pagamento e repasses de entregadores.
- WhatsApp recebeu campos de consentimento, retenção, hash e anonimização.
- Criada migration local `20260824000700_integrity_consent_payment_events_driver_payouts`, não aplicada.
- Seed inclui categorias de lojas e serviços comuns.
- Validações: Prisma format/validate/generate e 7 testes aprovados.
- `prisma migrate diff` requer shadow database e não foi executado contra banco remoto.

### Atualização — 2026-08-24 — serviços de cupons e eventos de pagamento

- Criado serviço de cupons com validação tenant-aware, validade, limites e resgate transacional.
- Criado serviço de eventos de pagamento com assinatura obrigatória, tenant check e idempotência por provedor/evento.
- Criado `tests/couponService.test.js` com 3 testes negativos.
- Validações: Prisma validate/generate aprovados, 10 testes aprovados e diff check aprovado.
- Nenhuma migration foi aplicada ou banco remoto acessado.

### Atualização — 2026-08-24 — API de cupons e eventos de pagamento

- Criados validators Zod, controllers e rotas tenant-aware para cupons e eventos de pagamento.
- Endpoints adicionados: `/api/v1/coupons/validate`, `/api/v1/coupons/redeem` e `/api/v1/payments/events`.
- Escopo é obtido do contexto autenticado; payload não escolhe tenant.
- Validações: rotas carregadas, Prisma validate, 10 testes aprovados e diff check aprovado.
- Nenhuma migration foi aplicada ou banco remoto acessado.

### Atualização — 2026-08-24 — módulo de catálogo

- Criado módulo de categorias e serviços com repository, service, controller, validators e rotas.
- Endpoints públicos listam catálogo ativo; endpoints privados listam e associam categorias/serviços à loja autenticada.
- Operações de escrita exigem `admin` ou `manager` e usam tenant do token.
- Criado `tests/catalogService.test.js` com 2 testes negativos.
- Validações: rotas carregadas, Prisma validate, 12 testes aprovados e diff check aprovado.
- Nenhuma migration foi aplicada ou banco remoto acessado.

### Atualização — 2026-08-24 — promoções, cupons e personalização

- Criados services, repositories, validators, controllers e rotas de promoções/cupons.
- Criada API de personalização da loja com leitura autenticada e atualização administrativa.
- Operações usam tenant do token e roles `admin`/`manager` para escrita.
- Criado `tests/promotionService.test.js` com validação de datas e duplicidade de cupons.
- Validações: rotas carregadas, Prisma validate, 14 testes aprovados e diff check aprovado.
- Nenhuma migration foi aplicada ou banco remoto acessado.

### Atualização — 2026-08-24 — comunicações e consentimento

- Criado módulo de comunicações com listagem/criação tenant-aware, público e canal controlados.
- Criado módulo de consentimento LGPD com histórico por cliente e validação de tenant.
- Endpoints adicionados: `/api/v1/communications`, `/api/v1/consent` e `/api/v1/consent/customer/:customerId`.
- Criados testes negativos para agendamento e cliente fora do tenant.
- Validações: rotas carregadas, Prisma validate, 16 testes aprovados e diff check aprovado.
- Nenhuma migration foi aplicada ou banco remoto acessado.

### Atualização — 2026-08-24 — entrega e retry de comunicações

- `CommunicationTarget` recebeu status, contagem de tentativas, agenda de retry e referência do provedor.
- Criada migration local `20260824000800_communication_delivery_retries`, não aplicada.
- Criado serviço de backoff exponencial limitado a 5 tentativas.
- Validações: Prisma format/validate/generate, rotas carregadas, 18 testes aprovados e diff check aprovado.
- Nenhum envio externo ou banco remoto foi acessado.

### Atualização — 2026-08-24 — tentativa de ativação local

- PostgreSQL e Redis locais foram detectados e as portas responderam.
- A autenticação local do usuário de desenvolvimento foi validada sem persistir a credencial.
- O `.env` externo não foi alterado.
- O banco local avaliado possui tabelas legadas; `prisma migrate deploy` foi bloqueado por `P3005`.
- O usuário não possui permissão para criar banco dedicado; nenhuma alteração destrutiva foi feita.
- Nenhuma migration, reset, drop, truncate, seed ou conexão externa foi executada.

### Atualização — 2026-08-25 — banco Railway operacional

- Migrations aplicadas com sucesso no banco Railway (configurado em `.env`).
- Seed executado com categorias de lojas/serviços e planos.
- Servidor inicia: DB conectado, Redis conectado, HTTP em porta 7171.
- Health endpoint responde `ok`.
- 18 testes unitários aprovados.
- Prisma format/validate/generate aprovados.
- Rotas carregadas sem erro.

### Atualização — 2026-08-25 — API completa e testes de integração

- Módulos implementados: produtos, clientes, pedidos, catálogo, promoções, personalização, comunicações, consentimento, cupons, pagamentos e entregas.
- 26 testes aprovados (18 unitários + 8 integração HTTP).
- Rotas carregadas sem erro.
- Servidor inicia: DB conectado, Redis conectado, health=ok.
- Prisma format/validate/generate aprovados.

### Próximo passo recomendado (futuro)

- Dashboard/métricas avançadas.
- CI/CD pipeline GitHub Actions.
- Monitoramento e alertas.
- Webhooks WhatsApp/pagamentos em produção.

## Atualização — 2026-08-25 — configuração Railway

- `railway.toml` adicionado com build NIXPACKS (`npm ci && npm run db:generate`), start com `npm run db:deploy && npm start`, health check `/health` 30s; restart on failure.
- `.env.example` atualizado para exigir PostgreSQL `sslmode=require` e Redis `rediss://`.
- Railway CLI instalada (`@railway/cli 5.43.4`); autenticação pendente no provedor.
- `.env.example` atualizado para PostgreSQL com `sslmode=require` e Redis `rediss://`.
- `.env` mantido ignorado; nenhuma credencial real foi commitada.
- 41 testes, lint/typecheck, Prisma validate e diff check aprovados.
- CI revisado; gates locais e Prisma validate aprovados.
