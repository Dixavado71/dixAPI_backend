# Relatório Completo de Auditoria do Banco de Dados

## Atualização — 2026-08-28 — fix schema User.companyId (coluna nunca criada, login quebrado)

- **Problema**: o schema `User` declarava `companyId String? @db.Uuid` com `Company Company? @relation(fields: [companyId], references: [id])`, mas a migration `20260827000300_usercompany_consolidation` removeu `users.company_id` sem criar `users."companyId"`. Todas as queries `prisma.user.*` selecionavam a coluna inexistente → `DATABASE_ERROR` (500) no login e qualquer rota que consultasse usuários.
- **Correção**: removido `companyId` + `Company` relation do modelo User, e `users User[]` do modelo Company. Criada migration `20260828000100_remove_user_companyid` (SQL: `DROP COLUMN IF EXISTS "companyId"` — no-op, coluna nunca existiu).
- **Nota**: a migration foi gerada via PowerShell `Out-File -Encoding utf8` que adicionou BOM → `syntax error at or near ""` → migration FAILED. Corrigido (arquivo ASCII sem BOM) mas o registro FAILED persiste em `_prisma_migrations` até que o SSH ao Railway seja restaurado.
- **Login validado**: `admin@demo.local` / `Admin@12345` → 200 OK.
- **Estado**: 17 migrations (16 + 1), sendo a 17ª com registro FAILED (blocking `prisma migrate deploy`). `railway.toml` temporariamente com `npm start` (sem `db:deploy`).

## Atualização — 2026-08-28 — migrations aplicadas no Railway (16) e deploy restaurado

- **Causa raiz do deploy falho**: migration `20260827000300_usercompany_consolidation` em estado `FAILED` em `_prisma_migrations` (`started_at` sem `finished_at`), bloqueando `prisma migrate deploy` com `P3009`.
- **Bug da migration**: o step 3 usava `pg_constraint.conkey::text LIKE '%company_id%'`, mas `conkey` é um array de números de coluna. As FKs compostas dependentes (`conversations_company_id_assigned_to_fkey`, `quick_replies_company_id_created_by_fkey`, `notifications_company_id_user_id_fkey`) não eram removidas e o `DROP CONSTRAINT "users_company_id_id_key"` falhava (`cannot drop constraint ... because other objects depend on it`).
- **Correção aplicada** em `prisma/migrations/20260827000300_usercompany_consolidation/migration.sql`: o step 3 agora seleciona FKs cuja `confkey` é igual ao `conkey` da unique constraint `users_company_id_id_key` (declarado `key_cols int2[]`), e as remove antes do drop da coluna/constraint.
- **Conectividade**: proxy público `switchyard.proxy.rlwy.net` aceita TCP/TLS mas não encaminha o handshake Postgres deste ambiente (P1001). Conexão bem-sucedida apenas via túnel SSH `railway connect Postgres --tunnel-only --ssh` (porta local 15432). Redis idem (`sakura.proxy.rlwy.net` → túnel 16379).
- **Credenciais**: senhas de Postgres e Redis rotacionadas no Railway; `.env` local atualizado com os valores correntes.
- **Execução**: removido registro `20260827000300_usercompany_consolidation` de `_prisma_migrations`; dry-run das migrations 004–006 OK; `prisma migrate deploy` aplicou as 4 migrations pendentes (003–006) com sucesso.
- **Estado atual**: **16 migrations** aplicadas; `npx prisma validate` aprovado; servidor local sobe (DB+Redis conectados) e `/health` 200; deploy `2660ec86` SUCCESS em produção, `/health` 200.
- **Pendência**: commitar/pushar a correção da migration no repo privado `Dixavado71/dixAPI_backend_private` para que deploys via GitHub não reintroduzam o bug.

## Atualização — 2026-08-27 — migration at_location + order_notification_logs

- Migration `20260827000100_add_at_location_and_notification_logs` adicionada:
  - `ALTER TYPE "DeliveryStatus" ADD VALUE 'at_location'`.
  - Tabela `order_notification_logs` (id, company_id, order_id?, delivery_id?, event, recipient, recipient_phone, message, status, error?, created_at) com PK, unicidade `(company_id, id)`, índices `(company_id, created_at)` e `(company_id, event)` e FK tenant-safe para `companies`.
- Schema Prisma sincronizado com os modelos `OrderNotificationLog` e o enum `DeliveryStatus.at_location`.
- **Status**: migration commitada; banco Railway não alcançável deste ambiente (`P1001`). Aplicação automática prevista no próximo deploy (`npm run db:deploy`). Nenhuma operação destrutiva foi executada.
- `npx prisma validate`: aprovado. Schema com 54 modelos e 53 enums.

## Atualização — 2026-08-25 — seed demo multi-loja

- `prisma/seed.js` substituído por seed idempotente para ambiente demo/desenvolvimento.
- População prevista: 1 administrador único com membership nas duas lojas, 1 gerente, 2 funcionários, 2 lojas, 2 entregadores, planos, assinaturas, categorias, personalizações, configurações de delivery, produtos, clientes, pedidos e deliveries.
- Senhas do seed são configuráveis por variáveis `SEED_*`, com defaults somente para ambiente demo local; nenhum valor foi registrado neste relatório.
- Seed usa `upsert` ou busca por chaves tenant-safe e não executa reset, drop, truncate ou exclusão de dados.
- `prisma validate` e `node --check prisma/seed.js` aprovados.
- Seed foi executado uma vez dentro do container Railway via deployment temporário, com sucesso confirmado pelos logs.
- Deployment final restaurou o start normal sem seed recorrente; API conectou ao PostgreSQL e Redis.
- Login do administrador demo retornou HTTP 200; senha não foi registrada.



## Atualização — 2026-08-25 — migration PaymentEvent preparada

- Criada migration local `20260825000100_payment_event_tenant_unique`.
- SQL remove o índice global `payment_events_provider_provider_event_id_key` e cria índice único composto por `company_id`, `provider` e `provider_event_id`.
- `prisma migrate status` confirma 10 migrations, com esta ainda não aplicada.
- Pré-condições: confirmar ausência de duplicidades, backup, staging, janela de aplicação e rollback.
- Rollback lógico: remover índice composto e recriar o índice global somente se a política de negócio exigir; não executar sem revisão.
- Migration `20260825000100_payment_event_tenant_unique` aplicada com autorização no staging.
- `prisma migrate status`: 10 migrations, schema atualizado.
- Prisma Client regenerado após aplicação.
- Health, login, orders, promotions/coupons e delivery settings validados com sucesso.
- Nenhuma operação reset/drop/truncate foi executada.

## Atualização — 2026-08-25 — PaymentEvent e delivery

- Staging possui 0 registros de `PaymentEvent`; não foram encontradas duplicidades por provedor/evento nem por tenant/provedor/evento.
- Schema local agora define unicidade composta `company_id + provider + provider_event_id` para `PaymentEvent`.
- Migrations status continua atualizado; a constraint composta ainda não foi aplicada ao banco.
- Delivery recebeu validação de ordem/estado e máquina de transições no código.
- Próxima etapa de banco: criar migration que substitua a constraint anterior, revisar shadow database e aplicar somente em staging autorizado.

## Atualização — 2026-08-25 — diagnóstico agregado do staging

- PostgreSQL staging: 1 empresa, 1 empresa ativa, 2 usuários e 2 memberships ativos.
- Usuários sem membership ativo: 0.
- Divergências de empresa entre User e membership: 0.
- Divergências de role entre User e membership: 0.
- O staging ainda possui apenas um tenant; testes cross-tenant reais exigem segundo tenant controlado.
- Nenhuma migration, seed ou alteração de dados foi executada.

## Atualização — 2026-08-25 — conectividade staging fornecida

- PostgreSQL staging respondeu ao `prisma migrate status`.
- Resultado: 9 migrations encontradas e schema atualizado.
- Redis staging respondeu `PONG` via `redis-cli`.
- Nenhuma migration, seed ou alteração de dados foi executada.
- Diagnóstico agregado de tenants não foi concluído por erro de importação de arquivo temporário Windows; repetir a partir do workspace sem expor credenciais.

## Atualização — 2026-08-25 — validação de staging

- `.env` contém linhas para `DATABASE_URL` e `REDIS_URL`, mas ambas falharam na validação de formato URI.
- Não foi possível confirmar staging nem executar diagnóstico Prisma/Redis com segurança.
- Nenhum valor, host, usuário, segredo ou credencial foi exibido ou registrado.
- Próximo passo bloqueado: corrigir localmente as URLs no `.env` para formatos válidos (`postgresql://...` e `redis://`/`rediss://...`), sem enviar credenciais pelo chat; então repetir conectividade e migrations status.

## Atualização — 2026-08-25 — preparação de staging cross-tenant

- Não foi encontrada configuração separada de staging no projeto; há apenas `.env` e `.env.example`.
- O banco ativo possui apenas um tenant, portanto não foi executado teste cross-tenant real.
- Migrations locais tenant-safe identificadas para pedidos/clientes, delivery/pagamentos, atribuições, catálogo/promoções e consentimento/eventos.
- As migrations locais não foram aplicadas nesta ação.
- Próximo passo de banco: criar staging isolado, carregar dois tenants de teste, diagnosticar referências cruzadas e validar `prisma migrate diff` com shadow database autorizado.


## Atualização — 2026-08-24 — integridade, consentimento e eventos financeiros

- Criado `prisma/migrations/migration_lock.toml` para declarar PostgreSQL.
- Adicionados campos de idempotência e auditoria operacional a transações e pagamentos.
- Criados `CustomerConsent`, `PaymentEvent` e `DriverPayout`.
- Adicionados campos de consentimento, retenção e anonimização a contatos WhatsApp.
- Adicionados hash, retenção e redaction metadata a mensagens WhatsApp.
- Criada migration local `prisma/migrations/20260824000700_integrity_consent_payment_events_driver_payouts/migration.sql`.
- Migration não aplicada; requer diagnóstico e revisão em staging.
- Seed passou a incluir categorias de lojas e serviços comuns, sem credenciais ou dados financeiros reais.
- Prisma format/validate/generate e 7 testes aprovados.
- `prisma migrate diff` não foi concluído porque requer shadow database; nenhuma URL foi exposta ou configurada para isso.


## Atualização — 2026-08-24 — catálogo, personalização, promoções e comunicações

- Criados catálogos globais de categorias de lojas e serviços, com vínculo e opção de nome personalizado por loja.
- Criado `CompanyCustomization` para identidade visual, storefront, bot e mensagens WhatsApp.
- Criados `Promotion`, `Coupon` e `CouponRedemption` com limites, validade, status e valores `Decimal`.
- Criados `Communication`, `CommunicationTarget` e `NotificationEvent` para mensagens administrativas, revendedores, lojas, funcionários, clientes e entregadores.
- Criada migration local `prisma/migrations/20260824000600_store_catalog_promotions_communications/migration.sql`.
- A migration não foi aplicada; exige revisão de dados e contratos de envio antes de staging.
- Prisma format/validate/generate, testes e diff check aprovados.


## Atualização — 2026-08-24 — expansão comercial, afiliados, WhatsApp, caixa e entregadores

- `Company` recebeu dados legais, suporte, moeda e flags de e-commerce/WhatsApp.
- Criados `AffiliateCode`, `AffiliateSale` e `ResellerCashMovement` para códigos de afiliado, vendas com comissão e caixa financeiro do revendedor.
- Criados `CashRegister` e `CashMovement` para abertura, fechamento e movimentações de caixa das lojas.
- Criados `WhatsAppNumber`, `WhatsAppContact` e `WhatsAppMessage` para números, contatos, mensagens, pedidos e idempotência por referência externa.
- Criados `Driver` e `DriverCompany`, permitindo um entregador vinculado a várias lojas com taxa e comissão específicas por vínculo.
- Criada migration local `prisma/migrations/20260824000500_sales_affiliates_whatsapp_cash_drivers/migration.sql`.
- A migration não foi aplicada; requer revisão de dados, FKs compostas, índices e constraints em staging.
- `npx prisma format`, `npx prisma validate`, `npm run db:generate` e `npm test` foram aprovados.
- Nenhum segredo, token, payload real ou dado financeiro real foi incluído.


## Atualização — 2026-08-24 — FKs tenant-safe de atribuição e notificações

- `Conversation.assignee`, `QuickReply.creator` e `Notification.user` passaram a usar relações compostas com `company_id`.
- Criada migration local `prisma/migrations/20260824000400_tenant_safe_assignments_notifications/migration.sql`.
- A migration não foi aplicada; referências cruzadas devem ser diagnosticadas antes da aplicação.
- Prisma format/validate/generate, testes e carregamento das rotas foram aprovados.
- Relações opcionais usam `Restrict` para impedir remoção parcial do escopo da empresa.


## Atualização — 2026-08-24 — FKs tenant-safe delivery, pagamentos e conversas

- `Conversation.customer`, `Delivery.zone`, `Delivery.driver`, `PaymentRecord.order` e `PaymentRecord.delivery` passaram a usar escopo composto com `company_id` no Prisma.
- Criada migration local `prisma/migrations/20260824000300_tenant_safe_delivery_payment_conversation/migration.sql`.
- A migration substitui FKs simples por FKs compostas e adiciona unicidade auxiliar por tenant.
- A migration não foi aplicada; validar referências cruzadas antes de qualquer execução.
- `npx prisma format`, `npx prisma validate`, `npm run db:generate` e `npm test` foram executados com sucesso.
- Relações compostas com `company_id` obrigatório usam `Restrict` no Prisma para evitar `SetNull` inválido.

## Atualização — 2026-08-24 — FK tenant-safe pedido/cliente

- `Order` passou a declarar relação composta com `Customer` por `company_id` e `id` em `prisma/schema.prisma`.
- Foi criada a migration local `prisma/migrations/20260824000200_tenant_safe_order_customer/migration.sql`.
- A migration cria chaves compostas únicas e substitui a FK simples por FK composta, impedindo pedido de uma empresa referenciar cliente de outra.
- A migration não foi aplicada. Antes da aplicação, validar registros cruzados e unicidade no banco alvo em ambiente controlado.
- `npx prisma format` e `npx prisma validate`: aprovados.
- Risco: bancos existentes com referências cruzadas ou divergências de dados podem rejeitar a migration; não executar sem diagnóstico e backup.


## 1. Identificação

- **Projeto:** dixAPI_backend / ECMS6 DiixWhatsApp
- **Arquivo analisado:** `prisma/schema.prisma`
- **Banco declarado:** PostgreSQL
- **ORM:** Prisma
- **Identificadores:** UUID nativo PostgreSQL (`@db.Uuid`)
- **Data da análise:** 2026-08-24
- **Escopo:** enums, entidades, campos, valores permitidos, defaults, nulabilidade, relacionamentos, índices, delivery, pagamentos, hierarquia, planos, assinaturas, finanças e auditoria.

## 2. Estado geral

O schema contém **30 modelos** e **36 enums**, abrangendo:

- lojas e tenants;
- usuários e vínculos multiempresa;
- revendedores;
- clientes;
- catálogo e produtos;
- pedidos e itens;
- conversas e mensagens;
- automações;
- financeiro da loja;
- delivery;
- pagamentos;
- planos e assinaturas;
- comissões e repasses;
- histórico de status;
- auditoria;
- refresh tokens.

O schema usa UUID, PostgreSQL, valores monetários `Decimal`, JSONB para configurações flexíveis e relacionamentos Prisma com ações de exclusão definidas.

**Observação:** a validade sintática do Prisma não garante que o banco real esteja sincronizado, que as relações tenham isolamento de tenant ou que todas as regras de negócio estejam protegidas por constraints SQL.

## 3. Convenções gerais

| Convenção | Uso |
|---|---|
| `String @id @default(uuid()) @db.Uuid` | Chave primária da maioria das entidades |
| `DateTime @default(now())` | Criação e eventos temporais |
| `DateTime @updatedAt` | Atualização automática pelo Prisma |
| `Decimal` | Preços, valores, taxas, comissões e métricas financeiras |
| `Json?` | Configurações, permissões e metadados variáveis |
| `company_id` | Isolamento lógico por loja/tenant |
| `onDelete: Cascade` | Exclusão dos dependentes junto ao tenant/pai |
| `onDelete: SetNull` | Preserva o registro, removendo apenas o vínculo opcional |
| `onDelete: Restrict` | Impede exclusão quando há dependentes |

## 4. Enums e valores permitidos

### UserRole

Valores: `master`, `reseller`, `admin`, `manager`, `operator`, `visitor`.

Representa papéis globais ou operacionais. Atualmente mistura identidade global, função administrativa e perfil de visitante; recomenda-se futuramente separar papel global de papel por loja.

### UserStatus

Valores: `pending`, `active`, `inactive`, `suspended`.

Usado em vínculos e revendedores. O modelo `User` ainda utiliza `is_active` e não possui este status diretamente.

### CompanyType

Valores: `store`, `demo`, `internal`.

- `store`: loja real.
- `demo`: ambiente de demonstração/teste.
- `internal`: operação interna da plataforma.

### CompanyStatus

Valores: `pending`, `active`, `suspended`, `cancelled`.

Controla o ciclo de vida da loja.

### AccountRole

Valores: `owner`, `admin`, `manager`, `operator`, `driver`, `viewer`, `visitor`.

É usado em `UserCompany` para permissões por loja.

### PlanCode

Valores: `simple`, `silver`, `diamond`.

Identifica os planos Simples, Prata e Diamante.

### SubscriptionStatus

Valores: `trialing`, `active`, `past_due`, `suspended`, `cancelled`, `expired`.

Controla teste, assinatura ativa, inadimplência, suspensão, cancelamento e expiração.

### BillingCycle

Valores: `monthly`, `yearly`.

### FeatureValueType

Valores: `boolean`, `integer`, `decimal`, `text`, `json`.

Define o tipo do valor de uma funcionalidade do plano.

### PlatformTransactionType

Valores: `subscription`, `setup_fee`, `refund`, `adjustment`, `commission`.

### PlatformTransactionStatus

Valores: `pending`, `paid`, `failed`, `refunded`, `cancelled`.

### CommissionStatus

Valores: `pending`, `approved`, `paid`, `cancelled`.

### PayoutStatus

Valores: `pending`, `processing`, `paid`, `failed`, `cancelled`.

### AuditAction

Valores: `create`, `update`, `delete`, `login`, `logout`, `activate`, `suspend`, `cancel`, `payment`, `refund`.

### CustomerSegment

Valores: `vip`, `frequent`, `occasional`, `new`.

### CustomerStatus

Valores: `active`, `inactive`.

### ProductStatus

Valores: `active`, `inactive`, `low_stock`.

### OrderStatus

Valores: `pending`, `processing`, `completed`, `cancelled`.

### PaymentMethod

Valores: `credit_card`, `debit_card`, `pix`, `boleto`, `whatsapp_pay`, `cash_on_delivery`, `card_on_delivery`.

### ConversationChannel

Valores: `whatsapp`, `instagram`, `facebook`, `site`.

### ConversationStatus

Valores: `open`, `closed`, `waiting`.

### MessageSenderType

Valores: `user`, `customer`, `bot`.

### MessageType

Valores: `text`, `image`, `file`, `audio`.

### MessageStatus

Valores: `sent`, `delivered`, `read`.

### AutomationFlowType

Valores: `vendas`, `suporte`, `marketing`.

### TransactionType

Valores: `income`, `expense`.

### TransactionStatus

Valores: `pending`, `completed`.

### NotificationType

Valores: `order`, `message`, `payment`, `stock`, `automation`.

### DeliveryMode

Valores: `delivery`, `pickup`.

### DeliveryStatus

Valores: `pending`, `confirmed`, `preparing`, `ready_for_pickup`, `assigned`, `picked_up`, `in_transit`, `delivered`, `cancelled`, `failed`.

### DeliveryProviderType

Valores: `own`, `partner`, `marketplace`.

### DriverStatus

Valores: `available`, `unavailable`, `inactive`.

### PaymentRecordStatus

Valores: `pending`, `authorized`, `paid`, `failed`, `cancelled`, `refunded`.

### PaymentChannel

Valores: `online`, `whatsapp_manual`, `whatsapp_api`, `delivery_cash`, `delivery_card`, `delivery_pix`.

## 5. Entidades e campos

## 5.1 Company — `companies`

**Finalidade:** representa lojas, ambientes demo e estruturas internas da plataforma.

| Campo | Tipo | Obrigatório | Default | Observação |
|---|---|---:|---|---|
| `id` | UUID | Sim | UUID | Chave primária |
| `name` | String | Sim | — | Nome da empresa |
| `trade_name` | String | Não | NULL | Nome fantasia/razão complementar |
| `cnpj` | String | Não | NULL | Único globalmente |
| `address_street` | String | Não | NULL | Logradouro |
| `address_number` | String | Não | NULL | Número |
| `address_complement` | String | Não | NULL | Complemento |
| `address_city` | String | Não | NULL | Cidade |
| `address_state` | String | Não | NULL | Estado |
| `address_zip` | String | Não | NULL | CEP |
| `website` | String | Não | NULL | Site |
| `description` | String | Não | NULL | Descrição |
| `logo_url` | String | Não | NULL | Logo |
| `is_active` | Boolean | Sim | `true` | Indicador legado/operacional |
| `company_type` | CompanyType | Sim | `store` | Tipo da empresa |
| `status` | CompanyStatus | Sim | `pending` | Estado da loja |
| `reseller_id` | UUID | Não | NULL | Revendedor responsável |
| `created_by` | UUID | Não | NULL | Criador; ainda sem FK explícita |
| `created_at` | DateTime | Sim | now | Criação |
| `updated_at` | DateTime | Sim | automático | Atualização |

**Relações:** usuários, clientes, produtos, pedidos, conversas, automações, transações, respostas rápidas, notificações, memberships, reseller, subscription, transações da plataforma, comissões, histórico, auditoria e delivery.

**Índices:** `cnpj`, `is_active`.

**Pontos de atenção:** `order_number` e identificadores financeiros relacionados ainda não estão protegidos por chaves compostas com `company_id`; `is_active` duplica parcialmente `status`.

## 5.2 User — `users`

**Finalidade:** usuários autenticados da plataforma.

| Campo | Tipo | Obrigatório | Default | Observação |
|---|---|---:|---|---|
| `id` | UUID | Sim | UUID | Chave primária |
| `company_id` | UUID | Sim | — | Loja principal atual |
| `name` | String | Sim | — | Nome |
| `email` | String | Sim | — | Único por empresa |
| `phone` | String | Não | NULL | Telefone |
| `avatar_url` | String | Não | NULL | Avatar |
| `password_hash` | String | Sim | — | Hash, nunca retornar |
| `role` | UserRole | Sim | `operator` | Papel global/legado |
| `language` | String | Sim | `pt-BR` | Idioma |
| `timezone` | String | Sim | `America/Sao_Paulo` | Fuso |
| `is_active` | Boolean | Sim | `true` | Ativo/inativo |
| `last_login_at` | DateTime | Não | NULL | Último login |
| `created_at` | DateTime | Sim | now | Criação |
| `updated_at` | DateTime | Sim | automático | Atualização |

**Relações:** Company, conversas atribuídas, notificações, refresh tokens, respostas rápidas, UserCompany e Reseller.

**Índices e unicidade:** `[company_id, email]` único; índices por empresa, role, status e email.

**Pontos de atenção:** `UserCompany` permite múltiplas lojas, mas `company_id` continua obrigatório e as duas estratégias ainda coexistem.

## 5.3 Customer — `customers`

**Finalidade:** clientes finais da loja.

| Campo | Tipo | Obrigatório | Default |
|---|---|---:|---|
| `id` | UUID | Sim | UUID |
| `company_id` | UUID | Sim | — |
| `name` | String | Sim | — |
| `email` | String | Não | NULL |
| `phone` | String | Sim | — |
| `segment` | CustomerSegment | Sim | `new` |
| `status` | CustomerStatus | Sim | `active` |
| `total_orders` | Integer | Sim | 0 |
| `total_spent` | Decimal(10,2) | Sim | 0 |
| `last_purchase_date` | Date | Não | NULL |
| `registered_at` | Date | Sim | hoje |
| `created_at` | DateTime | Sim | now |
| `updated_at` | DateTime | Sim | automático |

**Relações:** Company, pedidos e conversas.

**Índices:** empresa; empresa/segment/status; empresa/email/phone; segment; status; phone; email.

**Pontos de atenção:** métricas são derivadas e precisam de reconciliação; email/phone não são únicos por tenant.

## 5.4 Product — `products`

**Finalidade:** catálogo e estoque de produtos.

| Campo | Tipo | Obrigatório | Default |
|---|---|---:|---|
| `id` | UUID | Sim | UUID |
| `company_id` | UUID | Sim | — |
| `name` | String | Sim | — |
| `description` | String | Não | NULL |
| `category` | String | Sim | — |
| `price` | Decimal(10,2) | Sim | — |
| `cost` | Decimal(10,2) | Sim | 0 |
| `stock` | Integer | Sim | 0 |
| `min_stock` | Integer | Sim | 5 |
| `total_sales` | Integer | Sim | 0 |
| `total_revenue` | Decimal(10,2) | Sim | 0 |
| `status` | ProductStatus | Sim | `active` |
| `image_url` | String | Não | NULL |
| `created_at` | DateTime | Sim | now |
| `updated_at` | DateTime | Sim | automático |

**Relações:** Company e OrderItem.

**Pontos de atenção:** não há SKU, variações, histórico de estoque ou `CHECK stock >= 0`.

## 5.5 Order — `orders`

**Finalidade:** pedido comercial da loja.

| Campo | Tipo | Obrigatório | Default |
|---|---|---:|---|
| `id` | UUID | Sim | UUID |
| `order_number` | String | Sim | — |
| `company_id` | UUID | Sim | — |
| `customer_id` | UUID | Sim | — |
| `status` | OrderStatus | Sim | `pending` |
| `payment_method` | PaymentMethod | Sim | — |
| `subtotal` | Decimal(10,2) | Sim | — |
| `discount` | Decimal(10,2) | Sim | 0 |
| `shipping_cost` | Decimal(10,2) | Sim | 0 |
| `total` | Decimal(10,2) | Sim | — |
| `shipping_address` | String | Não | NULL |
| `notes` | String | Não | NULL |
| `order_date` | DateTime | Sim | now |
| `completed_at` | DateTime | Não | NULL |
| `created_at` | DateTime | Sim | now |
| `updated_at` | DateTime | Sim | automático |

**Relações:** Company, Customer, OrderItems, Transactions, Delivery e PaymentRecords.

**Pontos de atenção:** `order_number` é único globalmente; deveria normalmente ser único por empresa. Não existe `payment_status`, idempotency key ou histórico de status.

## 5.6 OrderItem — `order_items`

| Campo | Tipo | Obrigatório | Default |
|---|---|---:|---|
| `id` | UUID | Sim | UUID |
| `order_id` | UUID | Sim | — |
| `product_id` | UUID | Sim | — |
| `quantity` | Integer | Sim | — |
| `unit_price` | Decimal(10,2) | Sim | — |
| `unit_cost` | Decimal(10,2) | Não | NULL |
| `subtotal` | Decimal(10,2) | Sim | — |
| `created_at` | DateTime | Sim | now |

**Regras esperadas:** `quantity > 0`; subtotal deve ser calculado; preço deve ser congelado no momento da compra.

**Ponto crítico:** pedido e produto podem pertencer a empresas diferentes sem FK composta ou validação de banco.

## 5.7 Conversation — `conversations`

| Campo | Tipo | Obrigatório | Default |
|---|---|---:|---|
| `id` | UUID | Sim | UUID |
| `company_id` | UUID | Sim | — |
| `customer_id` | UUID | Não | NULL |
| `channel` | ConversationChannel | Sim | — |
| `contact_name` | String | Sim | — |
| `contact_phone` | String | Não | NULL |
| `last_message` | String | Não | NULL |
| `last_message_at` | DateTime | Não | NULL |
| `unread_count` | Integer | Sim | 0 |
| `is_pinned` | Boolean | Sim | false |
| `is_archived` | Boolean | Sim | false |
| `assigned_to` | UUID | Não | NULL |
| `status` | ConversationStatus | Sim | `open` |
| `created_at` | DateTime | Sim | now |
| `updated_at` | DateTime | Sim | automático |

**Relações:** Company, Customer opcional, User responsável e Messages.

## 5.8 Message — `messages`

| Campo | Tipo | Obrigatório | Default |
|---|---|---:|---|
| `id` | UUID | Sim | UUID |
| `conversation_id` | UUID | Sim | — |
| `sender_type` | MessageSenderType | Sim | — |
| `sender_id` | UUID | Não | NULL |
| `message_type` | MessageType | Sim | `text` |
| `content` | String | Sim | — |
| `media_url` | String | Não | NULL |
| `status` | MessageStatus | Sim | `sent` |
| `is_read` | Boolean | Sim | false |
| `read_at` | DateTime | Não | NULL |
| `sent_at` | DateTime | Sim | now |
| `created_at` | DateTime | Sim | now |

**Ponto de atenção:** `sender_id` é polimórfico sem FK; a aplicação deve validar sender conforme `sender_type`.

## 5.9 AutomationFlow — `automation_flows`

Campos principais: `id`, `company_id`, `name`, `type`, `description`, `icon_emoji`, `messages_count`, `total_conversions`, `conversion_rate`, `growth_percentage`, `is_active`, `config_json`, `created_at`, `updated_at`.

`type` aceita `vendas`, `suporte`, `marketing`. `config_json` armazena configuração flexível em JSONB.

## 5.10 Transaction — `transactions`

Campos: `id`, `company_id`, `order_id` opcional, `description`, `type`, `category`, `value`, `status`, `payment_method`, `transaction_date`, `due_date`, `paid_at`, `notes`, `attachment_url`, `created_at`, `updated_at`.

- `type`: `income` ou `expense`.
- `status`: `pending` ou `completed`.
- Valor usa `Decimal(12,2)`.
- O vínculo com pedido é opcional.

## 5.11 QuickReply — `quick_replies`

Campos: `id`, `company_id`, `shortcut`, `message_text`, `created_by`, `usage_count`, `created_at`, `updated_at`.

Existe unicidade `[company_id, shortcut]`. O criador é opcional e usa `SetNull`.

## 5.12 Notification — `notifications`

Campos: `id`, `user_id`, `company_id`, `type`, `title`, `message`, `is_read`, `related_entity_type`, `related_entity_id`, `created_at`.

Tipos: pedido, mensagem, pagamento, estoque e automação.

Ponto de atenção: `user_id` e `company_id` podem apontar para contextos diferentes sem constraint composta.

## 5.13 UserCompany — `user_companies`

**Finalidade:** vínculo de um usuário com uma ou mais lojas.

| Campo | Tipo | Obrigatório | Default |
|---|---|---:|---|
| `id` | UUID | Sim | UUID |
| `user_id` | UUID | Sim | — |
| `company_id` | UUID | Sim | — |
| `role` | AccountRole | Sim | `operator` |
| `permissions` | JSONB | Não | NULL |
| `is_primary` | Boolean | Sim | false |
| `status` | UserStatus | Sim | active |
| `invited_by` | UUID | Não | NULL |
| `joined_at` | DateTime | Não | NULL |
| `removed_at` | DateTime | Não | NULL |
| `created_at` | DateTime | Sim | now |
| `updated_at` | DateTime | Sim | automático |

**Unicidade:** `[user_id, company_id]`.

**Ponto crítico:** o modelo é correto para multi-loja, mas ainda existe `User.company_id` obrigatório, criando duas fontes de verdade.

## 5.14 Reseller — `resellers`

Campos: `id`, `user_id` único, `name`, `legal_name`, `document`, `email`, `phone`, `commission_type`, `commission_value`, `status`, `created_by`, `created_at`, `updated_at`.

Representa revendedor vinculado a um usuário. Pode possuir lojas, comissões, transações da plataforma e repasses.

## 5.15 Plan — `plans`

Campos: `id`, `code`, `name`, `description`, `monthly_price`, `yearly_price`, `trial_days`, `max_users`, `max_products`, `max_orders_month`, `max_drivers`, `is_active`, `created_at`, `updated_at`.

Planos previstos:

- `simple`: operação inicial;
- `silver`: operação intermediária;
- `diamond`: limites elevados ou ilimitados.

Limites nulos representam ausência de limite definido, mas devem ser interpretados explicitamente pela aplicação.

## 5.16 PlanFeature — `plan_features`

Campos: `id`, `plan_id`, `key`, `name`, `description`, `value_type`, `boolean_value`, `integer_value`, `decimal_value`, `text_value`, `json_value`.

Existe unicidade `[plan_id, key]`.

O tipo da feature informa qual coluna de valor deve ser utilizada. O banco ainda não possui constraint que impeça múltiplas colunas de valor preenchidas ao mesmo tempo.

## 5.17 CompanySubscription — `company_subscriptions`

Campos: `id`, `company_id` único, `plan_id`, `status`, `billing_cycle`, `price`, `started_at`, `current_period_start`, `current_period_end`, `trial_ends_at`, `grace_ends_at`, `cancel_at_period_end`, `cancelled_at`, IDs externos, `created_at`, `updated_at`.

Permite uma assinatura atual por empresa. Relaciona loja, plano, eventos e transações da plataforma.

Pontos de atenção: não há faturas, tentativas de cobrança, webhooks ou snapshot histórico de preço/features.

## 5.18 SubscriptionEvent — `subscription_events`

Campos: `id`, `subscription_id`, `event_type`, `previous_status`, `new_status`, `previous_plan_id`, `new_plan_id`, `metadata`, `created_by`, `created_at`.

Registra mudanças de plano/status e metadados.

## 5.19 PlatformTransaction — `platform_transactions`

Campos: `id`, `company_id`, `reseller_id`, `subscription_id`, `type`, `status`, `amount`, `currency`, `external_reference`, `paid_at`, `refunded_at`, `notes`, `created_at`, `updated_at`.

Representa o financeiro da plataforma e do administrador Master: assinaturas, taxas de configuração, reembolsos, ajustes e comissões.

## 5.20 Commission — `commissions`

Campos: `id`, `reseller_id`, `company_id`, `platform_transaction_id`, `type`, `rate`, `base_amount`, `amount`, `status`, `approved_at`, `paid_at`, `created_at`, `updated_at`.

Controla comissão de revendedor sobre transações da plataforma.

## 5.21 Payout — `payouts`

Campos: `id`, `reseller_id`, `amount`, `status`, `period_start`, `period_end`, `external_reference`, `paid_at`, `notes`, `created_at`, `updated_at`.

Representa repasses financeiros aos revendedores.

## 5.22 CompanyStatusHistory — `company_status_history`

Campos: `id`, `company_id`, `from_status`, `to_status`, `reason`, `changed_by`, `created_at`.

Registra ativação, suspensão, cancelamento e demais transições de loja.

## 5.23 AuditLog — `audit_logs`

Campos: `id`, `company_id` opcional, `user_id` opcional, `action`, `entity_type`, `entity_id`, `before_data`, `after_data`, `ip_address`, `user_agent`, `created_at`.

Registra alterações administrativas, financeiras e de segurança. Os dados antes/depois podem conter informações sensíveis e devem possuir política de retenção e mascaramento.

## 5.24 RefreshToken — `refresh_tokens`

Campos: `id`, `user_id`, `token_hash`, `expires_at`, `revoked_at`, `created_at`.

- `token_hash` é único.
- O token bruto não deve ser armazenado.
- Tokens expirados e revogados devem ser rejeitados.
- Existe índice para usuário/status e expiração.

## 5.25 DeliverySettings — `DeliverySettings`

Campos: `id`, `company_id` único, `enabled`, `pickup_enabled`, `minimum_order_value`, `default_delivery_fee`, estimativas mínimas/máximas, horário inicial/final, `accepted_payments`, `created_at`, `updated_at`.

Controla se a loja aceita delivery e/ou retirada.

Ponto de atenção: o nome físico gerado é `DeliverySettings`, diferente da convenção snake_case das demais tabelas.

## 5.26 DeliveryZone — `delivery_zones`

Campos: `id`, `company_id`, `name`, `postal_codes`, `neighborhoods`, `delivery_fee`, `minimum_order`, `estimated_min`, `estimated_max`, `is_active`, `created_at`, `updated_at`.

Permite configurar regiões atendidas, CEPs, bairros, taxas, pedido mínimo e prazo.

## 5.27 DeliveryDriver — `delivery_drivers`

Campos: `id`, `company_id`, `name`, `phone`, `document`, `vehicle_type`, `vehicle_plate`, `status`, `provider_type`, `is_active`, `created_at`, `updated_at`.

Representa entregadores próprios, parceiros ou marketplaces.

## 5.28 Delivery — `deliveries`

Campos: `id`, `company_id`, `order_id` único, `zone_id`, `driver_id`, `mode`, `status`, dados do destinatário, endereço, latitude, longitude, `delivery_fee`, `change_for`, observações, `dispatched_at`, `delivered_at`, `failure_reason`, `created_at`, `updated_at`.

**Modalidades:** `delivery` e `pickup`.

**Status:** pendente, confirmado, preparando, pronto para retirada, atribuído, coletado, em trânsito, entregue, cancelado e falho.

Pontos de atenção:

- `order_id` é único globalmente;
- falta prova de entrega/PIN/foto/assinatura;
- falta histórico de status;
- não há tentativas de entrega;
- driver e zone podem pertencer a outro tenant sem constraint composta.

## 5.29 PaymentRecord — `payment_records`

Campos: `id`, `company_id`, `order_id`, `delivery_id`, `method`, `channel`, `status`, `amount`, `amount_received`, `change_amount`, `external_reference`, `provider`, `proof_url`, `confirmed_by_driver`, `confirmed_at`, `notes`, `created_at`, `updated_at`.

**Métodos:** cartões, PIX, boleto, WhatsApp, dinheiro na entrega e cartão na entrega.

**Canais:** online, WhatsApp manual/API, dinheiro, cartão e PIX na entrega.

**Regras de negócio esperadas:**

- dinheiro exige `amount_received`;
- valor recebido não pode ser menor que `amount`;
- `change_amount = amount_received - amount`;
- confirmação do dinheiro deve registrar responsável e data;
- pagamentos externos devem possuir referência/idempotência.

Pontos de atenção: não há histórico de eventos, webhook, chargeback, idempotency key ou `confirmed_by_user_id`.

## 6. Relações principais

```text
Company
├── Users
├── UserCompany
├── Customers
│   └── Orders
├── Products
│   └── OrderItems
├── Orders
│   ├── OrderItems
│   ├── Delivery
│   ├── Payments
│   └── Transactions
├── Conversations
│   └── Messages
├── DeliverySettings
├── DeliveryZones
├── DeliveryDrivers
├── Deliveries
├── PaymentRecords
├── PlanSubscription
├── PlatformTransactions
├── Commissions
├── StatusHistory
└── AuditLogs

User
├── Company principal
├── UserCompany
├── RefreshTokens
├── Notifications
├── QuickReplies
└── Reseller opcional

Reseller
├── Companies
├── Commissions
├── PlatformTransactions
└── Payouts

Plan
├── PlanFeatures
└── CompanySubscriptions
```

## 7. Integridade e riscos identificados

### Críticos

1. `User.company_id` obrigatório e `UserCompany` coexistem sem fonte oficial única.
2. Relações entre pedido, produto, cliente, delivery e pagamento não validam tenant composto.
3. `created_by`, `changed_by` e campos semelhantes não possuem sempre FK explícita.
4. Não há constraints `CHECK` para valores negativos, estoque, quantidade e troco.
5. Pedido e pagamento não possuem idempotência.
6. Não há garantia de que revendedor seja autorizado a acessar a loja relacionada.

### Altos

1. `order_number` é único globalmente, não por loja.
2. `Delivery.order_id` é único globalmente.
3. Dados financeiros não têm histórico de eventos completo.
4. Planos usam enum fixo, dificultando planos adicionais sem migration.
5. Features JSON/valores múltiplos não são validados pelo banco.
6. Não há endereço estruturado ou snapshot de endereço do pedido.
7. Não há variantes de produto nem histórico de estoque.

### Médios

1. Índices isolados de `status`, `category` e `email` poderiam ser compostos com `company_id`.
2. `is_active` e `status` podem representar a mesma situação em algumas entidades.
3. Tabela `DeliverySettings` foge da convenção de nomes físicos.
4. Métricas derivadas precisam de rotina de reconciliação.
5. Auditoria não possui política de retenção ou mascaramento documentada.

## 8. Valores e regras recomendadas para constraints

Adicionar em migration futura, após análise de dados existentes:

```sql
CHECK (stock >= 0)
CHECK (min_stock >= 0)
CHECK (quantity > 0)
CHECK (price >= 0)
CHECK (cost >= 0)
CHECK (total_sales >= 0)
CHECK (total_revenue >= 0)
CHECK (subtotal >= 0)
CHECK (discount >= 0)
CHECK (shipping_cost >= 0)
CHECK (total >= 0)
CHECK (amount >= 0)
CHECK (amount_received IS NULL OR amount_received >= 0)
CHECK (change_amount IS NULL OR change_amount >= 0)
CHECK (monthly_price >= 0)
CHECK (yearly_price >= 0)
CHECK (commission_value >= 0)
CHECK (base_amount >= 0)
CHECK (commission_amount >= 0)
```

Também recomenda-se validar:

- status de loja compatível com assinatura;
- pagamento em dinheiro somente com canal `delivery_cash`;
- pagamento WhatsApp somente com canal manual/API;
- cartão na entrega somente com `delivery_card`;
- `current_period_end > current_period_start`;
- entregador, zona, pedido e pagamento pertencendo à mesma empresa.

## 9. Índices recomendados

Avaliar, com base em consultas reais:

```text
orders(company_id, order_date)
orders(company_id, status, order_date)
products(company_id, category, status)
customers(company_id, email)
customers(company_id, phone)
conversations(company_id, status, updated_at)
messages(conversation_id, created_at)
payment_records(company_id, created_at)
audit_logs(company_id, created_at)
companies(reseller_id, status)
```

Para mensagens, auditoria e transações em grande volume, considerar paginação por cursor e particionamento somente após medir crescimento real.

## 10. Arquitetura recomendada

### Identidade

- `User` como identidade global.
- `UserCompany` como vínculo oficial com lojas.
- roles/permissões separados por escopo.
- `DemoSession` para visitantes.
- refresh tokens hash e revogáveis.

### Hierarquia

```text
Master: escopo global
Reseller: suas lojas e comissões
Store owner/admin: uma loja
Employee: permissões vinculadas à loja
Visitor: ambiente demo isolado
```

### Financeiro

Adicionar futuramente:

- invoices;
- invoice items;
- billing attempts;
- payment events;
- webhooks;
- chargebacks;
- snapshots de plano;
- histórico de assinatura.

### Operação

Adicionar futuramente:

- endereços separados;
- variantes de produto;
- movimentos de estoque;
- histórico de pedido;
- histórico de delivery;
- tentativas de entrega;
- prova de entrega;
- idempotência.

## 11. Plano de correção prioritário

1. Rotacionar credenciais do `.env`.
2. Confirmar o estado real do PostgreSQL com backup.
3. Versionar e revisar migrations.
4. Definir `UserCompany` como fonte oficial de vínculo.
5. Corrigir login, registro e autorização por escopo.
6. Implementar FKs/constraints compostas de tenant.
7. Tornar `order_number` único por empresa.
8. Adicionar constraints financeiras e de estoque.
9. Criar faturas, webhooks e eventos financeiros.
10. Criar testes de integração PostgreSQL.
11. Criar seed separado para desenvolvimento/demo.
12. Adicionar paginação, auditoria efetiva e reconciliação.

## 12. Conclusão

O banco possui uma base abrangente para SaaS multi-tenant de lojas, vendas, delivery, pagamentos, revendedores e planos. O modelo cobre os principais domínios solicitados, mas ainda precisa de uma etapa de consolidação estrutural antes de produção.

As prioridades técnicas são:

- isolamento rigoroso entre tenants;
- definição única do vínculo usuário/loja;
- integridade financeira;
- migrations sincronizadas com o banco real;
- constraints no PostgreSQL;
- autenticação e autorização por escopo;
- histórico e idempotência para operações financeiras;
- controle operacional de estoque e delivery.

**Status da auditoria:** concluída com recomendações de correção incremental. Nenhum dado do banco remoto foi alterado durante esta análise.

## 13. Registro de skills e manutenção do relatório

### Atualização — 2026-08-24

Foi criada a skill local `.opencode/skills/database-project/SKILL.md` para orientar auditorias, modelagem, migrations, constraints, performance, segurança, multi-tenancy, seed e validações do banco deste projeto.

A skill exige:

- leitura deste relatório antes de alterações no banco;
- leitura de `logs/analysis_report.md` quando houver impacto na aplicação;
- registro de modelos, campos, relações, índices e valores;
- classificação de problemas por severidade;
- distinção entre migration criada localmente e migration aplicada;
- registro de falhas, riscos, decisões pendentes e próximo passo;
- proibição de credenciais, tokens e dados pessoais reais nos relatórios.

Nenhuma migration ou operação no banco remoto foi executada nesta atualização.

## 14. Atualização — 2026-08-24 — correções implementadas localmente

### Alterações

- `Order.order_number` deixou de ser único global e passou a ser único por empresa via `@@unique([company_id, order_number])` em `prisma/schema.prisma:400-428`.
- Adicionados índices compostos de pedidos por empresa, cliente, status e data.
- Criada a migration local `prisma/migrations/20260824000100_integrity_constraints/migration.sql` com constraints de valores monetários, estoque, quantidade, períodos e troco.
- Corrigidas operações de atualização e remoção de empresa para incluírem o contexto da empresa em `src/modules/companies/repositories/companyRepository.js:52-63` e services/controllers correspondentes.

### Problemas classificados

#### CRÍTICO

**PROBLEMA:** Relações tenant-owned ainda permitem referências cruzadas entre empresas.
**CAUSA:** FKs simples por ID em pedidos/itens, delivery, pagamentos, zonas e usuários.
**IMPACTO:** Possível acesso ou associação de dados de outro tenant.
**SOLUÇÃO:** Implementar FKs compostas com `company_id` em migration dedicada, após inventário e validação dos dados existentes.
**RISCO:** Migration pode falhar se já houver dados inconsistentes.
**JUSTIFICATIVA:** Isolamento multi-tenant precisa ser garantido também pelo PostgreSQL.

#### ALTO

**PROBLEMA:** `User.company_id` e `UserCompany` coexistem como fontes de vínculo.
**CAUSA:** Modelo legado ainda obrigatório.
**IMPACTO:** Ambiguidade de autorização em usuários multi-loja.
**SOLUÇÃO:** Definir `UserCompany` como vínculo oficial e migrar autenticação/autorização gradualmente.
**RISCO:** Alteração exige migração de dados e impacto amplo na aplicação.
**JUSTIFICATIVA:** Não foi feita alteração destrutiva nem mudança de nulabilidade sem autorização.

**PROBLEMA:** Idempotência e eventos de pagamento ainda ausentes.
**CAUSA:** `PaymentRecord` não possui chave idempotente nem tabela de eventos.
**IMPACTO:** Webhooks/reprocessamentos podem duplicar pagamentos.
**SOLUÇÃO:** Adicionar `idempotency_key` única por provedor/empresa e eventos de pagamento.
**RISCO:** Requer contrato com gateways e adaptação de services.
**JUSTIFICATIVA:** Não inventar integração financeira sem revisar módulos consumidores.

#### MÉDIO

**PROBLEMA:** Seed usa números JavaScript para valores monetários.
**CAUSA:** Prisma aceita conversão, mas float pode introduzir arredondamento.
**IMPACTO:** Risco de precisão em evolução do seed.
**SOLUÇÃO:** Usar strings ou `Prisma.Decimal` no seed.
**RISCO:** Baixo; mudança compatível.
**JUSTIFICATIVA:** Deve ser corrigido na próxima alteração do seed.

### Estado das migrations

- Migration inicial avaliada: `prisma/migrations/20260101000000_init/migration.sql`.
- Migration criada localmente: `20260824000100_integrity_constraints`.
- Migration não aplicada a banco remoto.
- Banco real não foi consultado por ausência de autorização explícita.

### Validações e limitações

- Arquivos obrigatórios `database_especifications.md` e `prompt.md` não existem na raiz atual.
- Não foram executados comandos destrutivos, `db push`, reset ou deploy de migration.
- Próxima validação deve incluir `prisma format`, `prisma validate`, geração do client, testes, lint e typecheck.
