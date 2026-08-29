# DixAPI — Documentação do Backend

> Esta documentação reflete fielmente o código-fonte em `src/` e o schema em `prisma/schema.prisma`. Gerada em 2026-08-29.

## Índice

| Documento | Conteúdo |
|---|---|
| [`01_ARCHITECTURE.md`](./01_ARCHITECTURE.md) | Arquitetura, camadas, fluxo de requisição, multi-tenancy |
| [`02_MODULES.md`](./02_MODULES.md) | Todos os 22 módulos, rotas, controllers, services, validators |
| [`03_DATABASE.md`](./03_DATABASE.md) | Schema Prisma, 54 modelos, 53 enums, 16 migrations |
| [`04_EVOLUTION_API.md`](./04_EVOLUTION_API.md) | Integração Evolution API v2.3.7, endpoints, payloads |
| [`05_SECURITY.md`](./05_SECURITY.md) | Autenticação JWT, autorização, isolamento multi-tenant |
| [`06_TESTING.md`](./06_TESTING.md) | Estratégia de testes, cobertura, 118 testes, 22 arquivos |
| [`07_DEPLOYMENT.md`](./07_DEPLOYMENT.md) | Deploy Railway, CI/CD, variáveis de ambiente |
| [`08_CHANGELOG.md`](./08_CHANGELOG.md) | Histórico completo de correções e melhorias |

## Stack

- **Runtime**: Node.js 20+ (ESM)
- **Framework**: Express 4.18
- **ORM**: Prisma 5.22 + PostgreSQL 15+
- **Cache**: Redis 7+ (estado do chatbot, rate limiting)
- **Auth**: JWT (HS256, access + refresh), bcryptjs (custo 12)
- **Validação**: Zod 3.22
- **Logs**: Pino 8 + pino-http 9
- **Testes**: Vitest 4.1 + Supertest 6
- **WhatsApp**: Evolution API v2.3.7 (WHATSAPP-BAILEYS)

## Números

| Métrica | Valor |
|---|---|
| Módulos | 22 |
| Endpoints HTTP | ~172 |
| Modelos Prisma | 54 |
| Enums Prisma | 53 |
| Migrations | 16 |
| Testes unitários | 118 (22 arquivos) |
| Typecheck | 167 arquivos JS |
| Skills OpenCode | 4 (`project-guide`, `database-expert`, `fullstack-auditor`, `nodejs-backend-architect`) |

## Roteamento global

Montado em `src/routes/index.js` sob `/api/v1/`:

| Prefixo | Módulo | Arquivo de rotas |
|---|---|---|
| `/admin` | admin | `src/modules/admin/routes/index.js` |
| `/auth` | auth | `src/modules/auth/routes/index.js` |
| `/billing` | billing | `src/modules/billing/routes/index.js` |
| `/companies` | companies | `src/modules/companies/routes/index.js` |
| `/delivery` | delivery | `src/modules/delivery/routes/index.js` |
| `/coupons` | coupons | `src/modules/coupons/routes/index.js` |
| `/payments` | payments | `src/modules/payments/routes/index.js` |
| `/catalog` | catalog | `src/modules/catalog/routes/index.js` |
| `/customers` | customers | `src/modules/customers/routes/index.js` |
| `/orders` | orders | `src/modules/orders/routes/index.js` |
| `/promotions` | promotions | `src/modules/promotions/routes/index.js` |
| `/company/customization` | customization | `src/modules/companies/routes/customization.js` |
| `/communications` | communications | `src/modules/communications/routes/index.js` |
| `/consent` | consent | `src/modules/consent/routes/index.js` |
| `/products` | products | `src/modules/products/routes/index.js` |
| `/transactions` | transactions | `src/modules/transactions/routes/index.js` |
| `/whatsapp` | whatsapp | `src/modules/whatsapp/routes/index.js` |
| `/conversations` | conversations | `src/modules/conversations/routes/index.js` |
| `/automation` | automation | `src/modules/automation/routes/index.js` |
| `/notifications` | notifications | `src/modules/notifications/routes/index.js` |
| `/dashboard` | dashboard | `src/modules/dashboard/routes/index.js` |
| `/users` | users | `src/modules/users/routes/index.js` |

## Convenções de código

- Idioma: português brasileiro para mensagens de erro, inglês para código
- ESM (`"type": "module"` no package.json)
- Arquitetura modular com camadas: `routes/` → `controllers/` → `services/` → `repositories/` → `validators/`
- Middleware de autenticação/tenant/authorização aplicados por rota
- Erros padronizados via `AppError` (subclasses: `NotFoundError`, `BadRequestError`, `ConflictError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError`)
- Zod estrito (`.strict()`) em todos os schemas de entrada
- UUID v4 para todas as chaves primárias (`@db.Uuid`)
- Datas em ISO 8601, valores monetários em `Decimal(10,2)` ou `Decimal(12,2)`