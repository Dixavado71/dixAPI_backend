---
name: security-project
description: Use when auditing, designing, implementing, or reviewing security for the dixAPI_backend SaaS, including Node.js/Express API, Prisma/PostgreSQL, authentication, authorization, multi-tenancy, secrets, Redis, integrations, infrastructure, monitoring, and incident response.
compatibility: Node.js 20+, Express, Prisma, PostgreSQL, Redis, JWT, bcryptjs, Zod, Pino, Vitest, Supertest
---

# Skill de Segurança do SaaS

## Objetivo

Atuar como profissional de AppSec, Cloud Security e segurança de dados para todo o `dixAPI_backend`, cobrindo API, banco PostgreSQL/Prisma, Redis, conexões externas, autenticação, autorização, multi-tenancy, pagamentos, WhatsApp, observabilidade, CI/CD e operação SaaS.

## Arquivos obrigatórios

Antes de qualquer alteração, ler:

- `C:\DixAPI_Backend\docs\06_seguranca.md`;
- `C:\DixAPI_Backend\docs\02_arquitetura.md`;
- `C:\DixAPI_Backend\docs\README.md`;
- `package.json`;
- `.env.example` e arquivos de configuração sem expor segredos;
- `src/app.js`, `src/server.js` e `src/config/**`;
- middlewares de autenticação, autorização, tenant e erros;
- `src/infrastructure/security/**`;
- repositories, services, controllers, validators e routes afetados;
- `prisma/schema.prisma`;
- migrations relevantes e `prisma/seed.js`;
- `logs/security_report.md`, quando existir;
- `logs/database_report.md` e `logs/analysis_report.md`, quando existirem.

Se um arquivo obrigatório não existir, registrar a ausência no relatório e continuar com a evidência disponível.

## Regras inegociáveis

1. Nunca exibir, copiar, persistir ou registrar senhas, tokens, chaves, cookies, URLs com credenciais, DATABASE_URL, REDIS_URL ou payloads sensíveis.
2. Nunca executar exploração ofensiva, brute force, destruição, reset, drop, truncate, migração remota ou alteração de produção sem autorização explícita.
3. Nunca desabilitar TLS, validação de assinatura, rate limiting ou controles de autorização para facilitar testes.
4. Não assumir que autenticação implica autorização; verificar identidade, tenant, recurso e ação.
5. Não confiar em IDs, roles, company IDs, preços, totais, status ou permissões vindos do cliente.
6. Não adicionar dependências sem verificar o `package.json` e o risco de supply chain.
7. Não adicionar comentários ao código, salvo solicitação explícita.
8. Toda alteração deve preservar compatibilidade, rastreabilidade e possibilidade de rollback quando possível.
9. Aplicar princípio do menor privilégio em usuários, banco, Redis, serviços e integrações.
10. Atualizar `logs/security_report.md` após toda auditoria ou alteração de segurança.

## Escopo obrigatório da auditoria

Classificar cada achado como `CRÍTICO`, `ALTO`, `MÉDIO` ou `BAIXO`, usando:

```text
PROBLEMA
EVIDÊNCIA
CAUSA
IMPACTO
EXPLORAÇÃO REALISTA
SOLUÇÃO
RISCO DA CORREÇÃO
VALIDAÇÃO
```

Auditar:

- gestão de segredos e variáveis de ambiente;
- autenticação, login, registro, refresh, logout e rotação de tokens;
- armazenamento de senha, refresh token e dados pessoais;
- JWT: algoritmo permitido, issuer, audience, expiração, nonce/jti e revogação;
- autorização por papel, ação, recurso e escopo;
- isolamento entre lojas, revendedores, Master, usuários e ambiente demo;
- IDOR/BOLA em todas as rotas e repositories;
- validação Zod, payloads desconhecidos, coerção e limites de tamanho;
- SQL/NoSQL injection, command injection, path traversal, SSRF e template injection;
- XSS, CSRF, CORS, cookies, headers e política de conteúdo;
- rate limiting, brute force, abuso de endpoints e limites por tenant;
- logs, Pino, correlação, mascaramento e vazamento de dados;
- tratamento de erros e diferenças entre ambiente de desenvolvimento e produção;
- Prisma, FKs, constraints, transações, concorrência e permissões PostgreSQL;
- conexão PostgreSQL: TLS, pool, timeout, usuário dedicado e rotação;
- Redis: autenticação, TLS, ACL, isolamento de chaves, TTL e dados sensíveis;
- webhooks, assinaturas, idempotência, replay, timestamps e referências externas;
- pagamentos, delivery, documentos, comprovantes e anexos;
- WhatsApp, gateways, storage, e-mail e serviços de terceiros;
- dependências npm, lockfile, scripts perigosos e vulnerabilidades conhecidas;
- CI/CD, Docker, hospedagem, firewall, backups, restauração e migrações;
- retenção, anonimização, LGPD, auditoria e resposta a incidentes.

## Autenticação e sessões

- Hash de senha com bcrypt/Argon2 configurado com custo adequado e política de senha.
- Nunca retornar `password_hash`.
- Refresh tokens devem ser armazenados somente como hash, com expiração, revogação, rotação e detecção de reutilização.
- Access tokens devem ter expiração curta e claims mínimas.
- Validar token por assinatura, algoritmo, issuer, audience, expiração e contexto do usuário.
- Evitar mensagens que permitam enumeração de usuários.
- Aplicar rate limit específico para login, refresh, registro e recuperação de senha.
- Invalidar sessões após alteração de senha, suspeita de comprometimento e mudança crítica de privilégios.

## Multi-tenancy e autorização

Toda operação tenant-owned deve exigir escopo explícito:

```text
GLOBAL: Master autorizado
RESELLER: somente revendedores e lojas vinculadas
TENANT: somente a loja do contexto autenticado
USER: somente dados próprios quando aplicável
```

Nunca considerar suficiente:

```js
findUnique({ where: { id } })
update({ where: { id } })
delete({ where: { id } })
```

Preferir filtros com `company_id`, `reseller_id`, membership ativo e autorização contextual. Validar que todas as referências relacionadas pertencem ao mesmo tenant antes de criar ou atualizar pedidos, itens, clientes, produtos, deliveries, drivers, zonas, pagamentos, usuários, comissões e assinaturas.

## API e dados externos

- Usar schemas Zod estritos para body, params, query, headers e webhooks.
- Definir limites de tamanho, paginação, filtros e timeout.
- Rejeitar campos inesperados em operações privilegiadas.
- Usar allowlist de métodos, canais, status e transições.
- Não montar comandos, caminhos, queries ou URLs externas diretamente com entrada do usuário.
- Para SSRF, permitir somente hosts/protocolos necessários e bloquear rede interna/metadados.
- Configurar Helmet, CORS restritivo, `trust proxy` corretamente e respostas de erro sem stack em produção.
- Cookies de sessão, quando usados, devem ser `HttpOnly`, `Secure`, `SameSite` e possuir proteção CSRF adequada.

## Banco e conexões

- Usar usuário PostgreSQL dedicado, menor privilégio e TLS obrigatório em ambientes não locais.
- Não usar credenciais administrativas pela aplicação.
- Validar pool, timeouts, limites de conexão e comportamento sob falhas.
- Preferir FKs compostas ou validações transacionais para impedir referências cruzadas entre tenants.
- Usar Decimal em dinheiro e constraints para valores inválidos.
- Executar operações financeiras e estoque em transações curtas, idempotentes e com concorrência controlada.
- Nunca registrar parâmetros SQL sensíveis ou dados pessoais em logs.
- Proteger backups, dumps, migrations e ambientes de homologação.

## Redis e integrações

- Usar TLS/ACL e credenciais fora do código.
- Definir prefixos de chave por ambiente e tenant, TTL explícito e limite de memória.
- Não armazenar tokens brutos, senhas ou dados financeiros sem necessidade.
- Webhooks devem validar assinatura, timestamp, replay, origem e idempotência antes de alterar estado.
- Segredos de gateways devem estar em secret manager ou variáveis protegidas; nunca em JSONB sem criptografia apropriada.
- Aplicar timeout, retry com backoff, circuit breaker quando disponível e não repetir operações não idempotentes.

## Observabilidade e incidentes

- Logs estruturados sem segredos, tokens, senhas, documentos completos ou payloads financeiros.
- Usar request ID/correlation ID e registrar ator, tenant, ação, resultado e latência de forma minimizada.
- Alertar login anômalo, falhas repetidas, reutilização de refresh token, quebra de assinatura e acesso negado em volume anormal.
- Definir severidade, contenção, preservação de evidências, comunicação, erradicação e recuperação.
- Rotacionar segredos comprometidos e revogar sessões quando necessário.
- Registrar incidentes sem dados pessoais reais.

## Processo de implementação

1. Mapear superfície de ataque e fluxo de dados.
2. Identificar ativos, atores, trust boundaries e impacto.
3. Reproduzir somente em ambiente autorizado e sem dados reais.
4. Corrigir na camada mais próxima da origem, preferindo defesa em profundidade.
5. Adicionar teste negativo para autorização, tenant isolation e validação.
6. Validar com Prisma, testes, lint/typecheck quando disponíveis e análise de dependências.
7. Revisar diff e verificar que nenhum segredo foi introduzido.
8. Atualizar `logs/security_report.md` e, se houver impacto de banco/aplicação, os relatórios correspondentes.

## Validações recomendadas

```bash
npm audit
npx prisma validate
npm run db:generate
npm test
npm run lint
npm run typecheck
```

Executar somente comandos existentes e seguros. Não executar `db push`, reset, drop, truncate, migration deploy ou testes destrutivos sem autorização.

## Relatório obrigatório

Manter `logs/security_report.md` com:

- data e estado/commit local;
- escopo e arquivos avaliados;
- superfície de ataque;
- controles existentes;
- achados por severidade no formato obrigatório;
- correções implementadas;
- validações executadas e resultados;
- migrations criadas, não aplicadas ou aplicadas;
- riscos restantes e decisões pendentes;
- incidentes ou limitações;
- próximo passo recomendado.

Nunca incluir segredos, tokens, URLs reais, dados pessoais, payloads sensíveis ou valores financeiros reais.
