# 01 — Arquitetura

## Visão geral

API REST multi-tenant com padrão **Domain-Driven Design leve**. Cada domínio de negócio é um módulo isolado com suas próprias camadas. O acesso a dados é centralizado via Prisma ORM. Integração WhatsApp via Evolution API v2.3.7.

## Estrutura de diretórios

```
src/
├── app.js                  # Configuração do Express (middlewares globais)
├── server.js               # Entry point: valida env, conecta infra, shutdown gracioso
├── swagger.json            # Documentação OpenAPI (gerada por scripts/generate-swagger.mjs)
├── config/
│   ├── env.js              # Validação e exportação das variáveis de ambiente
│   └── logger.js           # Logger Pino
├── infrastructure/
│   ├── cache/
│   │   ├── redisClient.js      # Cliente Redis (timeout, reconexão limitada)
│   │   └── chatbotCache.js     # Cache de estado do chatbot (TTL 24h)
│   ├── database/
│   │   └── prismaClient.js     # Instância PrismaClient única
│   ├── http/
│   │   ├── middlewares/
│   │   │   ├── authenticate.js # Valida JWT, popula req.user
│   │   │   ├── authorize.js    # Autorização por role
│   │   │   └── tenant.js       # ensureTenant(): req.tenant.companyId
│   │   └── errors/
│   │       └── globalErrorHandler.js  # Tratamento de erros (AppError + Prisma)
│   ├── mail/
│   │   └── mailer.js        # Nodemailer (SMTP)
│   ├── security/
│   │   ├── jwt.js           # Geração/verificação de tokens JWT
│   │   └── password.js      # bcryptjs hash/compare
│   └── whatsapp/
│       └── evolutionApiClient.js  # Cliente HTTP Evolution API v2.3.7
├── shared/
│   ├── errors/
│   │   └── AppError.js      # Hierarquia de erros da aplicação
│   ├── utils/
│   │   └── response.js      # Helpers de resposta (success, paginated, created, noContent)
│   ├── validators/
│   │   └── zodValidators.js # Schemas compartilhados (pagination, idParam, login, refresh)
│   ├── pagination/
│   │   └── pagination.js    # Build de opções e resposta de paginação
│   └── whatsapp/
│       └── extraction.js    # Extração de texto/mídia de mensagens WhatsApp
├── modules/
│   └── <domain>/
│       ├── index.js         # Re-exporta router + controller + service + validators
│       ├── controllers/     # Parse HTTP, chama service, retorna resposta
│       ├── services/        # Regras de negócio
│       ├── repositories/    # Acesso a dados (Prisma)
│       ├── validators/      # Schemas Zod
│       └── routes/          # Rotas do módulo
└── routes/
    └── index.js             # Router principal (monta todos os módulos)
```

## Fluxo de requisição

```
HTTP → Express (app.js)
  → Helmet / CORS / rate-limit global / payload-limit / pino-http
  → Rota → router.use(authenticate) → JWT validado, req.user = { id, email, companyId, role }
    → router.use(ensureTenant()) → req.tenant = { companyId }
      → authorize('admin', 'manager', ...) → verifica role
        → controller → validator (Zod) → service → repository → Prisma
          → resposta padronizada ou globalErrorHandler
```

## Multi-tenancy

- Isolamento lógico por `company_id` em **todas** as consultas Prisma.
- `UserCompany` (membership) é a **fonte oficial** de tenant e role.
- `ensureTenant()` extrai `companyId` do token JWT (nunca do cliente).
- FKs compostas com `company_id` no banco: Order→Customer, Delivery→Zone/Driver, PaymentRecord→Order/Delivery, Conversation→Customer, QuickReply→creator, Notification→user.
- Login **não aceita** `companyId` fornecido pelo cliente — deriva do membership ativo.

## Tratamento de erros

- `AppError` com subclasses: `NotFoundError` (404), `BadRequestError` (400), `ConflictError` (409), `ValidationError` (400), `UnauthorizedError` (401), `ForbiddenError` (403).
- `globalErrorHandler` mapeia erros Prisma:
  - `P2002` → 409 (unique constraint)
  - `P2025` → 404 (não encontrado)
  - `P2003` / `23001` → 409 (foreign key constraint)
  - `P1001` → 503 (banco indisponível)
- Resposta padronizada: `{ success, error: { code, category, message, details, retryable, requestId, timestamp, method, path } }`.
- Logs minimizados: sem stack, sem URL completa, sem query params, sem payloads.

## Segurança em camadas

1. Helmet (headers de segurança)
2. CORS configurável (multi-origin via vírgula)
3. Rate limiting global (500/15min) + específico por endpoint sensível
4. JWT HS256 com issuer, audience, `jti`
5. Refresh token em SHA-256 com rotação e revogação
6. Validação Zod estrita
7. Isolamento multi-tenant lógico + FKs compostas
8. Logs minimizados
