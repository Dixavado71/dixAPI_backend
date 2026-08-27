---
name: nodejs-backend-project
description: Use when implementing, reviewing, refactoring, testing, or extending the dixAPI_backend Node.js/Express/Prisma REST API, including CRUD modules, PostgreSQL, multi-tenancy, authentication, authorization, delivery, payments, plans, subscriptions, migrations, and operational quality.
compatibility: Node.js 20+, JavaScript ES Modules, Express, Prisma, PostgreSQL, Zod, JWT, Pino, Vitest, Supertest
---

# Skill do Backend Node.js do Projeto

## Objetivo

Construir e manter o `dixAPI_backend` como uma API REST profissional, modular, segura, testável e preparada para produção, preservando a arquitetura atual e as regras de negócio documentadas.

O projeto utiliza Node.js com JavaScript ES Modules, Express, Prisma ORM, PostgreSQL, Zod, JWT, bcryptjs, Pino, Redis, Vitest e Supertest.

## Contexto obrigatório

Antes de implementar qualquer alteração, ler:

- `C:\DixAPI_Backend\docs\README.md` (índice da documentação central);
- `C:\DixAPI_Backend\docs\02_arquitetura.md`;
- `C:\DixAPI_Backend\docs\04_funcionalidades.md`;
- `C:\DixAPI_Backend\docs\05_progresso.md`;
- `C:\DixAPI_Backend\docs\07_expansoes.md`;
- `C:\DixAPI_Backend\docs\09_melhorias.md`;
- `C:\DixAPI_Backend\docs\10_correcoes.md`;
- `C:\DixAPI_Backend\docs\guias\guia_backend.md`;
- `C:\DixAPI_Backend\prompt.md`;
- `C:\DixAPI_Backend\database_especifications.md`;
- `README.md`;
- `package.json`;
- `prisma/schema.prisma`;
- migrations relevantes;
- repositories, services, controllers, validators e routes do módulo afetado;
- `logs/database_report.md`, quando existir;
- `logs/analysis_report.md`, que registra progresso, alterações, validações, falhas e pendências da aplicação.

A especificação do banco e o prompt mestre são contratos funcionais. Quando houver conflito, interromper a implementação da regra ambígua e registrar a divergência.

## Regras inegociáveis

1. Não adicionar comentários ao código, salvo solicitação explícita.
2. Não expor, registrar ou salvar segredos, tokens, senhas, credenciais ou dados sensíveis.
3. Nunca retornar `password_hash`, tokens brutos ou dados financeiros sem autorização.
4. Não executar migrations, seed, reset, drop, truncate ou operações destrutivas sem autorização explícita.
5. Não fazer commit, push ou pull request sem solicitação explícita.
6. Antes de editar um arquivo, ler seu conteúdo e contexto.
7. Alterar somente arquivos necessários dentro do projeto autorizado.
8. Não adicionar dependências sem verificar se já existe solução no projeto.
9. Manter JavaScript ES Modules; não introduzir TypeScript sem autorização.
10. Toda listagem deve ter paginação, filtros e ordenação quando aplicável.
11. Toda entrada externa deve ser validada com Zod.
12. Controllers não acessam Prisma diretamente.
13. Repositories não contêm regras de negócio.
14. Services concentram regras, transações e autorização contextual.
15. Toda operação multi-tenant deve aplicar escopo de empresa, revendedor ou Master.

## Arquitetura modular

Cada domínio deve seguir:

```text
src/modules/<domain>/
├── controllers/
├── services/
├── repositories/
├── validators/
├── routes/
└── index.js
```

Responsabilidades:

### Controller

- receber request;
- extrair params, query e body;
- executar schema Zod;
- chamar service;
- devolver resposta padronizada;
- encaminhar erros para `next`.

Não deve acessar Prisma, calcular regras complexas ou decidir permissões de negócio.

### Service

- aplicar regras de domínio;
- validar autorização contextual;
- verificar plano e feature;
- validar isolamento de tenant;
- coordenar múltiplos repositories;
- executar transações Prisma;
- calcular valores financeiros, estoque, taxas, troco e comissões.

### Repository

- executar operações Prisma;
- receber filtros já definidos pelo service;
- aplicar `company_id`, `reseller_id` ou escopo explícito;
- evitar consultas sem tenant quando o recurso for tenant-owned;
- retornar somente os dados necessários.

### Validator

Criar schemas separados para:

- body de criação;
- body de atualização;
- params UUID;
- query de filtros;
- paginação;
- ordenação;
- transições de status;
- operações financeiras.

Usar `.strict()` quando campos inesperados não forem permitidos.

## Domínios do projeto

### Identidade e hierarquia

Papéis globais e de loja:

- `master`: controle global da plataforma;
- `reseller`: lojas vinculadas e comissões;
- `admin`: administração de loja ou escopo autorizado;
- `manager`: gestão operacional;
- `operator`: operação limitada;
- `visitor`: ambiente demo isolado.

`UserCompany` deve ser tratado como vínculo futuro oficial para usuários em múltiplas lojas. Enquanto `User.company_id` existir, não criar fluxos que produzam divergência entre as duas fontes.

### Empresas

Master pode criar, ativar, suspender e cancelar lojas. Revendedor pode criar e administrar somente lojas do seu escopo. Usuários da loja não podem acessar outras empresas.

Estados de empresa:

- `pending`;
- `active`;
- `suspended`;
- `cancelled`.

Alterações de status devem gerar histórico e auditoria.

### Planos e assinaturas

Planos atuais:

- `simple`;
- `silver`;
- `diamond`.

Features e limites devem ser avaliados por middleware/service, nunca codificados diretamente em controllers.

Verificar:

- status da assinatura;
- período atual;
- período de tolerância;
- limite de usuários;
- limite de produtos;
- limite de pedidos;
- limite de entregadores;
- features booleanas e parametrizadas.

Pagamento aprovado pode ativar a loja. Inadimplência deve aplicar tolerância e depois restringir operações sem apagar dados.

### Clientes, produtos e pedidos

Toda entidade operacional deve carregar escopo de loja.

Pedidos devem:

- validar cliente da mesma empresa;
- validar produtos da mesma empresa;
- calcular subtotal no backend;
- calcular `total = subtotal - discount + shipping_cost`;
- nunca confiar em totais enviados pelo frontend;
- congelar preço e custo nos itens;
- atualizar estoque em transação;
- impedir estoque negativo;
- registrar histórico de status;
- aceitar idempotência.

### Delivery

Delivery é opcional por loja. Respeitar:

- `DeliverySettings.enabled`;
- `pickup_enabled`;
- zonas ativas;
- pedido mínimo;
- taxa e prazo;
- entregador pertencente à empresa;
- status válido e sequencial;
- prova de entrega quando aplicável;
- confirmação do recebedor.

Dinheiro na entrega:

- exigir `amount_received`;
- rejeitar valor recebido inferior ao total;
- calcular troco no backend;
- registrar confirmação do entregador;
- registrar data e usuário responsável;
- impedir confirmação duplicada.

WhatsApp:

- distinguir `whatsapp_manual` de `whatsapp_api`;
- preservar referência externa;
- processar webhooks com idempotência;
- nunca registrar tokens ou payloads sensíveis em logs.

### Financeiro

Separar:

- financeiro da loja;
- financeiro da plataforma Master;
- comissões de revendedores;
- repasses;
- pagamentos de pedidos;
- assinaturas.

Valores sempre devem usar Decimal no banco. Não utilizar ponto flutuante para decisões financeiras críticas. Aplicar validações de não negatividade e transações atômicas.

Operações financeiras devem possuir:

- status;
- referência externa;
- idempotency key;
- histórico de eventos;
- ator responsável;
- timestamps;
- tratamento de reembolso, falha e estorno quando aplicável.

## Multi-tenancy e autorização

Definir explicitamente o escopo antes de consultar dados:

```text
GLOBAL: Master
RESELLER: revendedor e lojas vinculadas
TENANT: loja e usuários autorizados
USER: próprio usuário
```

Nunca usar apenas:

```text
findUnique({ where: { id } })
update({ where: { id } })
delete({ where: { id } })
```

para recursos pertencentes a tenant.

Preferir filtros como:

```text
where: { id, company_id: tenantId }
```

Quando possível, reforçar no PostgreSQL com FKs compostas contendo `company_id`.

Validar especialmente:

- pedido e cliente;
- pedido e produto;
- delivery e pedido;
- delivery e entregador;
- pagamento e pedido;
- conversa e atendente;
- comissão e revendedor/loja;
- assinatura e empresa.

## Autenticação

- Login deve identificar a empresa quando o email não for globalmente único.
- Registro público não pode escolher role administrativa.
- Criação de funcionários deve ocorrer por convite ou usuário autorizado.
- Senhas devem usar hash seguro.
- Access token deve ter duração curta.
- Refresh token deve ser armazenado somente como hash.
- Refresh token deve ser rotacionado e revogado.
- Logout deve invalidar o token persistido.
- Validar usuário ativo, empresa ativa e assinatura quando a operação exigir.

## Banco e Prisma

- Usar PostgreSQL e UUID.
- Usar `Decimal` para dinheiro.
- Usar `DateTime` em UTC.
- Mapear nomes físicos consistentemente em snake_case.
- Versionar migrations em `prisma/migrations`.
- Não usar `db push` como estratégia de produção.
- Criar seed somente para desenvolvimento/demo e sem credenciais previsíveis de produção.
- Usar `select` explícito para evitar retorno excessivo.
- Evitar `include` amplo em listagens.
- Não logar parâmetros SQL sensíveis.

Antes de migration:

1. confirmar ambiente;
2. fazer backup quando aplicável;
3. comparar schema e banco;
4. revisar nullable, defaults, índices, FKs e constraints;
5. analisar risco de dados existentes;
6. pedir autorização para aplicação.

## Integridade e constraints

Quando a regra for estrutural, preferir proteção no banco:

- `CHECK (stock >= 0)`;
- `CHECK (quantity > 0)`;
- `CHECK (amount >= 0)`;
- `CHECK (change_amount >= 0)`;
- `CHECK (current_period_end > current_period_start)`;
- unicidade por tenant;
- FKs compostas para impedir referências cruzadas.

Não adicionar constraints que possam falhar com dados existentes sem antes fazer consulta de diagnóstico e plano de limpeza.

## Performance

Investigar antes de otimizar:

- N+1 queries;
- `include` desnecessário;
- listagens sem paginação;
- OFFSET em tabelas grandes;
- filtros sem índice composto;
- ORDER BY sem suporte de índice;
- transações longas;
- concorrência de estoque;
- repetição de métricas.

Usar paginação por cursor para mensagens, auditoria, transações e pedidos de grande volume quando necessário.

## Auditoria e LGPD

Auditar ações sensíveis:

- login/logout;
- criação e alteração de usuários;
- mudança de permissões;
- ativação/suspensão de loja;
- alteração de plano;
- cobrança, pagamento, estorno e repasse;
- alterações de pedidos, estoque e delivery.

Não salvar senha, token bruto, dados bancários completos ou payloads sensíveis. Mascarar IP, documentos e contatos quando necessário. Definir retenção e acesso aos logs.

## Testes obrigatórios

Criar testes unitários e de integração para:

- login por tenant;
- registro sem elevação de privilégio;
- refresh, rotação e logout;
- Master, reseller, admin, manager, operator e visitor;
- acesso cruzado entre empresas;
- CRUD com paginação e filtros;
- planos, limites e features;
- ativação e suspensão de lojas;
- cálculo de pedido;
- estoque e concorrência;
- pagamentos e idempotência;
- dinheiro e troco;
- WhatsApp manual/API;
- delivery e transições de status;
- comissões e repasses;
- tratamento de erros Prisma.

Testes que dependem de PostgreSQL devem usar banco de teste isolado e nunca credenciais de produção.

## Verificação após alterações

Executar, quando disponíveis:

```bash
npm run db:generate
npx prisma format
npx prisma validate
npm test
npm run lint
npm run typecheck
```

Também verificar:

```bash
node --input-type=module -e "import('./src/routes/index.js').then(() => console.log('routes ok'))"
```

Não considerar concluído quando houver:

- teste falhando;
- schema inválido;
- rota não carregando;
- migration sem revisão;
- segredo exposto;
- operação sem tenant;
- controller acessando Prisma;
- ausência de validação de entrada.

## Relatórios e progresso

Após cada tarefa relevante, atualizar `logs/analysis_report.md` sem apagar o histórico anterior.

O registro deve conter:

- data e hora da ação;
- objetivo da tarefa;
- arquivos alterados;
- módulos e funcionalidades afetados;
- decisões técnicas;
- comandos executados;
- testes, lint, typecheck e validações;
- falhas encontradas;
- riscos conhecidos;
- migrations não aplicadas;
- pendências e próximo passo.

Não registrar segredos, tokens, senhas, URLs privadas ou dados pessoais reais. O relatório deve distinguir claramente entre alteração local, migration criada e migration aplicada.

## Comunicação de resultados

Ao concluir uma alteração, informar de forma concisa:

- arquivos alterados;
- comportamento implementado;
- validações executadas;
- testes aprovados ou falhos;
- migrations não aplicadas;
- riscos restantes;
- referências no formato `arquivo:linha`.

Nunca afirmar que o banco foi atualizado se apenas o schema ou migration local foi alterado.
