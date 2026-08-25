# Relatório de análise e testes de endpoints

Data: 2026-08-25
Projeto: dixAPI_backend

## Inicialização

- Comando: `npm start`
- Resultado: a porta `7171` já estava em uso (`EADDRINUSE`), indicando que já havia um servidor ativo.
- Servidor usado nos testes: `http://localhost:7171`
- Não foram executados migrations, seed ou operações destrutivas.

## Validações locais

- `npm test`: aprovado — 9 arquivos, 26 testes.
- `npx prisma validate`: aprovado.
- Lint/typecheck: não disponíveis como scripts no `package.json`.

## Rotas testadas

| Método | Rota | Resultado observado |
|---|---|---|
| GET | `/health` | 200 |
| GET | `/api/docs` | 200 |
| GET | `/api/v1/auth/login` | 404; rota exige POST |
| GET | `/api/v1/auth/refresh` | 404; rota exige POST |
| GET | `/api/v1/auth/me` | 401 sem autenticação |
| GET | `/api/v1/companies` | 401 sem autenticação |
| GET | `/api/v1/delivery/settings` | 401 sem autenticação |
| GET | `/api/v1/delivery/drivers` | 401 sem autenticação |
| GET | `/api/v1/delivery` | 401 sem autenticação |
| GET | `/api/v1/coupons/validate` | 401 sem autenticação |
| GET | `/api/v1/coupons/redeem` | 401 sem autenticação |
| GET | `/api/v1/payments/events` | 401 sem autenticação |
| GET | `/api/v1/catalog/categories` | 200 |
| GET | `/api/v1/catalog/services` | 200 |
| GET | `/api/v1/catalog/company/categories` | 401 sem autenticação |
| GET | `/api/v1/catalog/company/services` | 401 sem autenticação |
| GET | `/api/v1/customers` | 401 sem autenticação |
| GET | `/api/v1/orders` | 401 sem autenticação |
| GET | `/api/v1/promotions` | 401 sem autenticação |
| GET | `/api/v1/promotions/coupons` | 401 sem autenticação |
| GET | `/api/v1/company/customization` | 401 sem autenticação |
| GET | `/api/v1/communications` | 401 sem autenticação |
| GET | `/api/v1/consent/customer/not-a-uuid` | 401 sem autenticação |
| GET | `/api/v1/products` | 401 sem autenticação |

## Rotas identificadas no código

- Auth: login, register, refresh, logout, me.
- Companies: listagem, consulta, criação, atualização e remoção.
- Delivery: configurações, drivers, entregas, status e pagamentos.
- Coupons, payments, catalog, customers, orders, promotions, customization, communications, consent e products.

## Teste autenticado — 2026-08-25

Foi usado o usuário de demonstração documentado no seed, sem registrar credenciais ou tokens no relatório. O login retornou `200`, `/api/v1/auth/me` retornou `200`, refresh com rotação retornou `200` e logout retornou `200`.

Leituras autenticadas:

- `200`: companies, customers, promotions, communications, products, catalog/company/categories, catalog/company/services, company/customization, auth/me.
- `200` inesperado para identificadores inválidos: `/api/v1/companies/not-a-uuid`; o controller/service não rejeitou o valor nessa rota.
- `500`: orders, promotions/coupons e consent/customer/not-a-uuid.
- Delivery settings, drivers e listagem de delivery apresentaram erro de requisição/timeout durante a bateria.

O health check continuou retornando `200` após os erros. Sem autenticação, as mesmas rotas protegidas continuaram retornando `401`, confirmando a barreira de autenticação.

## Correções aplicadas — 2026-08-25

- Delivery passou a executar `ensureTenant()` corretamente; settings, drivers e listagem autenticada passaram a retornar `200`.
- Controllers de delivery passaram a usar o tenant autenticado (`req.tenant.companyId`).
- Criação de pedidos passou a aguardar a operação, responder `201` e validar o body com Zod.
- Criação de pedidos passou a validar cliente/produtos, baixar estoque dentro da transação e usar atualização condicional para concorrência.
- Consulta de pedido corrigiu a ordem dos argumentos de tenant e identificador.
- Consentimento e empresas passaram a rejeitar UUID inválido com `400`.
- O handler global passou a tratar erros de validação, inicialização e indisponibilidade do Prisma sem expor detalhes internos.

Reteste após reinicialização da API: health `200`; delivery settings/drivers/lista `200`; orders e promotions/coupons retornaram `400` em vez de `500` devido à validação do banco ativo; consent e companies com UUID inválido retornaram `400`.

## Reteste completo — 2026-08-25

Foram inventariadas 52 rotas públicas/protegidas: `/health`, `/api/docs` e 50 endpoints sob `/api/v1`. O servidor foi reiniciado com o código atual e `/health` retornou `200`. A autenticação demo retornou sucesso; nenhum token ou credencial foi salvo.

### Resultados principais

- Públicos: `/health`, `/api/docs`, catálogo público: `200`.
- Leituras autenticadas saudáveis: auth/me, companies, delivery settings/drivers/lista, catálogo por empresa, customers, promotions, customization e communications: `200`.
- Validações esperadas: UUIDs inválidos e payloads inválidos retornaram `400`; rotas protegidas sem autenticação retornaram `401`.
- `/api/v1/orders`: retornou `400` por validação do banco ativo, sem `500`.
- `/api/v1/promotions/coupons`: retornou `400` por validação do banco ativo, sem `500`.

### Falhas encontradas no reteste

- `GET /api/v1/delivery/not-a-uuid`: `500`; falta validação de UUID no parâmetro de delivery.
- `GET /api/v1/products/not-a-uuid`: `500`; falta validação de UUID no parâmetro de produto.
- `DELETE /api/v1/customers/not-a-uuid`: `500`; falta validação de UUID no parâmetro de customer ou tratamento adequado no repository.
- `PATCH /api/v1/customers/not-a-uuid`: `500`; mesma lacuna de validação/tratamento.
- `DELETE /api/v1/products/not-a-uuid`: erro/timeout durante a requisição; investigar consulta, timeout e tratamento do repository.

### Operações não destrutivas

POST/PATCH/DELETE de negócio foram enviados somente com payload vazio ou identificadores inválidos para validar autenticação e rejeição de entrada. Não foram criados, alterados ou excluídos registros intencionalmente. Não foram executados seed, migrations, reset, drop ou truncate.

### Validações automatizadas

- `npm test`: 9 arquivos, 26 testes aprovados.
- `npx prisma validate`: aprovado.
- Importação das rotas: aprovada.
- `git diff --check`: sem erros.
- Lint/typecheck: não disponíveis como scripts no `package.json`.

## Conclusão

A maioria dos endpoints respondeu conforme esperado e a autenticação continua funcional. As falhas de UUID e timeout identificadas no reteste anterior foram corrigidas: delivery/products inválidos retornam `400`, customers inválidos retornam `400` e exclusão de produto inválido retorna `400`, sem timeout. Orders com payload vazio e coupons/redeem com payload vazio retornam `400` de validação, conforme esperado. Nenhuma migration, seed ou operação destrutiva foi executada.

## Correções finais — 2026-08-25

- Products: controllers agora aguardam Promises, validam body/UUID e retornam respostas HTTP corretas.
- Products: services deixaram de montar respostas HTTP e passaram a retornar dados ou `NotFoundError`.
- Customers: controllers validam body/UUID; update/delete validam tenant antes de operar por ID único.
- Delivery: parâmetros `:id` agora exigem UUID válido.
- Coupons: resgate agora usa o ID do cupom encontrado pelo código e verifica pedido/cliente no tenant dentro da transação.
- Orders: quantidade de item agora precisa ser positiva.

Reteste final — 2026-08-25

- Inventário atual: 52 rotas HTTP explícitas, mais `/api/docs`.
- Servidor reiniciado; `/health`: `200`.
- GETs públicos/documentação: `200`.
- Com autenticação demo antes da última reinicialização: leituras válidas responderam `200`; parâmetros inválidos responderam `400`.
- Escritas com payload vazio: `400` em todas as rotas testadas, sem alteração intencional de dados.
- Rotas sem token: `401` nos endpoints protegidos testados.
- Ciclo de autenticação foi testado anteriormente com sucesso; após a última reinicialização, o login demo retornou `401`, impedindo repetir o bloco autenticado final nessa instância. Isso deve ser investigado no banco/seed ativo antes de afirmar uma execução autenticada completa.
- Foi identificado e corrigido durante esta rodada o UUID ausente em PATCH/DELETE de companies; a confirmação autenticada pós-restart ficou pendente por causa do login `401`.
- `npm test`: 26 aprovados; `npx prisma validate`: aprovado; importação de rotas: aprovada; `git diff --check`: aprovado.

Reteste final: health e rotas públicas aprovados; validações e autenticação sem token aprovadas; confirmação autenticada final de companies pendente devido ao login demo `401` após reinicialização.

## Investigação do bloqueio autenticado — 2026-08-25

- Conectividade Prisma/PostgreSQL: confirmada.
- Usuários `admin@demo.com` e `manager@demo.com`: não encontrados no banco ativo.
- Empresas ativas no banco ativo: `0`.
- Conclusão: o `401` não é falha do JWT; o ambiente está sem dados demo. Não foi executado `db:seed`, migration ou operação de escrita sem autorização.
- `npm run db:seed`: executado com autorização explícita, sem erro aparente.
- Servidor reiniciado e login demo restaurado: `200`.
- Ciclo de sessão: login `200`, `/auth/me` `200`, refresh `200`, logout `200`.
- Leituras autenticadas: 15 sucessos `200`; IDs inválidos retornaram `400`; orders e promotions/coupons retornaram `400` por validação do banco ativo.
- Escritas com payload vazio/IDs inválidos: retornaram `400`; após a correção, PATCH delivery/settings e PATCH company/customization também passaram a rejeitar `{}` com `400`.
- `npx prisma migrate status`: banco informado como atualizado com 9 migrations.
- `npm run db:generate`: executado com sucesso para Prisma Client 5.22.0.
- Consultas Prisma mínimas de orders, relações, promotions e coupons passaram diretamente.
- Causa confirmada em coupons: ordenação por `created_at`, campo inexistente no modelo `Coupon`; substituída por ordenação por `code`.
- Após reinício, `GET /api/v1/orders`, `/api/v1/promotions` e `/api/v1/promotions/coupons`: `200`.
- Teste de regressão adicionado para impedir ordenação por campo inexistente.

## Validação de qualidade e segurança — 2026-08-25

- `uuid` removido por não possuir uso direto no projeto.
- `npm audit --omit=dev`: 0 vulnerabilidades runtime.
- Reteste autenticado: health `200`, orders `200`, promotions `200`, promotions/coupons `200`, delivery settings `200`.
- UUID inválido em products: `400`.
- `npm test`: 27/27 aprovados em 10 arquivos.
- Prisma validate e `git diff --check`: aprovados.
- `npm run lint`: aprovado, 96 arquivos JavaScript verificados.
- `npm run typecheck`: aprovado, 96 arquivos JavaScript verificados.
- `npm audit --omit=dev`: 0 vulnerabilidades.
- Cobertura BOLA/tenant ampliada com testes de coupons, consent e eventos de pagamento.
- Eventos de pagamento testados contra assinatura inválida, referência fora do tenant e replay.
- Pipeline CI criado em `.github/workflows/ci.yml`.
- Gates locais equivalentes aprovados após `npm ci`: 30 testes, lint/typecheck, Prisma validate e auditoria runtime.
- Vitest atualizado para `^4.1.11` para corrigir vulnerabilidades da cadeia de testes.
- `npm audit`: 0 vulnerabilidades.
- `npm audit --omit=dev`: 0 vulnerabilidades.
- `npm test`: 30/30 aprovados após a atualização.
- Lint/typecheck e Prisma validate aprovados.
- Pedido agora grava `payment_method`; número do pedido usa UUID para reduzir colisões.
- Cupom agora valida `promotionId` no tenant antes da criação.
- Não foi aplicada migration nem alteração estrutural no banco.
- Não foram executadas operações válidas de criação, alteração ou exclusão de negócio.
