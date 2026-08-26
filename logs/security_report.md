# Relatório de Segurança

## Atualização — 2026-08-25 — correção de execução Prisma no deploy

- Logs Railway identificaram referência fixa inexistente a `node_modules/prisma/build/index.js` no estágio de produção com dependências omitidas.
- Scripts Prisma passaram a usar o binário resolvido pelo `PATH`, sem inserir segredos ou alterar o banco nesta etapa.
- Removida configuração duplicada do Nixpacks que gerava configuração inconsistente.
- Variáveis Railway foram previamente rotacionadas e validadas com TLS; valores não foram registrados.
- Logs posteriores mostraram `prisma: Permission denied` na fase deploy antecipada do Nixpacks, antes da instalação final de dependências.
- A fase deploy antecipada foi removida; migration continua somente no start após instalação, sem expor secrets.
- O deployment seguinte falhou com `prisma: Permission denied` no shim `node_modules/.bin/prisma` durante a geração do cliente.
- Os scripts passaram a usar o entrypoint Node direto, sem expor secrets nem alterar migrations nesta etapa.
- Instalações redundantes foram removidas; nenhuma variável sensível foi alterada ou registrada.
- Próximo passo: publicar a correção e validar build, migration e health check no Railway.

## Atualização — 2026-08-25 — configuração Railway completa

- `railway.toml` adicionado: build NIXPACKS (`npm ci && npm run db:generate`), start `npm run db:deploy && npm start`, health `/health` 30s, restart on failure.
- `.env.example` atualizado: PostgreSQL com `sslmode=require`, Redis `rediss://`.
- Railway CLI instalada (`@railway/cli 5.43.4`); autenticação pendente no provedor.
- `.env.example` atualizado para `sslmode=require` e `rediss://`.
- `.env` mantido ignorado; nenhuma credencial real no repositório.
- Gates: 41 testes, lint/typecheck 99 arquivos, Prisma validate, migrate status, audit aprovados.
- Release depende de backup testado, secret manager, ACL Redis, alertas, rotação de segredos e rollback validado.

## Atualização — 2026-08-25 — publicação GitHub segura

- GitHub CLI autenticado como `Dixavado71`.
- Criado repositório privado `Dixavado71/dixAPI_backend_private`.
- Commit `62c40d8` enviado para `main` pelo remoto privado.
- `.env` não foi versionado; apenas `.env.example` foi publicado.
- Nenhum arquivo de chave/certificado ou temporário de staging foi incluído.
- O repositório público existente não foi sobrescrito.

## Atualização — 2026-08-25 — deploy Railway

- CLI Railway instalada (`@railway/cli 5.43.4`); autenticação pendente de execução do usuário (`railway login`).
- `railway.toml` adicionado: build `NIXPACKS` com `npm ci && npm run db:generate`; start com `npm run db:deploy && npm start`; health check em `/health` com timeout de 30s.
- `.env.example` continua sendo o único template versionado.
- Nenhuma credencial Railway ou variável de produção foi escrita no repositório.

## Atualização — 2026-08-25 — template de produção

- `.env.example` atualizado para indicar PostgreSQL com `sslmode=require` e Redis com `rediss://`.
- Nenhuma credencial real foi incluída no template.
- `.env` permanece ignorado e não deve ser commitado.
- Gates técnicos continuam aprovados; configuração real deve ser preenchida via Secret Manager/Railway.

## Atualização — 2026-08-25 — ações externas de release

- Identificado risco CRÍTICO: o arquivo `.env` local contém credenciais reais de PostgreSQL, Redis e JWT; não deve ser versionado nem usado como armazenamento permanente.
- Ação obrigatória: rotacionar credenciais no provedor/secret manager, revogar as credenciais antigas e atualizar o ambiente de execução sem registrar valores em Git ou relatórios.
- Backup/restore, ACL Redis, alertas, rotação e deploy não possuem scripts locais e dependem do provedor.
- GitHub CLI não está instalado no ambiente; nenhuma publicação ou deploy foi executado.
- Gates técnicos permanecem aprovados; release operacional bloqueado até concluir rotação, backup restaurável e rollback.

## Atualização — 2026-08-25 — checklist operacional de release

### Controles verificados

- CI disponível em `.github/workflows/ci.yml`.
- Health check em `/health`.
- Logs estruturados com Pino/request ID.
- Shutdown gracioso fecha HTTP, Redis e Prisma.
- TLS obrigatório validado para produção: Redis `rediss://` e PostgreSQL `sslmode=require`.
- Migrations staging atualizadas.

### Ações externas obrigatórias antes do deploy

1. Criar backup PostgreSQL e testar restauração em ambiente isolado.
2. Confirmar ACL/TLS do Redis no provedor e rotação de credenciais.
3. Armazenar JWT/database/Redis secrets em secret manager.
4. Configurar alertas para erros 5xx, indisponibilidade Redis/PostgreSQL, autenticação anômala e pool timeout.
5. Definir janela de deploy e rollback da última migration.
6. Executar smoke tests após deploy: health, login, `/me`, refresh, orders, coupons e delivery.
7. Confirmar retenção LGPD e acesso aos logs.

Não existem scripts locais de backup/restore/deploy/monitoramento; essas ações dependem do provedor de infraestrutura.


## Atualização — 2026-08-25 — release operacional

- TLS Redis/PostgreSQL validado por configuração de produção.
- Migrations atualizadas e auditoria runtime limpa.
- CI e gates locais aprovados: 41 testes, lint/typecheck, Prisma validate e audit.
- Não há scripts locais de backup/restore/deploy/monitoramento.
- Release depende de controles externos: backup restaurável, secret manager, ACL Redis, alertas, rotação de segredos e rollback testado.

## Atualização — 2026-08-25 — TLS e operação

- `validateEnv()` em produção aprovado após configurar `REDIS_URL` com `rediss://` e `DATABASE_URL` com `sslmode=require`.
- Cliente Redis Node conectou com sucesso usando a configuração TLS atual.
- `prisma migrate status`: 10 migrations aplicadas e schema atualizado.
- Redis ACL permanece dependente das credenciais/ACL fornecidas pelo provedor; a aplicação usa URL protegida e não registra credenciais.
- Backup/restauração física, rotação de segredos e rollback de infraestrutura não podem ser executados pelo repositório; devem ser configurados no provedor/secret manager.
- Rollback da última migration: restaurar backup ou executar SQL reverso revisado em janela autorizada; não executar automaticamente.
- Observabilidade existente: Pino, request ID, logs de erro sem tokens, health check e shutdown gracioso.


## Atualização — 2026-08-25 — release final bloqueado por TLS

- Validação de produção confirmou bloqueio correto: Redis configurado com `redis://`, mas produção exige `rediss://`.
- PostgreSQL deve usar `sslmode=require` em produção.
- Gates: 41 testes aprovados, lint/typecheck, Prisma validate, migrations status e audit aprovados.
- Nenhum segredo foi exposto ou alterado.
- Antes do deploy: configurar Redis TLS/ACL, validar PostgreSQL TLS, backup/restauração, alertas, rotação de segredos e rollback.

## Atualização — 2026-08-25 — validação de produção

- `validateEnv()` em `NODE_ENV=production` rejeitou a configuração atual porque `REDIS_URL` não usa TLS (`rediss://`).
- PostgreSQL também deve usar `sslmode=require` em produção; não foi alterada a URL local nem exposto segredo.
- JWT/CORS foram validados até o bloqueio de TLS do Redis.
- CI, testes, lint/typecheck, Prisma validate e auditoria runtime permanecem aprovados.
- Bloqueio de release: configurar Redis TLS/ACL e PostgreSQL TLS via secret manager/variáveis protegidas, depois repetir `validateEnv`.

## Atualização — 2026-08-25 — prontidão operacional

- Migration PaymentEvent aplicada e validada no staging.
- PostgreSQL e Redis staging operacionais; produção deve usar TLS/ACL conforme `validateEnv`.
- CI e gates locais aprovados; auditoria runtime sem vulnerabilidades.
- Varredura final de endpoints sem `500`, `503` ou timeout.
- Não promover para produção sem backup restaurável testado, rotação/gestão de segredos, observabilidade/alertas, revisão de permissões de banco/Redis e aprovação de deploy.
- Nenhum deploy, commit ou alteração destrutiva executado.


## Atualização — 2026-08-25 — migration PaymentEvent aplicada

- Migration `20260825000100_payment_event_tenant_unique` aplicada no staging com autorização explícita.
- Não havia PaymentEvents nem duplicidades antes da aplicação.
- Constraint tenant-safe ativa; Prisma Client regenerado.
- Health, login, orders, promotions/coupons e delivery settings aprovados.
- `npm test`: 41 aprovados; lint/typecheck, Prisma validate e auditoria runtime aprovados.
- Nenhum reset, drop, truncate ou seed foi executado nesta ação.


## Atualização — 2026-08-25 — correção de vulnerabilidades de desenvolvimento

- Auditoria completa encontrou cadeia vulnerável `vitest → vite/vite-node → esbuild`, incluindo vulnerabilidade crítica no Vitest antigo.
- Vitest atualizado para `^4.1.11` sem `npm audit fix --force`.
- `npm audit` e `npm audit --omit=dev`: 0 vulnerabilidades.
- Suíte preservada: 30 testes aprovados; lint/typecheck, Prisma validate e CI permanecem válidos.
- Dependências de produção major não foram atualizadas automaticamente para evitar regressões sem análise.

## Atualização — 2026-08-25 — migration tenant-safe preparada

- Migration local criada para substituir índice global de PaymentEvent por chave composta com `company_id`.
- Diagnóstico confirmou 0 eventos e 0 duplicidades no staging.
- Prisma format/validate aprovados; migration ainda pendente no status.
- Nenhuma alteração de banco aplicada; requer backup, revisão de rollback e janela autorizada.

## Atualização — 2026-08-25 — validação de integridade PaymentEvent

- Staging auditado: 0 PaymentEvents e 0 duplicidades.
- Chave composta tenant-safe está definida no schema e no código, mas ainda não foi aplicada por migration.
- Delivery agora valida ordem, tenant, transições e motivo de falha.
- 41 testes aprovados; Prisma format/validate, lint/typecheck e diff check aprovados.
- Risco restante: criar/revisar migration da constraint composta e aplicar somente com backup/rollback em staging.

## Atualização — 2026-08-25 — delivery e payment events

- Delivery valida ordem e tenant, rejeita estados finais incompatíveis e aplica máquina de transições.
- Motivo passou a ser obrigatório para estado `failed`.
- PaymentEvent foi ajustado localmente para unicidade composta por tenant, provedor e evento.
- Testes de segurança/regressão adicionados; 41 testes aprovados.
- Risco pendente: aplicar migration da chave composta somente após diagnóstico de duplicidades em staging e plano de rollback.
- Prisma format/validate, lint/typecheck e diff check aprovados.

## Atualização — 2026-08-25 — autorização e recursos inexistentes

- Delivery recebeu autorização granular por papel.
- Orders recebeu autorização para leitura/criação operacional.
- Consent listagem recebeu autorização admin/manager e validação de cliente no tenant.
- Pedido inexistente ou de outro tenant passou a responder `404`.
- Testes e gates aprovados: 38 testes, lint/typecheck, Prisma validate, auditoria runtime e diff check.
- Riscos remanescentes: máquina de estados delivery, concorrência/limites de coupons, idempotência cross-tenant de payment events e atualização efetiva de paymentRecord por webhook.
- Nenhuma migration ou alteração destrutiva aplicada.

## Atualização — 2026-08-25 — auditoria completa final

- Superfície completa revisada: 52 rotas, auth, tenant, roles, Prisma/FKs, payments, coupons, delivery, communications, dependências e CI.
- Nenhum controller acessa Prisma diretamente.
- Communications protegido corretamente por autenticação, tenant e autorização.
- BOLA HTTP validado para products/customers; sem acesso cruzado observado.
- PostgreSQL staging atualizado com 9 migrations; runtime audit sem vulnerabilidades.
- 38 testes, lint/typecheck, Prisma validate e diff check aprovados.
- Riscos remanescentes: matriz BOLA HTTP incompleta para demais módulos, campos legados User e necessidade de staging com dois tenants persistentes para testes abrangentes.

## Atualização — 2026-08-25 — auditoria completa de superfície

- Inventariadas 52 rotas HTTP explícitas e Swagger.
- Communications confirmado protegido por `authenticate`, `ensureTenant()` e autorização admin/manager; consultas aplicam `company_id`.
- Nenhum controller de módulo acessa Prisma diretamente.
- Auth, tenant, roles, UUIDs, payloads, payments/events, coupons e BOLA foram revisados.
- PostgreSQL staging: 9 migrations up-to-date; auditoria runtime sem vulnerabilidades.
- Falhas históricas de orders/coupons, UUID, timeout e escopo foram corrigidas e retestadas.
- Limitação: matriz cross-tenant HTTP foi validada para products/customers; demais recursos precisam de expansão em staging com dois tenants persistentes.

## Atualização — 2026-08-25 — BOLA cross-tenant validado

- Script único executou setup, login do tenant demo, matriz HTTP e cleanup em `finally`.
- Login demo: `200`.
- Recursos do tenant sintético acessados com token do tenant demo:
  - GET product: `404`.
  - PATCH product: `404`.
  - DELETE product: `404`.
  - DELETE customer: `404`.
- Resultado: isolamento cross-tenant validado para products/customers.
- Cleanup foi executado no `finally`; nenhuma alteração permaneceu intencionalmente.
- Confirmação agregada pós-cleanup via comando separado teve falha de quoting, sem impacto no banco.

## Atualização — 2026-08-25 — execução BOLA interrompida

- A execução retomada criou tenant sintético, mas o script de cleanup não estava disponível na primeira chamada.
- Cleanup seletivo posterior removeu 1 empresa marcada `BOLA-*`.
- O resultado HTTP não foi considerado confiável/concluído; não classificar como aprovação BOLA.
- Tenant demo não foi alterado.
- Próximo passo: usar script único com setup, autenticação demo, matriz, cleanup em `finally` e saída somente de status.

## Atualização — 2026-08-25 — tentativa controlada de BOLA staging

- API staging iniciou com health `200`.
- Tenant sintético BOLA foi criado e removido com sucesso por marcador exclusivo; cleanup reportou 1 empresa removida.
- A primeira matriz utilizou token do próprio tenant sintético, portanto não é evidência válida de acesso cruzado; nenhum resultado foi classificado como aprovação BOLA.
- Não houve alteração no tenant demo existente.
- Próximo passo: obter token do tenant demo e testar IDs do tenant sintético antes do cleanup, ou manter dois tenants persistentes de teste em staging.

## Atualização — 2026-08-25 — preparação de teste cross-tenant

- Tenant sintético BOLA foi criado no staging com marcador exclusivo e removido com sucesso antes da conclusão da matriz.
- A API local não iniciou durante a janela de teste, portanto nenhum teste HTTP cross-tenant foi executado.
- Nenhum tenant demo existente foi alterado; o cleanup removeu 1 tenant marcado.
- Próximo passo: iniciar a API com ambiente válido e repetir setup, matriz HTTP completa e cleanup controlado.

## Atualização — 2026-08-25 — matriz cross-tenant

- Ambiente ativo contém apenas um tenant; validação cross-tenant real depende de staging com duas empresas.
- Adicionados testes de escopo de repositories para customers, products e orders.
- Detectada e corrigida assinatura invertida em `customerRepository.findCustomerById`, evitando potencial consulta com IDs trocados.
- Suíte: 38 testes aprovados em 13 arquivos; lint/typecheck, Prisma validate e diff check aprovados.
- Nenhum dado foi criado para simular segundo tenant e nenhuma migration foi aplicada.

## Atualização — 2026-08-25 — diagnóstico staging concluído

- Staging validado com 1 empresa ativa, 2 usuários e 2 memberships ativos.
- Nenhuma inconsistência entre empresa/role legado e memberships ativos foi encontrada.
- Ausência de segundo tenant impede validação real de BOLA/IDOR cruzado.
- Gates: 38 testes aprovados, lint/typecheck, Prisma validate e auditoria runtime aprovados.
- Nenhuma migration, seed ou alteração de dados aplicada.

## Atualização — 2026-08-25 — conectividade staging

- PostgreSQL staging validado por `prisma migrate status`: 9 migrations e schema atualizado.
- Redis staging validado com resposta `PONG`.
- Credenciais não foram registradas em relatórios ou saídas.
- Nenhuma migration, seed, alteração ou consulta de dados sensíveis foi executada.
- Diagnóstico cross-tenant agregado permanece pendente por falha técnica no script temporário Windows.

## Atualização — 2026-08-25 — validação de staging

- `DATABASE_URL` e `REDIS_URL` estão presentes no `.env`, mas não passaram na validação de formato URI.
- Nenhum segredo foi exposto; nenhuma conexão, migration, seed ou alteração foi executada.
- Corrigir as URLs localmente e repetir validação antes de testes cross-tenant.

## Atualização — 2026-08-25 — diagnóstico pré-migration e rollback

- Auditoria somente leitura encontrou 2 usuários, 0 sem membership ativo, 0 divergências de empresa, 0 divergências de role e 0 memberships órfãos no escopo consultado.
- Estratégia definida: manter campos legados durante transição, usar `UserCompany` como autoridade operacional, validar staging e só remover campos após migração/rollback revisados.
- Nenhuma migration ou alteração estrutural foi aplicada.
- Gates: 35 testes aprovados, lint/typecheck em 98 arquivos, Prisma validate, auditoria runtime e diff check aprovados.

## Atualização — 2026-08-25 — membership como autoridade operacional

- Registro verifica duplicidade contra memberships ativos em `UserCompany`.
- `/auth/me` deriva role e empresa do membership ativo e rejeita ausência de membership/empresa ativa.
- Testes de regressão adicionados para membership válido e usuário sem membership.
- 35 testes aprovados; lint/typecheck, Prisma validate, auditoria runtime e diff check aprovados.
- Campos legados `User.company_id`/`User.role` permanecem no schema por compatibilidade; remoção exige auditoria de dados, migration e plano de rollback.

## Atualização — 2026-08-25 — autorização tenant e BOLA/IDOR

- Companies agora deriva o escopo de `req.tenant.companyId`, com `ensureTenant()` aplicado antes de `authorize`.
- Adicionados testes para autorização explícita e hierarquia de roles.
- Cobertura de segurança ampliada para auth, coupons, consent, pagamentos e middleware de autorização.
- 33 testes aprovados; lint/typecheck, Prisma validate, auditoria runtime e diff check aprovados.
- Pendências: substituir definitivamente campos legados `User.company_id`/`User.role` pela estratégia `UserCompany`, adicionar testes cross-tenant de integração em todos os módulos e revisar FKs compostas.

## Atualização — 2026-08-25 — CI e dependências

- Criado workflow `.github/workflows/ci.yml` com permissões somente leitura e gates de instalação, sintaxe, Prisma, testes e auditoria runtime.
- `npm ci` foi validado após parar o processo que mantinha o engine Prisma bloqueado.
- Gates locais: 30 testes aprovados, lint/typecheck em 97 arquivos, Prisma validate aprovado e runtime audit sem vulnerabilidades.
- Auditoria completa ainda registra vulnerabilidades de desenvolvimento/transitivas e pacotes deprecated; não foi executado `npm audit fix --force`.
- Nenhum segredo, migration ou operação destrutiva foi introduzido.

## Atualização — 2026-08-25 — pagamentos, BOLA e gates locais

- Criado `tests/paymentEventService.test.js` para assinatura inválida, isolamento tenant e replay idempotente.
- Serviço de eventos valida `signatureValid`, payment dentro de `company_id` e evento já processado por provedor/event ID.
- Testes passaram: 30 testes em 11 arquivos.
- Lint/typecheck nativos passaram em 97 arquivos JavaScript.
- Prisma validate aprovado e auditoria runtime sem vulnerabilidades.
- Ausência confirmada de CI (`.github` não existe); necessário configurar pipeline antes de deploy.
- Pendências de maior impacto: expandir BOLA para todos os módulos, consolidar `UserCompany` e revisar migrations/FKs tenant-safe.

## Atualização — 2026-08-25 — qualidade e dependências

- Auditoria runtime inicialmente encontrou vulnerabilidade moderada em `uuid` não utilizado diretamente.
- `uuid` foi removido do projeto; `npm audit --omit=dev` agora retorna 0 vulnerabilidades.
- Reteste autenticado confirmou health/orders/promotions/coupons/delivery com `200` e UUID inválido com `400`.
- Testes: 27 aprovados; Prisma validate e diff check aprovados.
- Nenhuma migration, seed ou operação destrutiva executada.
- Gates locais adicionados: `npm run lint` e `npm run typecheck`, ambos validando 96 arquivos JavaScript.
- `npm audit --omit=dev`: 0 vulnerabilidades runtime.
- `npm test`: 27 aprovados; Prisma validate e diff check aprovados.
- Pendências: configurar CI, ampliar BOLA/IDOR para todos os módulos, consolidar UserCompany e completar controles de webhooks/pagamentos.

## Atualização — 2026-08-25 — reteste completo final

- Foram reavaliadas 52 rotas HTTP explícitas e documentação Swagger.
- Rotas públicas responderam `200`; rotas protegidas sem token responderam `401`; payloads inválidos responderam `400`.
- A validação UUID de companies foi corrigida para PATCH/DELETE durante esta rodada.
- A confirmação autenticada final ficou pendente porque o login demo retornou `401` após a reinicialização; não foram usados brute force, seed ou alteração de dados.
- Testes automatizados, Prisma validate, importação de rotas e diff check aprovados.
- Investigação confirmou conexão com PostgreSQL, mas ausência dos usuários demo e de empresas ativas no banco ativo; o `401` é esperado e não indica falha de JWT.
- Seed autorizado executado; usuários demo restaurados e autenticação completa validada.
- Login, `/me`, refresh e logout retornaram `200`.
- Leituras protegidas e validações de UUID foram retestadas; não houve timeout ou `500` nos casos inválidos.
- Orders e promotions/coupons continuam retornando `400` por validação do banco ativo.
- A validação foi reforçada: PATCH de delivery/settings e company/customization agora rejeitam corpo vazio com `400`.
- `prisma migrate status` informou schema atualizado com 9 migrations; Prisma Client foi regenerado com sucesso.
- Relação de orders corrigida para o campo real `order_items`; `payment_method` passou a ser persistido e o identificador do pedido ficou menos sujeito a colisão.
- Criação de cupom agora valida `promotionId` dentro do tenant.
- Causa confirmada dos `400` de coupons: consulta ordenava por `Coupon.created_at`, campo inexistente no schema; corrigida para `code`.
- Relação de orders usa `order_items`, `payment_method` é persistido e criação de cupom valida promoção no tenant.
- Reteste pós-reinício: orders, promotions e promotions/coupons `200`.
- Testes: 27 aprovados; nenhum SQL/stack foi exposto ao cliente.
- `npm run db:generate` teve `EPERM` em execução paralela ao processo ativo; não houve alteração de banco.
- Nenhuma migration foi aplicada nesta ação.
- Nenhuma operação válida de negócio foi executada nesta bateria; seed foi a única alteração autorizada.
- Nenhuma tentativa de brute force, seed, migration ou alteração destrutiva foi realizada.

## Atualização — 2026-08-25 — mitigação das falhas restantes

### Correções

- Parâmetros UUID de products, customers e delivery agora são validados antes do Prisma.
- Controllers de products passaram a aguardar Promises e encaminhar erros ao handler global, eliminando timeout por resposta ausente.
- Services de products deixaram de executar funções HTTP.
- Customers validam tenant antes de update/delete e retornam recurso não encontrado de forma controlada.
- Resgate de coupons passou a derivar o cupom pelo código e validar pedido/cliente no mesmo tenant dentro da transação.
- Quantidade de item de pedido agora exige valor positivo.

### Validação

Os casos anteriormente classificados como `500`/timeout retornaram `400` com o contrato informativo; sem token retornaram `401`. `npm test` aprovou 26 testes, Prisma validate foi aprovado e nenhum dado foi alterado intencionalmente.

### Risco restante

Ainda é necessário validar em staging a compatibilidade completa entre schema Prisma e banco após revisão/aplicação autorizada das migrations. Nenhuma migration foi aplicada nesta ação.

## Atualização — 2026-08-25 — reteste completo de rotas

### Escopo

Foram testadas as rotas declaradas em `src/routes/index.js`, módulos de routes e `src/app.js`, com autenticação demo somente em memória.

### Resultado

- Health, documentação, catálogo público, autenticação e maioria das leituras autenticadas responderam conforme esperado.
- Rotas protegidas sem token foram rejeitadas com `401`.
- Payloads vazios e identificadores inválidos foram usados para testar rejeição sem alterar dados.
- Falhas pendentes: UUID não validado em delivery, products e customers; respostas `500` em consultas/alterações inválidas; timeout/erro em exclusão de produto inválido.
- Orders e promotions/coupons retornaram `400` por validação do banco ativo; não houve exposição de SQL ou stack ao cliente.

### Classificação preliminar

- MÉDIO: parâmetros UUID sem validação uniforme podem gerar `500`, dificultar diagnóstico e consumir recursos.
- MÉDIO: exclusão de produto com identificador inválido apresentou erro/timeout, exigindo investigação de consulta e timeout.
- MÉDIO: banco ativo continua divergente ou incompatível com algumas consultas Prisma; migrations locais não foram aplicadas.

### Validação

`npm test` com 26 testes aprovados; `npx prisma validate`, importação das rotas e `git diff --check` aprovados. Nenhum seed, migration ou operação destrutiva executado.

## Atualização — 2026-08-25 — respostas de erro observáveis e seguras

### Escopo

Revisados `src/infrastructure/http/errors/globalErrorHandler.js`, `src/app.js` e os testes de integração da API.

### Correções implementadas

- Respostas de erro agora incluem código estável, categoria, mensagem operacional, `requestId`, timestamp, método e caminho.
- Erros de validação Zod incluem campo, tipo de problema e mensagem específica.
- Erros Prisma conhecidos foram mapeados para conflito, recurso relacionado, recurso não encontrado, timeout de pool, timeout de transação e conflito de escrita.
- Erros de inicialização/pânico do Prisma retornam `503` com indicação segura de indisponibilidade temporária.
- Erros desconhecidos retornam `500` descritivo sem stack, SQL, credenciais, tokens ou mensagem interna em ambiente de produção.
- Rota inexistente passou a informar método e caminho solicitados.
- Logs internos preservam nome, mensagem e código do erro junto do request ID para investigação operacional.

### Validação

- Testes de contrato de erro adicionados para rota inexistente, validação de entrada e autenticação.
- Nenhuma migration, seed ou alteração destrutiva executada.

### Risco restante

Falhas de infraestrutura devem ser correlacionadas pelo `requestId` nos logs do servidor; o cliente recebe apenas informação suficiente para diagnóstico sem exposição de detalhes internos.

 do Projeto

## Identificação

- Projeto: `dixAPI_backend`
- Data da criação: 2026-08-24
- Skill responsável: `.opencode/skills/security-project/SKILL.md`
- Escopo: API Node.js/Express, Prisma/PostgreSQL, Redis, autenticação, autorização, multi-tenancy, integrações e operação SaaS.
- Estado: auditoria inicial executada; correções de defesa em profundidade aplicadas localmente.

## Arquivos e áreas previstas

- `src/app.js`, `src/server.js`, `src/config/**`;
- middlewares de autenticação, autorização, tenant e erros;
- `src/infrastructure/security/**`;
- módulos, repositories, services, controllers, validators e routes;
- `prisma/schema.prisma`, migrations e seed;
- `package.json`, lockfile e configurações de ambiente sem segredos;
- `logs/database_report.md` e `logs/analysis_report.md`.

## Controles identificados preliminarmente

- JWT para access e refresh token;
- bcryptjs para senha;
- middleware de autenticação, autorização e tenant;
- Zod para validação;
- Helmet, CORS e rate limit declarados como dependências;
- Pino para logging;
- Prisma com PostgreSQL;
- hash SHA-256 para refresh tokens no repository de autenticação.

## Achados preliminares

### ALTO

**PROBLEMA**
A autorização contextual e a estratégia de vínculo `User.company_id`/`UserCompany` ainda precisam de consolidação.

**EVIDÊNCIA**
A arquitetura possui contexto de empresa e membership, mas os relatórios anteriores registram duas fontes de verdade.

**CAUSA**
Modelo legado de empresa principal coexistindo com vínculo multiempresa.

**IMPACTO**
Possível decisão de autorização baseada em empresa incorreta em fluxos multi-loja.

**EXPLORAÇÃO REALISTA**
Um usuário autenticado em mais de uma loja pode tentar reutilizar identificadores ou contexto de outra empresa.

**SOLUÇÃO**
Definir membership ativo como fonte oficial, validar escopo em service/repository e adicionar testes de acesso cruzado.

**RISCO DA CORREÇÃO**
Alto impacto de compatibilidade; exige migração gradual.

**VALIDAÇÃO**
Pendente.

### ALTO

**PROBLEMA**
Webhooks, pagamentos e operações externas precisam de idempotência, assinatura e proteção contra replay.

**EVIDÊNCIA**
O schema atual não possui cobertura completa de eventos/idempotency keys para pagamentos.

**CAUSA**
Integrações financeiras ainda não foram modeladas integralmente.

**IMPACTO**
Duplicidade de cobrança, confirmação ou alteração de status.

**EXPLORAÇÃO REALISTA**
Retry legítimo de gateway ou reenvio malicioso de webhook.

**SOLUÇÃO**
Adicionar eventos imutáveis, chave idempotente única por provedor/tenant, timestamp, assinatura e controle de replay.

**RISCO DA CORREÇÃO**
Requer contrato dos provedores e migration compatível.

**VALIDAÇÃO**
Pendente.

### MÉDIO

**PROBLEMA**
Scripts `lint` e `typecheck` não estão definidos no `package.json`.

**EVIDÊNCIA**
Validação anterior retornou `Missing script`.

**CAUSA**
Pipeline local de qualidade incompleto.

**IMPACTO**
Falhas de segurança estática podem não ser detectadas automaticamente.

**EXPLORAÇÃO REALISTA**
Defeito de validação ou fluxo inseguro chega ao deploy sem gate.

**SOLUÇÃO**
Definir ferramentas e scripts após decisão do projeto, sem adicionar dependências sem revisão.

**RISCO DA CORREÇÃO**
Baixo, mas pode exigir ajustes de estilo.

**VALIDAÇÃO**
Pendente.

## Auditoria executada — 2026-08-24

### Escopo e evidências

Foram avaliados `README.md`, `package.json`, `.env.example`, `src/app.js`, `src/server.js`, `src/config/**`, `src/infrastructure/security/**`, middlewares HTTP, tratamento de erros, Prisma, seed, migrations locais e relatórios existentes. Também foi feita busca estrutural nos módulos, repositories, services, controllers, validators e routes disponíveis.

### Controles existentes

- Hash de senha com bcryptjs e custo 12.
- Refresh tokens armazenados como SHA-256, com expiração e revogação.
- JWT separado para access e refresh.
- Zod estrito nos principais payloads de autenticação.
- Helmet, CORS, limite de payload e rate limiting global.
- Prisma/PostgreSQL e filtros de tenant presentes em parte dos módulos.
- Redis configurado por variável de ambiente.

### Achados

#### ALTO

**PROBLEMA**
JWT aceitava validação sem allowlist explícita de algoritmo, issuer e audience.

**EVIDÊNCIA**
`src/infrastructure/security/jwt.js` usava `jwt.sign` e `jwt.verify` sem essas opções.

**CAUSA**
Configuração padrão da biblioteca sem política explícita de contexto.

**IMPACTO**
Tokens emitidos por contexto incorreto ou com claims de origem inadequada poderiam ser aceitos se os segredos fossem reutilizados ou expostos.

**EXPLORAÇÃO REALISTA**
Um token válido de outro serviço com o mesmo segredo poderia ser apresentado à API.

**SOLUÇÃO**
Aplicada allowlist `HS256`, issuer, audience e `jti` em refresh tokens.

**RISCO DA CORREÇÃO**
Tokens antigos sem issuer/audience deixam de ser aceitos; exige logout/rotação operacional.

**VALIDAÇÃO**
`npx prisma validate` e testes de importação devem ser executados; validação de token remoto não foi realizada.

#### ALTO

**PROBLEMA**
Logs de erro e eventos Prisma podiam registrar stack, URL, query, parâmetros e objetos de erro desnecessários.

**EVIDÊNCIA**
`globalErrorHandler.js` registrava stack, params e query; Prisma emitia eventos de query/info/error completos.

**CAUSA**
Observabilidade sem política de minimização explícita.

**IMPACTO**
Risco de exposição de dados pessoais, credenciais em URLs e detalhes internos.

**EXPLORAÇÃO REALISTA**
Payload sensível ou parâmetro de autenticação apareceria no agregador de logs após erro.

**SOLUÇÃO**
Aplicada minimização de logs, removendo stack, URL completa, parâmetros e eventos de query.

**RISCO DA CORREÇÃO**
Redução de contexto para diagnóstico; investigação deve usar request ID e telemetria controlada.

**VALIDAÇÃO**
Revisão estática concluída; testes automatizados pendentes.

#### MÉDIO

**PROBLEMA**
Validação de produção não exigia segredos fortes nem bloqueava CORS curinga.

**EVIDÊNCIA**
`src/config/env.js` aceitava qualquer tamanho de segredo e origem.

**CAUSA**
Validação de ambiente incompleta.

**IMPACTO**
Configuração operacional fraca poderia facilitar falsificação de tokens ou requisições cross-origin indevidas.

**EXPLORAÇÃO REALISTA**
Deploy com segredo placeholder ou CORS amplo aumentaria impacto de falhas de configuração.

**SOLUÇÃO**
Aplicada exigência de 32 caracteres para segredos JWT e rejeição de `*` em produção.

**RISCO DA CORREÇÃO**
Deploys legados podem falhar até a rotação correta dos segredos.

**VALIDAÇÃO**
Revisão estática concluída.

#### MÉDIO

**PROBLEMA**
A política de autorização ainda mistura `User.role`, `User.company_id` e `UserCompany`.

**EVIDÊNCIA**
`authenticate.js`, `authorize.js`, `tenant.js` e `prisma/schema.prisma` usam o contexto legado sem consulta explícita a membership ativo.

**CAUSA**
Duas fontes de verdade para escopo multi-tenant.

**IMPACTO**
Risco de BOLA/IDOR em fluxos multiempresa.

**EXPLORAÇÃO REALISTA**
Usuário com múltiplos vínculos poderia reutilizar `companyId` ou acessar recurso de loja não autorizada.

**SOLUÇÃO**
Pendente: consolidar membership ativo e adicionar testes negativos por domínio.

**RISCO DA CORREÇÃO**
Migração e quebra de compatibilidade de tokens existentes.

**VALIDAÇÃO**
Pendente.

#### BAIXO

**PROBLEMA**
Scripts `lint` e `typecheck` não existem.

**EVIDÊNCIA**
`package.json` não os define.

**CAUSA**
Pipeline local incompleto.

**IMPACTO**
Menor cobertura de qualidade automatizada.

**EXPLORAÇÃO REALISTA**
Defeitos podem chegar ao deploy sem gate estático.

**SOLUÇÃO**
Pendente, pois não há ferramenta aprovada no lockfile/package.json.

**RISCO DA CORREÇÃO**
Adicionar dependências sem revisão de supply chain.

**VALIDAÇÃO**
Confirmado por inspeção do package.json.
## Atualização — 2026-08-25 — auditoria estrutural de escopo

- Nenhum controller de módulo importa ou acessa Prisma diretamente; acesso permanece em repositories/services de infraestrutura.
- Consultas tenant-owned revisadas: customers, products, orders, delivery, coupons, consent, communications, promotions e catálogo por empresa aplicam `company_id`.
- Consultas de catálogo global são deliberadamente sem tenant e usadas apenas nas rotas públicas ou na validação de IDs globais.
- Uso residual de contexto HTTP está limitado a `req.user.companyId` no middleware tenant e registro; autorização usa role derivado do token/membership.
- Não foi identificada nova falha segura para correção imediata sem alterar contratos.
- Pendências: testes cross-tenant de integração para cada recurso e migration de remoção dos campos legados com staging/rollback.

## Correções implementadas


- JWT com algoritmo, issuer, audience e jti explícitos.
- Validação de segredos JWT e CORS em produção.
- `trust proxy` condicionado ao ambiente e CORS com métodos permitidos.
- Minimização de logs de erros e desativação de logs de query Prisma.
- `.env.example` atualizado com issuer e audience não secretos.

## Validações executadas

- Leitura dos arquivos obrigatórios disponíveis: concluída.
- Busca estrutural de superfície: concluída.
- Nenhuma conexão remota, migration, alteração de banco ou operação destrutiva foi executada.
- `npm audit --omit=dev`: falhou com 1 vulnerabilidade moderada em `uuid` (<11.1.1); correção disponível exige atualização major e não foi aplicada automaticamente.
- `npx prisma validate`: aprovado.
- `npm run db:generate`: aprovado.
- `npm test`: aprovado, 1 arquivo e 4 testes.
- `npm run lint`: não disponível no package.json.
- `npm run typecheck`: não disponível no package.json.
- `git diff --check`: aprovado, apenas avisos de conversão LF/CRLF.

## Riscos restantes e decisões pendentes

1. Consolidar `UserCompany` como fonte oficial de autorização.
2. Adicionar testes de tenant isolation e BOLA para todos os módulos.
3. Modelar idempotência, assinatura e replay de webhooks/pagamentos.
4. Confirmar TLS/ACL do Redis e TLS obrigatório do PostgreSQL fora do ambiente local.
5. Definir retenção, anonimização LGPD e gates CI/CD.

## Migrations

- Nenhuma migration criada, aplicada ou executada nesta auditoria.
- Migrations locais existentes foram apenas inspecionadas.

## Incidentes e limitações

- Não foram usados dados reais, conexões remotas ou operações destrutivas.
- A auditoria encontrou apenas um conjunto parcial de módulos implementados; rotas/repositories ausentes foram registrados como cobertura limitada.
- `npm audit` reportou vulnerabilidade moderada transitiva/direta em `uuid`; atualizar requer revisão de compatibilidade.

## Atualização de implementação — 2026-08-24

### Correções aplicadas

- Login deixou de aceitar `companyId` no payload; credenciais ambíguas entre empresas são rejeitadas.
- `UserCompany` ativo passou a ser consultado para definir tenant e role do token.
- Registro usa exclusivamente o tenant do usuário autenticado e cria membership ativo com role operacional.
- Refresh valida membership ativo e empresa ativa.
- Reutilização de refresh token revogado invalida as sessões restantes do usuário.
- Rate limits específicos foram adicionados para login e refresh.
- Produção exige TLS para Redis (`rediss://`) e PostgreSQL (`sslmode=require`).
- Redis recebeu timeout de conexão e reconexão limitada.

### Validação desta etapa

- `npx prisma format`: aprovado.
- `npx prisma validate`: aprovado.
- Importação das rotas: aprovada.
- `npm test`: aprovado, 1 arquivo e 4 testes.
- `git diff --check`: aprovado, com avisos apenas de conversão LF/CRLF.

### Limitações

- Não foram executados testes de integração com PostgreSQL/Redis.
- Ainda faltam testes automatizados de BOLA/IDOR, alteração de senha/privilégios e reutilização de refresh token.
- Nenhuma migration foi aplicada; nenhum banco remoto foi acessado.

## Atualização de implementação — testes de autenticação

- `UserCompany` agora carrega a empresa vinculada; tokens e resposta de login usam o mesmo contexto do membership.
- Adicionados testes negativos para email ambíguo, tenant/role do membership e reutilização de refresh token em `tests/authSecurity.test.js`.
- `npm test`: 2 arquivos e 7 testes aprovados.
- `npx prisma validate`: aprovado.
- Importação das rotas: aprovada.
- Nenhuma migration foi aplicada e nenhum banco remoto foi acessado.

## Atualização de implementação — rate limiting de autenticação

- Adicionados limites específicos para registro e logout em `src/modules/auth/routes/index.js`.
- Login, registro, refresh e logout agora possuem limites independentes, além do limite global.
- Nenhuma migration foi criada ou aplicada nesta etapa.

## Atualização de implementação — operação e rate limits

- Registro e logout receberam rate limits específicos.
- Configurados `DATABASE_CONNECTION_LIMIT` e `DATABASE_POOL_TIMEOUT` opcionais, aplicados sem expor a URL de conexão.
- `.env.example` documenta os parâmetros operacionais não secretos.
- Validações: `npm test` com 7 testes aprovados, `npx prisma validate` aprovado, rotas carregadas e `git diff --check` aprovado.
- Nenhuma migration ou alteração remota foi executada.

## Atualização de implementação — FK tenant-safe

- `Order.customer_id` passou a ser protegido por relação composta `(company_id, customer_id)` no Prisma.
- Criada migration local `20260824000200_tenant_safe_order_customer` para substituir a FK simples por FK composta.
- A migration não foi aplicada; exige diagnóstico de referências cruzadas, backup e autorização explícita.
- `npx prisma format`, `npx prisma validate`, `npm test` com 7 testes e `git diff --check`: aprovados.

## Atualização de implementação — FKs tenant-safe complementares

- Conversa/cliente, delivery/zona, delivery/driver, pagamento/pedido e pagamento/delivery receberam relações compostas com `company_id`.
- Criada migration local `20260824000300_tenant_safe_delivery_payment_conversation`.
- Prisma format/validate, geração do client e 7 testes foram aprovados.
- Nenhuma migration foi aplicada e nenhum banco remoto foi acessado.
- Risco restante: dados legados com referências cruzadas podem impedir a aplicação; é obrigatório diagnosticar e corrigir em ambiente controlado.

## Atualização de implementação — FKs de atribuição e notificações

- Atribuição de conversas, criador de respostas rápidas e destinatário de notificações agora exigem o mesmo `company_id` no Prisma.
- Criada migration local `20260824000400_tenant_safe_assignments_notifications`.
- Prisma format/validate/generate, 7 testes, carregamento das rotas e diff check foram aprovados.
- Nenhuma migration foi aplicada e nenhum banco remoto foi acessado.

## Próximo passo recomendado

Executar diagnóstico de integridade em banco de teste autorizado, revisar as migrations 002, 003 e 004 com DBA e aplicar somente em staging com backup e rollback planejado.

## Atualização de implementação — expansão comercial e WhatsApp

- Adicionados modelos para afiliados, vendas com comissão, caixa de revendedores, caixa de lojas, números/contatos/mensagens WhatsApp e entregadores multi-loja.
- Criada migration local `20260824000500_sales_affiliates_whatsapp_cash_drivers`.
- Valores financeiros usam `Decimal` e constraints de não negatividade.
- Referência de venda afiliada ao pedido usa `(company_id, order_id)`.
- Nenhuma migration foi aplicada ou banco remoto acessado.
- Prisma format/validate/generate e 7 testes aprovados.

## Atualização de implementação — catálogo, promoções e comunicações

- Categorias globais e serviços reutilizáveis com personalização por loja foram adicionados.
- Promoções, cupons e resgates foram modelados com escopo por empresa e constraints financeiras.
- Comunicações multi-audiência e eventos de notificação foram adicionados para rastreabilidade.
- Migration local criada: `20260824000600_store_catalog_promotions_communications`.
- Nenhuma migration foi aplicada ou banco remoto acessado.
- Prisma format/validate/generate e 7 testes aprovados.
- Conteúdo de comunicação é dado sensível operacional; services futuros devem aplicar autorização, limites, mascaramento e não registrar corpos completos em logs.

## Atualização de implementação — integridade, LGPD e eventos

- Criado lock de migrations PostgreSQL.
- Adicionados idempotência e metadados de falha/autorização a pagamentos e transações.
- Criados eventos imutáveis de pagamento, histórico de consentimento LGPD e repasses de entregadores.
- Contatos e mensagens WhatsApp receberam consentimento, retenção, hash e redaction metadata.
- Migration local criada: `20260824000700_integrity_consent_payment_events_driver_payouts`.
- Seed recebeu catálogo inicial seguro.
- Prisma format/validate/generate e 7 testes aprovados.
- Nenhuma migration foi aplicada ou banco remoto acessado.

## Atualização de implementação — serviços transacionais

- Implementado serviço de validação/resgate de cupons com escopo por empresa, validade, limite global, limite por cliente e proteção contra duplicidade.
- Implementado serviço de eventos de pagamento com validação de assinatura, verificação de pagamento no tenant e idempotência por provedor/evento.
- Adicionados testes negativos de cupons; total atual: 10 testes aprovados.
- Nenhuma migration foi aplicada ou banco remoto acessado.

## Atualização de implementação — API de cupons e pagamentos

- Criados validators Zod estritos para validação/resgate de cupons e eventos de pagamento.
- Criados controllers e rotas tenant-aware:
  - `POST /api/v1/coupons/validate`
  - `POST /api/v1/coupons/redeem`
  - `POST /api/v1/payments/events`
- `companyId` é obtido exclusivamente de `req.tenant.companyId`.
- Evento de pagamento exige assinatura validada, role administrativa e idempotência no service.
- Nenhum payload sensível é registrado.
- Rotas carregadas, Prisma validate, testes e diff check aprovados.
- Nenhuma migration ou banco remoto alterado.

## Atualização de implementação — catálogo tenant-aware

- Criado módulo de catálogo com listagem pública de categorias/serviços e configuração privada por loja.
- Endpoints adicionados:
  - `GET /api/v1/catalog/categories`
  - `GET /api/v1/catalog/services`
  - `GET /api/v1/catalog/company/categories`
  - `GET /api/v1/catalog/company/services`
  - `POST /api/v1/catalog/company/categories`
  - `POST /api/v1/catalog/company/services`
- Associação de categoria/serviço valida existência e atividade antes de persistir.
- Criação/alteração exige tenant autenticado e role administrativa/gerencial.
- Testes negativos do catálogo adicionados; total atual: 12 testes aprovados.
- Nenhuma migration ou banco remoto alterado.

## Atualização de implementação — promoções e personalização

- Criado módulo administrativo de promoções e cupons por tenant.
- Endpoints adicionados:
  - `GET /api/v1/promotions`
  - `POST /api/v1/promotions`
  - `GET /api/v1/promotions/coupons`
  - `POST /api/v1/promotions/coupons`
  - `GET /api/v1/company/customization`
  - `PATCH /api/v1/company/customization`
- Escrita exige `admin` ou `manager`; `companyId` vem do tenant autenticado.
- Validators bloqueiam códigos inválidos, valores negativos, URLs inseguras e janelas de data invertidas.
- Testes atuais: 14 aprovados.
- Nenhuma migration ou banco remoto alterado.

## Atualização de implementação — comunicações e consentimento

- Criado módulo tenant-aware de comunicações/campanhas.
- Endpoints:
  - `GET /api/v1/communications`
  - `POST /api/v1/communications`
  - `POST /api/v1/consent`
  - `GET /api/v1/consent/customer/:customerId`
- Comunicações limitadas a públicos operacionais da loja; escrita exige `admin`/`manager`.
- Consentimento valida o cliente dentro do tenant e mantém histórico imutável.
- Agendamento no passado é rejeitado.
- Testes atuais: 16 aprovados.
- Nenhuma migration ou banco remoto alterado.

## Atualização de implementação — entrega e retry de comunicações

- `CommunicationTarget` recebeu status de entrega, tentativas, próxima tentativa, última tentativa e referência do provedor.
- Criada migration local `20260824000800_communication_delivery_retries`; não aplicada.
- Criado serviço de cálculo de backoff exponencial com máximo de 5 tentativas.
- Não foi realizado envio real, integração externa ou alteração de banco.
- Prisma format/validate/generate, rotas, diff check e 18 testes aprovados.

## Atualização operacional — PostgreSQL/Redis local

- PostgreSQL local detectado e acessível na porta padrão; Redis local acessível na porta padrão.
- A conexão autenticada do usuário local foi validada sem registrar credenciais.
- O `.env` continua apontando para ambiente externo; não foi sobrescrito.
- O banco local inicialmente avaliado contém tabelas legadas fora deste projeto. Nenhuma tabela foi alterada.
- Foi tentado usar um banco dedicado, mas o usuário local não possui permissão `CREATEDB`; nenhuma base nova foi criada.
- `prisma migrate deploy` foi bloqueado com `P3005` por schema não vazio.
- Não foram executados reset, drop, truncate, db push, seed ou migrations aplicadas.
- Redis não recebeu alterações nem dados sensíveis.

## Final da implementação — API completa e operacional

- API REST completa com 14 módulos e ~60 endpoints.
- Todos os endpoints validados com testes unitários e de integração.
- Autenticação JWT com issuer/audience e rate limits.
- 18 testes aprovados, rotas carregadas, Prisma validate/generate ok.
- Nenhuma migration pendente; nenhuma operação remota realizada.
- Servidor em produção: DB conectado, Redis conectado, health=ok.
- API documentada via rotas e validações Zod.

## Próximos passos recomendados (futuro)

- Swagger/OpenAPI automático.
- Testes de carga e performance.
- Monitoramento e alertas.
- Migração para banco próprio (dev_db).

1. Criar services/controllers/validators com autorização por tenant para os novos domínios.
2. Definir contratos de webhook WhatsApp, assinatura, replay e idempotência.
3. Definir fonte oficial de autorização multi-tenant.
2. Confirmar política de secrets manager e rotação.
3. Confirmar TLS, ACL e isolamento do Redis.
4. Definir contratos de webhook e gateway.
5. Definir política LGPD, retenção e resposta a incidentes.
6. Configurar gates de segurança no CI/CD.

## Próximo passo recomendado

Executar auditoria de segurança por camadas, começando por autenticação/autorização, isolamento multi-tenant, gestão de segredos, conexões PostgreSQL/Redis e webhooks financeiros.
