---
name: database-project
description: Use when auditing, modeling, validating, migrating, optimizing, securing, or extending the dixAPI_backend PostgreSQL/Prisma database, including tenants, plans, subscriptions, finance, delivery, payments, indexes, constraints, seed, migrations, and data integrity.
compatibility: PostgreSQL, Prisma ORM 5+, Node.js 20+, JavaScript ES Modules
---

# Skill de Banco de Dados do Projeto

## Objetivo

Projetar, auditar e evoluir o banco PostgreSQL do `dixAPI_backend` com modelagem relacional profissional, integridade, isolamento multi-tenant, segurança financeira, migrations reversíveis quando possível, performance mensurável e rastreabilidade completa.

## Arquivos obrigatórios

Antes de qualquer alteração, ler:

- `prisma/schema.prisma`;
- `prisma/migrations/**/migration.sql`;
- `prisma/seed.js`;
- `package.json`;
- `logs/database_report.md`;
- `logs/analysis_report.md`;
- `C:\DixAPI_Backend\docs\03_banco_de_dados.md`;
- `C:\DixAPI_Backend\docs\05_progresso.md`;
- `C:\DixAPI_Backend\docs\10_correcoes.md`;
- `database_especifications.md`;
- `prompt.md`;
- repositories e services que consultam os modelos afetados.

## Regra de segurança

Durante auditoria:

- não alterar banco remoto;
- não executar migration sem autorização explícita;
- não executar `migrate reset`, `db push`, `drop`, `truncate` ou comandos destrutivos;
- não apagar migrations existentes;
- não apagar dados;
- não expor credenciais ou valores reais;
- não registrar parâmetros SQL sensíveis.

Quando houver risco de perda, parar, explicar o risco e solicitar autorização.

## Auditoria obrigatória

Auditar sempre:

1. modelos e entidades;
2. PKs e UUIDs;
3. campos obrigatórios e opcionais;
4. defaults;
5. enums e valores aceitos;
6. FKs e ações de delete;
7. unicidade global e por tenant;
8. índices e cardinalidade esperada;
9. constraints `CHECK` necessárias;
10. relações entre tenants;
11. JSONB e necessidade de normalização;
12. Decimal e precisão monetária;
13. timestamps e timezone;
14. soft delete;
15. auditoria e histórico;
16. migrations e divergências;
17. seed e dados demo;
18. queries, paginação e concorrência;
19. exposição de dados sensíveis;
20. sincronização schema/banco real.

Classificar cada problema como `CRÍTICO`, `ALTO`, `MÉDIO` ou `BAIXO`, registrando:

```text
PROBLEMA
CAUSA
IMPACTO
SOLUÇÃO
RISCO
JUSTIFICATIVA
```

## Multi-tenancy

O projeto possui lojas como tenants. Toda entidade tenant-owned deve possuir escopo de empresa ou estar ligada por entidade tenant-owned.

Escopos:

```text
GLOBAL: administrador Master
RESELLER: revendedor e suas lojas
TENANT: loja e usuários autorizados
USER: dados do próprio usuário
```

Nunca aceitar como suficiente uma busca somente por ID:

```text
findUnique({ where: { id } })
update({ where: { id } })
delete({ where: { id } })
```

Verificar sempre `company_id`, `reseller_id` ou escopo equivalente.

Validar referências entre:

- pedido e cliente;
- pedido e produto;
- item e pedido;
- delivery e pedido;
- delivery e entregador;
- zona e loja;
- pagamento e pedido;
- pagamento e delivery;
- usuário e loja;
- comissão e revendedor/loja;
- assinatura e empresa.

Quando possível, proteger no PostgreSQL com FKs compostas contendo `company_id`.

## Modelagem financeira

Usar `Decimal` para:

- preços;
- custos;
- descontos;
- fretes;
- pagamentos;
- trocos;
- assinaturas;
- comissões;
- repasses;
- receitas e despesas.

Não usar float para cálculos financeiros.

Adicionar e revisar constraints para:

```sql
stock >= 0
quantity > 0
price >= 0
cost >= 0
amount >= 0
amount_received >= 0
change_amount >= 0
monthly_price >= 0
yearly_price >= 0
commission_value >= 0
period_end > period_start
```

Regras financeiras devem possuir status, timestamps, ator, referência externa e idempotência quando integradas a gateway ou webhook.

## Planos, lojas e assinaturas

Auditar:

- plano atual da loja;
- preço contratado congelado;
- ciclo mensal/anual;
- trial;
- tolerância;
- inadimplência;
- suspensão;
- cancelamento;
- ativação após pagamento;
- limites de usuários, produtos, pedidos e entregadores;
- features booleanas, numéricas e JSON.

Recomendar invoices, billing attempts, payment events e snapshots quando a cobrança entrar em produção.

## Delivery e pedidos

Verificar:

- delivery opcional por loja;
- retirada;
- zonas e taxas;
- pedido mínimo;
- prazo estimado;
- entregadores por tenant;
- histórico de status;
- tentativas de entrega;
- prova de entrega;
- PIN/assinatura/foto;
- dinheiro e troco;
- cartão na entrega;
- PIX na entrega;
- WhatsApp manual/API;
- pagamento idempotente.

Para pedidos, confirmar que subtotal e total são calculados no backend e que estoque e pedido são atualizados em transação.

## Migrations

Antes de criar migration:

1. verificar se migrations estão versionadas;
2. verificar o estado real do banco, quando autorizado;
3. realizar backup quando aplicável;
4. usar `prisma migrate diff` para comparar estados;
5. identificar alterações destrutivas;
6. separar mudança de estrutura e migração de dados;
7. revisar nullable, defaults, índices, FKs e constraints;
8. gerar migration incremental;
9. validar em banco de teste;
10. somente depois solicitar aplicação em staging/produção.

Nunca afirmar que uma migration foi aplicada quando apenas foi criada localmente.

## Seed

O seed deve:

- ser explícito para desenvolvimento/demo;
- ser idempotente;
- usar `upsert` quando apropriado;
- nunca conter credenciais previsíveis de produção;
- criar planos e empresa demo sem dados reais;
- não apagar tabelas;
- não depender de banco remoto de produção.

## Performance

Investigar primeiro:

- N+1;
- `include` excessivo;
- ausência de paginação;
- OFFSET em tabelas grandes;
- filtros sem índices compostos;
- ORDER BY sem suporte;
- transações longas;
- lock de estoque;
- reconciliação de métricas.

Usar cursor pagination para mensagens, auditoria, transações e pedidos de alto volume quando necessário.

Índices devem ser justificados por consulta real, normalmente iniciando por `company_id` em tabelas tenant-owned.

## Segurança

- Nunca armazenar senha em texto puro.
- Armazenar refresh tokens somente como hash.
- Não registrar parâmetros SQL.
- Não armazenar tokens de gateway em JSONB sem criptografia/segredo externo.
- Proteger comprovantes e anexos.
- Mascarar documentos e dados pessoais.
- Aplicar retenção para auditoria.
- Rotacionar credenciais expostas.

## Relatório obrigatório

Após toda auditoria ou alteração de banco, atualizar `logs/database_report.md` sem apagar o histórico importante.

O relatório deve conter:

- data da análise;
- commit/estado local quando disponível;
- schema e migrations avaliados;
- número de modelos e enums;
- entidades e campos;
- relações e índices;
- valores permitidos;
- problemas classificados por severidade;
- validações executadas;
- migrations criadas, não aplicadas ou aplicadas;
- falhas encontradas;
- riscos restantes;
- decisões pendentes;
- plano do próximo passo.

Atualizar também `logs/analysis_report.md` quando a alteração de banco afetar a aplicação, registrando impacto em repositories, services, controllers, validators, testes e rotas.

Não registrar:

- senhas;
- tokens;
- DATABASE_URL real;
- REDIS_URL real;
- dados pessoais reais;
- payloads financeiros sensíveis.

## Validação

Executar, quando disponíveis:

```bash
npx prisma format
npx prisma validate
npm run db:generate
npm test
npm run lint
npm run typecheck
```

Para migrations locais, validar geração sem aplicação quando o banco não foi autorizado:

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
```

## Relato final

Informar:

- o que foi analisado;
- o que foi alterado;
- o que foi apenas gerado localmente;
- o que não foi executado por segurança;
- validações aprovadas;
- falhas e limitações;
- referências `arquivo:linha`;
- próximo passo recomendado.
