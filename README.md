# PROMPT MESTRE — CONSTRUÇÃO DO BACKEND ECMS6 DIixWhatsApp

## 1. OBJETIVO

Crie do zero um backend profissional chamado **ECMS6 / DiixWhatsApp Backend**.

O sistema será uma **API REST Node.js** responsável por fornecer toda a infraestrutura backend para o dashboard DiixWhatsApp.

O backend deverá:

* ser modular;
* ser organizado;
* ser escalável;
* possuir separação clara de responsabilidades;
* utilizar arquitetura profissional;
* possuir CRUD completo;
* possuir banco de dados relacional;
* possuir migrations;
* possuir seed;
* possuir validação;
* possuir autenticação;
* possuir autorização por roles;
* possuir suporte multi-tenant;
* possuir tratamento global de erros;
* possuir logs;
* possuir testes;
* possuir documentação da API;
* possuir health check;
* possuir paginação;
* possuir filtros;
* possuir ordenação;
* possuir busca;
* possuir proteção contra SQL Injection;
* possuir validação de entrada;
* possuir isolamento entre empresas/tenants.

NÃO crie uma aplicação monolítica.

NÃO coloque regras de negócio dentro dos controllers.

NÃO coloque queries SQL diretamente nos controllers.

NÃO misture configuração, banco, regras de negócio e HTTP.

---

# 2. FONTE DE VERDADE

O arquivo de especificação fornecido pelo usuário deve ser tratado como a **fonte principal da estrutura funcional e do banco de dados**.

Ele define as entidades:

* users
* companies
* customers
* products
* orders
* order_items
* conversations
* messages
* automation_flows
* transactions

E também entidades complementares:

* quick_replies
* notifications

A especificação define também relacionamentos, índices, enums, regras de multi-tenancy, métricas e requisitos de segurança.

Exemplo:

`customers.company_id -> companies.id`

`products.company_id -> companies.id`

`orders.company_id -> companies.id`

`orders.customer_id -> customers.id`

`order_items.order_id -> orders.id`

`order_items.product_id -> products.id`

`conversations.company_id -> companies.id`

`conversations.customer_id -> customers.id`

`conversations.assigned_to -> users.id`

`messages.conversation_id -> conversations.id`

`automation_flows.company_id -> companies.id`

`transactions.company_id -> companies.id`

`transactions.order_id -> orders.id`

Respeite essas relações.

---

# 3. STACK OBRIGATÓRIA

Utilize:

* Node.js 20+
* JavaScript ES Modules
* Express
* PostgreSQL
* Prisma ORM
* Zod
* bcrypt ou argon2
* JWT
* Pino
* Helmet
* CORS
* express-rate-limit
* dotenv
* Vitest
* Supertest
* Swagger/OpenAPI

Preferencialmente:

```text
Node.js
Express
Prisma
PostgreSQL
Zod
JWT
Pino
Vitest
Supertest
Swagger
```

Não utilize TypeScript nesta primeira implementação.

Utilize JavaScript moderno com ES Modules.

---

# 4. ARQUITETURA

Utilize arquitetura modular por domínio.

Estrutura desejada:

```text
src/
├── app.js
├── server.js
│
├── config/
│   ├── env.js
│   ├── database.js
│   └── logger.js
│
├── infrastructure/
│   ├── database/
│   │   └── prismaClient.js
│   │
│   ├── http/
│   │   ├── middlewares/
│   │   └── errors/
│   │
│   └── security/
│       ├── jwt.js
│       └── password.js
│
├── shared/
│   ├── constants/
│   ├── errors/
│   ├── utils/
│   ├── pagination/
│   └── validators/
│
├── modules/
│
│   ├── auth/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── validators/
│   │   ├── routes/
│   │   └── index.js
│   │
│   ├── users/
│   ├── companies/
│   ├── customers/
│   ├── products/
│   ├── orders/
│   ├── order-items/
│   ├── conversations/
│   ├── messages/
│   ├── automation-flows/
│   ├── transactions/
│   ├── quick-replies/
│   ├── notifications/
│   └── dashboard/
│
└── routes/
    └── index.js
```

Cada módulo deverá seguir o padrão:

```text
module/
├── controllers/
├── services/
├── repositories/
├── validators/
├── routes/
└── index.js
```

---

# 5. RESPONSABILIDADE DE CADA CAMADA

## Controller

Responsável somente por:

* receber HTTP;
* extrair params;
* extrair query;
* extrair body;
* chamar service;
* devolver response.

Controller NÃO deve:

* acessar Prisma diretamente;
* possuir regra de negócio;
* executar queries;
* validar regras complexas.

---

## Service

Responsável por:

* regras de negócio;
* validações de negócio;
* operações envolvendo múltiplos repositories;
* transações;
* autorização contextual;
* cálculos.

---

## Repository

Responsável por:

* Prisma;
* queries;
* create;
* find;
* update;
* delete;
* filtros;
* paginação;
* ordenação.

Nenhum controller poderá acessar Prisma diretamente.

---

## Validator

Utilize Zod para:

* body;
* params;
* query;
* filtros;
* paginação.

---

# 6. BANCO DE DADOS

Utilize PostgreSQL + Prisma.

Criar:

```text
prisma/
├── schema.prisma
├── migrations/
└── seed.js
```

O banco deverá ser criado através de migrations.

NÃO dependa de `prisma db push` como mecanismo principal.

Utilize:

```bash
npx prisma migrate dev
```

e migrations versionadas.

---

# 7. UUID

Todas as entidades deverão utilizar UUID como identificador.

Exemplo:

```prisma
id String @id @default(uuid()) @db.Uuid
```

Use UUID nativo do PostgreSQL quando possível.

---

# 8. TIMESTAMPS

Utilize:

```text
createdAt
updatedAt
```

Mapeados para:

```text
created_at
updated_at
```

Armazene timestamps em UTC.

---

# 9. MULTI-TENANCY

Esta é uma regra CRÍTICA.

O sistema é multi-tenant.

As entidades pertencentes a empresas deverão possuir:

```text
company_id
```

Nunca permitir que uma empresa acesse dados de outra empresa.

Exemplo proibido:

```http
GET /api/customers/:id
```

simplesmente buscar o cliente pelo ID.

O backend deve validar:

```text
customer.id
AND
customer.company_id = authenticatedUser.companyId
```

Todas as operações devem respeitar o tenant.

Isso vale para:

* customers
* products
* orders
* order_items
* conversations
* messages
* automation_flows
* transactions
* quick_replies
* notifications

---

# 10. USERS

Criar CRUD de usuários.

Campos principais:

```text
id
name
email
phone
avatar_url
password_hash
role
language
timezone
is_active
created_at
updated_at
last_login_at
```

Roles:

```text
admin
manager
operator
```

Senha nunca pode ser retornada pela API.

Nunca retornar:

```text
password_hash
```

---

# 11. COMPANIES

Criar CRUD completo.

Campos:

```text
id
name
trade_name
cnpj
address_street
address_number
address_complement
address_city
address_state
address_zip
website
description
logo_url
is_active
created_at
updated_at
```

`cnpj` deve ser UNIQUE.

---

# 12. CUSTOMERS

CRUD completo.

Campos:

```text
id
company_id
name
email
phone
segment
status
total_orders
total_spent
last_purchase_date
registered_at
created_at
updated_at
```

Segmentos:

```text
vip
frequent
occasional
new
```

Status:

```text
active
inactive
```

Implementar:

* criação;
* atualização;
* exclusão;
* busca;
* paginação;
* filtro por status;
* filtro por segmento;
* busca por nome;
* busca por email;
* busca por telefone.

---

# 13. PRODUCTS

CRUD completo.

Campos:

```text
id
company_id
name
description
category
price
cost
stock
min_stock
total_sales
total_revenue
status
image_url
created_at
updated_at
```

Status:

```text
active
inactive
low_stock
```

Implementar:

* controle de estoque;
* filtro por categoria;
* produtos ativos;
* produtos com estoque baixo;
* busca;
* paginação;
* ordenação;
* atualização de estoque.

Nunca permitir estoque negativo.

---

# 14. ORDERS

CRUD completo.

Campos:

```text
id
order_number
company_id
customer_id
status
payment_method
subtotal
discount
shipping_cost
total
shipping_address
notes
order_date
completed_at
created_at
updated_at
```

Status:

```text
pending
processing
completed
cancelled
```

Métodos:

```text
credit_card
debit_card
pix
boleto
whatsapp_pay
```

Implementar regras:

```text
subtotal = soma dos order_items
total = subtotal - discount + shipping_cost
```

Não confiar no total enviado pelo frontend.

O backend deve calcular.

---

# 15. ORDER ITEMS

Campos:

```text
id
order_id
product_id
quantity
unit_price
unit_cost
subtotal
created_at
```

Regras:

```text
quantity > 0
```

Ao adicionar item:

```text
subtotal = quantity * unit_price
```

O preço deve ser armazenado no momento da compra.

Não utilizar posteriormente o preço atual do produto para alterar pedidos antigos.

Criar transação para:

1. criar pedido;
2. criar itens;
3. atualizar estoque;
4. atualizar estatísticas;
5. confirmar operação.

Se qualquer etapa falhar:

```text
ROLLBACK
```

---

# 16. CONVERSATIONS

Campos:

```text
id
company_id
customer_id
channel
contact_name
contact_phone
last_message
last_message_at
unread_count
is_pinned
is_archived
assigned_to
status
created_at
updated_at
```

Canais:

```text
whatsapp
instagram
facebook
site
```

Status:

```text
open
closed
waiting
```

Implementar:

* listar conversas;
* abrir conversa;
* fechar conversa;
* atribuir atendente;
* fixar;
* arquivar;
* marcar mensagens como lidas;
* filtro por canal;
* filtro por status;
* filtro por atendente.

---

# 17. MESSAGES

Campos:

```text
id
conversation_id
sender_type
sender_id
message_type
content
media_url
status
is_read
read_at
sent_at
created_at
```

Sender:

```text
user
customer
bot
```

Tipos:

```text
text
image
file
audio
```

Status:

```text
sent
delivered
read
```

Implementar paginação das mensagens.

Nunca carregar milhares de mensagens sem paginação.

---

# 18. AUTOMATION FLOWS

Campos:

```text
id
company_id
name
type
description
icon_emoji
messages_count
total_conversions
conversion_rate
growth_percentage
is_active
config_json
created_at
updated_at
```

Tipos:

```text
vendas
suporte
marketing
```

Criar CRUD.

O `config_json` deve utilizar JSON nativo do PostgreSQL/Prisma.

---

# 19. TRANSACTIONS

Campos:

```text
id
company_id
order_id
description
type
category
value
status
payment_method
transaction_date
due_date
paid_at
notes
attachment_url
created_at
updated_at
```

Tipos:

```text
income
expense
```

Status:

```text
pending
completed
```

Implementar CRUD e filtros.

---

# 20. QUICK REPLIES

Implementar:

```text
id
company_id
shortcut
message_text
created_by
usage_count
created_at
updated_at
```

CRUD completo.

---

# 21. NOTIFICATIONS

Implementar:

```text
id
user_id
company_id
type
title
message
is_read
related_entity_type
related_entity_id
created_at
```

Tipos:

```text
order
message
payment
stock
automation
```

Endpoints para:

* listar;
* visualizar;
* marcar como lida;
* marcar todas como lidas;
* excluir.

---

# 22. AUTENTICAÇÃO

Criar:

```text
POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

Utilizar JWT.

Access token com tempo curto.

Refresh token com estratégia segura.

Senhas:

```text
argon2
```

ou:

```text
bcrypt
```

Nunca armazenar senha em texto puro.

---

# 23. AUTORIZAÇÃO

Criar middleware:

```text
authenticate
authorize
tenant
```

Exemplo:

```js
authorize('admin')
```

ou:

```js
authorize('admin', 'manager')
```

Permissões:

### admin

Acesso total.

### manager

Acesso administrativo quase completo.

### operator

Acesso operacional limitado.

---

# 24. API REST

Prefixo:

```text
/api/v1
```

Exemplos:

```text
GET    /api/v1/customers
GET    /api/v1/customers/:id
POST   /api/v1/customers
PATCH  /api/v1/customers/:id
DELETE /api/v1/customers/:id
```

Fazer isso para todos os módulos.

---

# 25. PAGINAÇÃO

Todas as listagens devem possuir paginação.

Exemplo:

```text
?page=1&limit=20
```

Resposta:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Limitar `limit` para evitar abuso.

---

# 26. FILTROS

Criar filtros utilizando query params.

Exemplo:

```text
/customers?status=active
/products?category=beleza
/orders?status=completed
/conversations?channel=whatsapp
/transactions?type=income
```

---

# 27. PADRÃO DE RESPONSE

Sucesso:

```json
{
  "success": true,
  "data": {}
}
```

Lista:

```json
{
  "success": true,
  "data": [],
  "pagination": {}
}
```

Erro:

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Customer not found"
  }
}
```

Nunca retornar stack trace em produção.

---

# 28. TRATAMENTO DE ERROS

Criar classes:

```text
AppError
ValidationError
NotFoundError
UnauthorizedError
ForbiddenError
ConflictError
```

Criar:

```text
globalErrorHandler
```

Mapear corretamente erros do Prisma.

---

# 29. SEGURANÇA

Implementar:

* Helmet;
* CORS configurável;
* rate limit;
* JWT;
* hashing de senha;
* validação Zod;
* sanitização;
* Prisma;
* queries parametrizadas;
* proteção contra mass assignment;
* proteção multi-tenant;
* limite de payload;
* tratamento seguro de erros.

Nunca confiar nos dados enviados pelo frontend.

---

# 30. LOGGING

Utilizar Pino.

Logs estruturados:

```text
info
warn
error
debug
```

Não registrar:

* senhas;
* tokens;
* dados sensíveis desnecessários.

---

# 31. DASHBOARD API

Criar módulo:

```text
modules/dashboard
```

Criar endpoints para as métricas utilizadas pelo frontend.

Exemplo:

```text
GET /api/v1/dashboard/overview
GET /api/v1/dashboard/revenue
GET /api/v1/dashboard/orders
GET /api/v1/dashboard/customers
GET /api/v1/dashboard/conversations
GET /api/v1/dashboard/top-products
GET /api/v1/dashboard/customer-segments
GET /api/v1/dashboard/conversations-by-channel
```

As métricas devem sempre respeitar:

```text
company_id
```

Nunca retornar dados de outro tenant.

---

# 32. MÉTRICAS

Implementar:

### Revenue

Soma dos pedidos:

```text
status = completed
```

### Orders

Quantidade de pedidos.

### Customers

Quantidade de clientes ativos.

### Conversations

Quantidade de conversas.

### Monthly revenue

Agrupar por mês.

### Top products

Ordenar por quantidade vendida.

### Customer segmentation

Agrupar:

```text
vip
frequent
occasional
new
```

### Conversations by channel

Agrupar:

```text
whatsapp
instagram
facebook
site
```

---

# 33. ÍNDICES

Criar índices de acordo com a especificação.

Principalmente:

```text
company_id
status
created_at
order_date
customer_id
conversation_id
category
channel
role
is_active
```

Criar índices compostos quando fizer sentido.

---

# 34. RELACIONAMENTOS

Configurar corretamente no Prisma:

```text
Company
 ├── Users
 ├── Customers
 ├── Products
 ├── Orders
 ├── Conversations
 ├── AutomationFlows
 ├── Transactions
 ├── QuickReplies
 └── Notifications

Customer
 ├── Orders
 └── Conversations

Order
 ├── Customer
 ├── OrderItems
 └── Transactions

Product
 └── OrderItems

Conversation
 └── Messages
```

Utilizar `onDelete` adequado.

Por exemplo:

```text
Order -> OrderItems = CASCADE
Conversation -> Messages = CASCADE
Conversation -> Customer = SET NULL
Conversation -> User = SET NULL
Transaction -> Order = SET NULL
```

---

# 35. SEED

Criar seed funcional.

Criar:

```text
1 empresa
3 usuários
10 clientes
10 produtos
alguns pedidos
order_items
conversas
mensagens
automation flows
transactions
quick replies
notifications
```

Criar usuários:

```text
admin
manager
operator
```

Nunca colocar senha real.

Utilizar senha de desenvolvimento documentada no `.env.example`.

---

# 36. TESTES

Criar testes unitários e de integração.

Testar:

### Auth

* login;
* senha inválida;
* token inválido;
* usuário inexistente.

### Users

* CRUD;
* permissões.

### Companies

* CRUD.

### Customers

* CRUD;
* tenant isolation.

### Products

* CRUD;
* estoque;
* tenant isolation.

### Orders

* criação;
* cálculo;
* estoque;
* cancelamento;
* tenant isolation.

### Conversations

* CRUD;
* mensagens.

### Transactions

* CRUD.

### Dashboard

* métricas;
* isolamento por empresa.

---

# 37. TESTE CRÍTICO DE MULTI-TENANCY

Criar testes explícitos.

Cenário:

```text
Company A
Company B
```

Usuário A pertence à Company A.

Usuário B pertence à Company B.

Criar:

```text
customerA
customerB
```

Usuário A NÃO pode:

```text
GET customerB
PATCH customerB
DELETE customerB
```

O mesmo teste deve existir para:

```text
products
orders
conversations
messages
automation_flows
transactions
notifications
quick_replies
```

Esse requisito é obrigatório.

---

# 38. DOCUMENTAÇÃO

Criar:

```text
docs/
├── architecture.md
├── database.md
├── api.md
├── authentication.md
├── multi-tenancy.md
└── development.md
```

Adicionar Swagger/OpenAPI.

Endpoint:

```text
/api/docs
```

---

# 39. ENVIRONMENT

Criar:

```text
.env.example
```

Com:

```env
NODE_ENV=development
PORT=7171

DATABASE_URL=

JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=

JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

CORS_ORIGIN=http://localhost:5173

LOG_LEVEL=info
```

Nunca criar `.env` real no Git.

Adicionar:

```text
.env
.env.*
!.env.example
```

ao `.gitignore`, conforme necessário.

---

# 40. SCRIPTS NPM

Criar:

```json
{
  "scripts": {
    "dev": "node --watch src/server.js",
    "start": "node src/server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:seed": "node prisma/seed.js",
    "db:studio": "prisma studio"
  }
}
```

---

# 41. HEALTH CHECK

Criar:

```text
GET /health
GET /ready
```

`/health`:

```json
{
  "status": "ok"
}
```

`/ready` deve verificar conexão com PostgreSQL.

---

# 42. PADRÃO DE CÓDIGO

Utilizar:

* async/await;
* funções pequenas;
* nomes claros;
* módulos independentes;
* dependency boundaries;
* tratamento de erros;
* comentários somente quando necessários.

Evitar:

* código duplicado;
* funções gigantes;
* controllers gigantes;
* services gigantes;
* `try/catch` repetitivo desnecessário;
* acesso global ao Prisma;
* variáveis globais;
* regras de negócio espalhadas.

---

# 43. PRINCÍPIO IMPORTANTE

Não implemente apenas uma estrutura visual.

O projeto deve ser **executável**.

Ao finalizar, deve ser possível:

```bash
npm install
```

configurar:

```text
.env
```

executar:

```bash
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

e acessar:

```text
http://localhost:7171
```

---

# 44. IMPLEMENTAÇÃO POR FASES

Execute a implementação nesta ordem:

## FASE 1 — Foundation

Criar:

* package.json;
* Express;
* configuração;
* logger;
* Prisma;
* PostgreSQL;
* health check;
* error handler.

## FASE 2 — Database

Criar:

* schema Prisma;
* enums;
* relacionamentos;
* índices;
* constraints;
* migrations.

## FASE 3 — Auth

Implementar:

* users;
* login;
* JWT;
* password hashing;
* roles;
* middleware.

## FASE 4 — Multi-tenancy

Implementar:

* company;
* company context;
* tenant middleware;
* isolamento.

## FASE 5 — CRUDs

Implementar:

```text
customers
products
orders
order-items
conversations
messages
automation-flows
transactions
quick-replies
notifications
```

## FASE 6 — Dashboard

Implementar métricas.

## FASE 7 — Segurança

Implementar:

* rate limit;
* Helmet;
* CORS;
* validation;
* authorization;
* tenant isolation.

## FASE 8 — Tests

Criar testes unitários e integração.

## FASE 9 — Documentation

Criar Swagger + documentação Markdown.

## FASE 10 — Final Audit

Executar:

```bash
npm test
npx prisma validate
npx prisma generate
npm run db:seed
```

Corrigir TODOS os erros encontrados.

---

# 45. REGRAS IMPORTANTES PARA O QWEN CODER

NÃO pare apenas na criação dos arquivos.

NÃO entregue pseudocódigo.

NÃO crie funções vazias.

NÃO use:

```js
// TODO
```

para funcionalidades obrigatórias.

NÃO deixe:

```js
throw new Error("Not implemented")
```

em funcionalidades solicitadas.

NÃO invente campos incompatíveis com o banco especificado.

Se houver necessidade técnica de adicionar algum campo, documente claramente a razão.

Antes de modificar a estrutura definida pela especificação, verifique se a alteração é realmente necessária.

---

# 46. REVISÃO AUTOMÁTICA

Depois de criar o projeto, faça uma auditoria completa.

Verifique:

### Arquitetura

* [ ] módulos separados
* [ ] controllers separados
* [ ] services separados
* [ ] repositories separados
* [ ] validators separados
* [ ] routes separadas

### Banco

* [ ] Prisma válido
* [ ] PostgreSQL
* [ ] migrations
* [ ] relacionamentos
* [ ] foreign keys
* [ ] índices
* [ ] enums
* [ ] constraints

### Segurança

* [ ] JWT
* [ ] password hash
* [ ] authorization
* [ ] tenant isolation
* [ ] Zod
* [ ] Helmet
* [ ] rate limit
* [ ] CORS

### API

* [ ] CRUD
* [ ] paginação
* [ ] filtros
* [ ] ordenação
* [ ] busca
* [ ] respostas padronizadas
* [ ] erros padronizados

### Testes

* [ ] unit tests
* [ ] integration tests
* [ ] authentication tests
* [ ] authorization tests
* [ ] tenant isolation tests

### Documentação

* [ ] README
* [ ] arquitetura
* [ ] banco
* [ ] API
* [ ] autenticação
* [ ] multi-tenancy
* [ ] Swagger

---

# 47. ENTREGA FINAL

Ao terminar, mostre:

1. árvore completa do projeto;
2. stack utilizada;
3. entidades criadas;
4. relacionamentos;
5. endpoints;
6. estratégia de autenticação;
7. estratégia de multi-tenancy;
8. migrations criadas;
9. seed criado;
10. testes criados;
11. comandos para instalar;
12. comandos para executar;
13. comandos para testar;
14. credenciais de desenvolvimento geradas pelo seed;
15. possíveis pontos futuros de expansão.

Mais importante:

**CONSTRUA O PROJETO COMPLETO NO DIRETÓRIO DE TRABALHO.**

Não apenas explique como fazer.

Antes de finalizar, execute os testes e valide o projeto.

Se encontrar erros, corrija-os antes de apresentar a conclusão.

A implementação deve estar pronta para ser integrada ao frontend do dashboard DiixWhatsApp.
