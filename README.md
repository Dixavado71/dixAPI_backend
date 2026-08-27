# diix / dixAPI — Backend

API REST multi-tenant da **DiixWhatsApp (diix)**: cockpit operacional para lojas que vendem por WhatsApp e outros canais digitais. Centraliza vendas, catálogo, estoque, clientes, delivery, finanças, atendimento e automação, com revenda white-label (master/reseller).

> O documento `prompt.md` na raiz do workspace contém o prompt mestre original (spec de construção). Este README documenta o estado **real** do código.

## Pilha

- Node.js 20+ (ESM)
- Express 4
- Prisma 5 + PostgreSQL
- Redis (cache e estado do chatbot)
- JWT (access + refresh), bcryptjs
- Zod (validação), Pino (logs)
- Vitest (testes), Swagger UI (`/api/docs`)

## Estrutura

```
src/
├── config/           # env.js (validação), logger.js (Pino)
├── infrastructure/   # database, http (middlewares/errors), security, cache, whatsapp
├── shared/           # erros, utils, validators, pagination, whatsapp/extraction
├── modules/          # 21 domínios: auth, admin, users, companies, customers, products,
│                     #   orders, conversations, messages, automation, transactions,
│                     #   notifications, delivery, payments, coupons, promotions, catalog,
│                     #   communications, consent, billing, whatsapp, dashboard
├── routes/           # router global (monta todos os módulos)
├── app.js            # Express (Helmet, CORS, rate-limit, pino-http, swagger)
├── server.js         # entry point (valida env, conecta Prisma/Redis, shutdown gracioso)
└── swagger.json      # OpenAPI (gerado por scripts/generate-swagger.mjs)
```

Padrão por módulo: `routes/ controllers/ services/ repositories/ validators/`. Controle de acesso via `authenticate` (JWT) → `ensureTenant()` (companyId) → `authorize(...)` (role).

## Pré-requisitos

- Node.js 20+
- PostgreSQL 15+
- Redis 7+

## Instalação

```bash
npm ci
cp .env.example .env   # preencha com suas credenciais (nunca commite o .env)
```

Variáveis de ambiente: ver `.env.example`. Em produção, PostgreSQL exige `sslmode=require` e Redis `rediss://` (exceção para serviços internos Railway).

## Banco de dados

```bash
npm run db:generate   # gerar client Prisma
npm run db:migrate    # criar/aplicar migrations em dev
npm run db:deploy     # aplicar migrations pendentes (produção/staging)
npm run db:seed       # seed idempotente com dados demo
npm run db:studio     # abrir Prisma Studio
```

## Executar

```bash
npm run dev     # modo watch
npm start       # produção
```

Health check: `GET /health`. Documentação interativa: `GET /api/docs`.

## Testes, lint e typecheck

```bash
npm run typecheck   # verificação sintática de todos os arquivos JS
npm run lint        # idem (script compartilhado)
npm run test:unit   # suíte unitária (sem integração)
npm test            # todas as suítes
```

CI (`.github/workflows/ci.yml`): typecheck → lint → `prisma validate` → `migrate deploy` (serviço PostgreSQL) → unit → integração → `npm audit`.

## Módulos e rotas (~172 endpoints)

| Módulo | Prefixo | Destaques |
|---|---|---|
| auth | `/api/v1/auth` | login, register, register-store, refresh, logout, me |
| admin | `/api/v1/admin` | master/reseller: overview, stores, payments, plans, users |
| users | `/api/v1/users` | CRUD de operadores da loja (hierarquia admin/manager/operator) |
| companies | `/api/v1/companies` | CRUD de empresas + customization |
| customers | `/api/v1/customers` | CRUD com filtros, tenant-safe |
| products | `/api/v1/products` | CRUD com controle de estoque |
| orders | `/api/v1/orders` | Criação transacional, baixa de estoque, cupom/delivery |
| conversations | `/api/v1/conversations` | Listagem, mensagens, atribuição, replies |
| automation | `/api/v1/automation` | Flow engine, quick replies, teste/duplicação |
| notifications | `/api/v1/notifications` | In-app, triggers, logs de notificação |
| whatsapp | `/api/v1/whatsapp` | Números, QR, mensagens, mídia, grupos, status, bot, webhook |
| delivery | `/api/v1/delivery` | Settings, zonas, motoristas, entregas |
| payments | `/api/v1/payments` | Eventos de pagamento (webhook) |
| coupons | `/api/v1/coupons` | Validação e resgate |
| catalog | `/api/v1/catalog` | Categorias e serviços |
| promotions | `/api/v1/promotions` | Promoções e cupons CRUD |
| communications | `/api/v1/communications` | Campanhas multi-audiência |
| consent | `/api/v1/consent` | Consentimento LGPD |
| transactions | `/api/v1/transactions` | Transações financeiras |
| billing | `/api/v1/billing` | Planos e assinaturas |
| dashboard | `/api/v1/dashboard` | Métricas de operação |

Inventário completo das rotas em `docs/inventario_rotas.md` e na própria API (`/api/docs`). Para regenerar o Swagger após mudar rotas:

```bash
npm run swagger
```

## Segurança

- JWT HS256 com issuer, audience e `jti`; refresh token em SHA-256 com rotação/revogação.
- Multi-tenant: `UserCompany` é a autoridade de tenancy/role; `ensureTenant()` em todas as rotas.
- FKs compostas tenant-safe, validação Zod estrita, rate limiting por endpoint sensível.
- Logs minimizados (sem stack, URL, params ou payloads); resposta de erro padronizada.
- Ver detalhes em `docs/06_seguranca.md`.

## Documentação

A fonte de verdade do projeto está em `docs/` (raiz do workspace `C:\DixAPI_Backend`), com relatórios de progresso, arquitetura, banco, funcionalidades, segurança, expansões, melhorias e correções, além de relatórios operacionais em `logs/`.

## Deploy (Railway)

- `railway.toml`: build `npm ci && npm run db:generate`, start `npm run db:deploy && npm start`, health `/health`.
- Nixpacks com binário Prisma do `PATH` (evita `MODULE_NOT_FOUND` com `--omit=dev`).
