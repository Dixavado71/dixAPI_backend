import { PrismaClient, PlanCode, CompanyType, CompanyStatus, CatalogKind, UserRole, AccountRole, UserStatus, CustomerSegment, CustomerStatus, ProductStatus, PaymentMethod, OrderStatus, DeliveryProviderType, DriverStatus, DeliveryStatus, DeliveryMode, SubscriptionStatus, BillingCycle, VehicleType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const passwordFromEnv = (key, fallback) => process.env[key] || fallback;

async function upsertUser({ companyId, email, name, role, password, phone }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    create: { name, email, phone, password_hash: passwordHash, role, is_active: true },
    update: { name, phone, password_hash: passwordHash, role, is_active: true },
  });
  await prisma.userCompany.upsert({
    where: { user_id_company_id: { user_id: user.id, company_id: companyId } },
    create: { user_id: user.id, company_id: companyId, role: role === UserRole.admin ? AccountRole.admin : role === UserRole.manager ? AccountRole.manager : AccountRole.operator, is_primary: role === UserRole.admin, status: UserStatus.active, joined_at: new Date() },
    update: { role: role === UserRole.admin ? AccountRole.admin : role === UserRole.manager ? AccountRole.manager : AccountRole.operator, status: UserStatus.active },
  });
  return user;
}

async function upsertCompany(data) {
  return prisma.company.upsert({
    where: { cnpj: data.cnpj },
    create: data,
    update: { name: data.name, trade_name: data.trade_name, status: CompanyStatus.active, is_active: true, whatsapp_enabled: true, ecommerce_enabled: true },
  });
}

async function upsertProduct(companyId, data) {
  const existing = await prisma.product.findFirst({ where: { company_id: companyId, name: data.name } });
  if (existing) return prisma.product.update({ where: { id: existing.id }, data });
  return prisma.product.create({ data: { company_id: companyId, ...data } });
}

async function upsertCustomer(companyId, data) {
  const existing = await prisma.customer.findFirst({ where: { company_id: companyId, phone: data.phone } });
  if (existing) return prisma.customer.update({ where: { id: existing.id }, data });
  return prisma.customer.create({ data: { company_id: companyId, ...data } });
}

async function upsertDriver(companyId, data) {
  const existing = await prisma.deliveryDriver.findFirst({ where: { company_id: companyId, phone: data.phone } });
  if (existing) return prisma.deliveryDriver.update({ where: { id: existing.id }, data });
  return prisma.deliveryDriver.create({ data: { company_id: companyId, ...data } });
}

async function createOrUpdateOrder(companyId, customerId, productId, number, data) {
  const existing = await prisma.order.findFirst({ where: { company_id: companyId, order_number: number } });
  if (existing) return existing;
  return prisma.order.create({
    data: {
      company_id: companyId,
      customer_id: customerId,
      order_number: number,
      status: data.status,
      payment_method: data.payment_method,
      subtotal: data.subtotal,
      discount: 0,
      shipping_cost: data.shipping_cost,
      total: data.total,
      notes: data.notes,
      order_items: { create: { product_id: productId, quantity: data.quantity, unit_price: data.unit_price, unit_cost: data.unit_cost, subtotal: data.subtotal } },
    },
  });
}

async function seedCompanyData(company, products, customers, drivers) {
  await prisma.deliverySettings.upsert({ where: { company_id: company.id }, create: { company_id: company.id, enabled: true, pickup_enabled: true, default_delivery_fee: 8, minimum_order_value: 20, estimated_min_minutes: 30, estimated_max_minutes: 60, accepted_payments: ['pix', 'cash_on_delivery', 'card_on_delivery'] }, update: { enabled: true, pickup_enabled: true, default_delivery_fee: 8, minimum_order_value: 20, estimated_min_minutes: 30, estimated_max_minutes: 60, accepted_payments: ['pix', 'cash_on_delivery', 'card_on_delivery'] } });
  await prisma.companyCustomization.upsert({ where: { company_id: company.id }, create: { company_id: company.id, brand_name: company.trade_name, primary_color: '#f59e0b', secondary_color: '#25d366', whatsapp_greeting: `Olá! Você está falando com a ${company.trade_name}.` }, update: { brand_name: company.trade_name, primary_color: '#f59e0b', secondary_color: '#25d366' } });
  const category = await prisma.catalogCategory.findUnique({ where: { slug: 'alimentacao-delivery' } });
  if (category) await prisma.companyCategory.upsert({ where: { company_id_category_id: { company_id: company.id, category_id: category.id } }, create: { company_id: company.id, category_id: category.id, is_primary: true }, update: { is_primary: true } });
  const createdProducts = [];
  for (const product of products) createdProducts.push(await upsertProduct(company.id, product));
  const createdCustomers = [];
  for (const customer of customers) createdCustomers.push(await upsertCustomer(company.id, customer));
  const createdDrivers = [];
  for (const driver of drivers) createdDrivers.push(await upsertDriver(company.id, driver));
  const order = await createOrUpdateOrder(company.id, createdCustomers[0].id, createdProducts[0].id, `${company.trade_name.slice(0, 3).toUpperCase()}-0001`, { status: OrderStatus.processing, payment_method: PaymentMethod.pix, subtotal: createdProducts[0].price, shipping_cost: 8, total: Number(createdProducts[0].price) + 8, quantity: 1, unit_price: createdProducts[0].price, unit_cost: createdProducts[0].cost, notes: 'Pedido inicial do ambiente demo' });
  const existingDelivery = await prisma.delivery.findUnique({ where: { order_id: order.id } });
  if (!existingDelivery) await prisma.delivery.create({ data: { company_id: company.id, order_id: order.id, driver_id: createdDrivers[0].id, mode: DeliveryMode.delivery, status: DeliveryStatus.assigned, recipient_name: createdCustomers[0].name, recipient_phone: createdCustomers[0].phone, address_street: 'Rua das Flores', address_number: '100', address_city: 'São Paulo', address_state: 'SP', address_zip: '01000-000', delivery_fee: 8 } });
}

async function main() {
  const plans = [
    { code: PlanCode.simple, name: 'Simples', monthly_price: 0, yearly_price: 0, trial_days: 14, max_users: 3, max_products: 100, max_orders_month: 200, max_drivers: 1 },
    { code: PlanCode.silver, name: 'Prata', monthly_price: 99.9, yearly_price: 999, trial_days: 14, max_users: 10, max_products: 1000, max_orders_month: 2000, max_drivers: 10 },
    { code: PlanCode.diamond, name: 'Diamante', monthly_price: 249.9, yearly_price: 2499, trial_days: 30, max_users: null, max_products: null, max_orders_month: null, max_drivers: null },
  ];
  for (const plan of plans) await prisma.plan.upsert({ where: { code: plan.code }, create: plan, update: plan });
  const categories = [
    { name: 'Alimentação e delivery', slug: 'alimentacao-delivery', kind: CatalogKind.store_category, is_system: true },
    { name: 'Varejo e comércio digital', slug: 'varejo-comercio-digital', kind: CatalogKind.store_category, is_system: true },
    { name: 'Serviços profissionais', slug: 'servicos-profissionais', kind: CatalogKind.store_category, is_system: true },
    { name: 'Delivery de alimentos', slug: 'delivery-alimentos', kind: CatalogKind.service_category, is_system: true },
    { name: 'Venda pelo WhatsApp', slug: 'venda-whatsapp', kind: CatalogKind.service_category, is_system: true },
    { name: 'E-commerce web', slug: 'ecommerce-web', kind: CatalogKind.service_category, is_system: true },
  ];
  for (const category of categories) await prisma.catalogCategory.upsert({ where: { slug: category.slug }, create: category, update: category });
  const companyOne = await upsertCompany({ name: 'Aurora Commerce', trade_name: 'Loja Aurora', company_type: CompanyType.store, status: CompanyStatus.active, cnpj: '11111111111111', whatsapp_enabled: true, ecommerce_enabled: true, address_city: 'São Paulo', address_state: 'SP' });
  const companyTwo = await upsertCompany({ name: 'Brisa Digital', trade_name: 'Brisa Store', company_type: CompanyType.store, status: CompanyStatus.active, cnpj: '22222222222222', whatsapp_enabled: true, ecommerce_enabled: true, address_city: 'Rio de Janeiro', address_state: 'RJ' });
  const admin = await upsertUser({ companyId: companyOne.id, email: 'admin@demo.local', name: 'Administrador da Plataforma', role: UserRole.admin, password: passwordFromEnv('SEED_ADMIN_PASSWORD', 'Admin@12345'), phone: '11990000001' });
  await prisma.userCompany.upsert({ where: { user_id_company_id: { user_id: admin.id, company_id: companyTwo.id } }, create: { user_id: admin.id, company_id: companyTwo.id, role: AccountRole.admin, is_primary: false, status: UserStatus.active, joined_at: new Date() }, update: { role: AccountRole.admin, status: UserStatus.active } });
  await upsertUser({ companyId: companyOne.id, email: 'gerente@demo.local', name: 'Gerente Operacional', role: UserRole.manager, password: passwordFromEnv('SEED_MANAGER_PASSWORD', 'Manager@12345'), phone: '11990000002' });
  await upsertUser({ companyId: companyOne.id, email: 'funcionario1@demo.local', name: 'Funcionário Aurora', role: UserRole.operator, password: passwordFromEnv('SEED_OPERATOR1_PASSWORD', 'Operator@12345'), phone: '11990000003' });
  await upsertUser({ companyId: companyTwo.id, email: 'funcionario2@demo.local', name: 'Funcionário Brisa', role: UserRole.operator, password: passwordFromEnv('SEED_OPERATOR2_PASSWORD', 'Operator@12345'), phone: '21990000004' });
  // Master platform admin
  const masterUser = await upsertUser({ companyId: companyOne.id, email: 'master@demo.local', name: 'Administrador Master', role: UserRole.master, password: passwordFromEnv('SEED_MASTER_PASSWORD', 'Master@12345'), phone: '11990000006' });
  await prisma.userCompany.upsert({
    where: { user_id_company_id: { user_id: masterUser.id, company_id: companyOne.id } },
    create: { user_id: masterUser.id, company_id: companyOne.id, role: AccountRole.admin, is_primary: true, status: UserStatus.active, joined_at: new Date() },
    update: { role: AccountRole.admin, status: UserStatus.active },
  });
  const plan = await prisma.plan.findUniqueOrThrow({ where: { code: PlanCode.silver } });
  for (const company of [companyOne, companyTwo]) {
    const start = new Date();
    const end = new Date(start); end.setDate(end.getDate() + 30);
    await prisma.companySubscription.upsert({ where: { company_id: company.id }, create: { company_id: company.id, plan_id: plan.id, status: SubscriptionStatus.active, billing_cycle: BillingCycle.monthly, price: plan.monthly_price, current_period_start: start, current_period_end: end }, update: { plan_id: plan.id, status: SubscriptionStatus.active, price: plan.monthly_price, current_period_start: start, current_period_end: end } });
  }
  const products = [{ name: 'Combo Aurora', description: 'Produto destaque da loja', category: 'alimentacao', price: 39.9, cost: 15, stock: 50, min_stock: 5, status: ProductStatus.active }, { name: 'Café Especial', description: 'Café torrado premium', category: 'alimentacao', price: 24.9, cost: 8, stock: 80, min_stock: 10, status: ProductStatus.active }, { name: 'Kit Brisa', description: 'Kit promocional da loja', category: 'outros', price: 59.9, cost: 22, stock: 30, min_stock: 5, status: ProductStatus.active }];
  await seedCompanyData(companyOne, products.slice(0, 2), [{ name: 'Mariana Costa', email: 'mariana@example.local', phone: '11991112222', segment: CustomerSegment.vip, status: CustomerStatus.active }, { name: 'Rafael Almeida', email: 'rafael@example.local', phone: '11992223333', segment: CustomerSegment.frequent, status: CustomerStatus.active }], [{ name: 'Carlos Entregas', phone: '11993334444', vehicle_type: VehicleType.motorcycle, vehicle_plate: 'ABC1D23', status: DriverStatus.available, provider_type: DeliveryProviderType.own }]);
  await seedCompanyData(companyTwo, products.slice(2), [{ name: 'Camila Nunes', email: 'camila@example.local', phone: '21994445555', segment: CustomerSegment.new, status: CustomerStatus.active }, { name: 'João Victor', email: 'joao@example.local', phone: '21995556666', segment: CustomerSegment.occasional, status: CustomerStatus.active }], [{ name: 'Fernanda Rotas', phone: '21996667777', vehicle_type: VehicleType.car, vehicle_plate: 'XYZ4E56', status: DriverStatus.available, provider_type: DeliveryProviderType.own }]);

  // Marcenaria do Kelvin — produtos de marcenaria para a loja Aurora (companyOne)
  const marcenariaProducts = [
    { name: 'Mesa de Madeira Maciça', description: 'Mesa retangular em madeira maciça de eucalipto, acabamento natural. Comporta 6 lugares.', category: 'mesas', price: 890, cost: 420, stock: 10, min_stock: 2, status: ProductStatus.active, estimated_production_days: 4, image_url: 'https://picsum.photos/seed/marcenaria-mesa/600/400' },
    { name: 'Mesa de Centro', description: 'Mesa de centro em MDF com tampo de vidro e acabamento em laca branca.', category: 'mesas', price: 450, cost: 210, stock: 15, min_stock: 3, status: ProductStatus.active, estimated_production_days: 3, image_url: 'https://picsum.photos/seed/marcenaria-mesacentro/600/400' },
    { name: 'Cadeira Rústica', description: 'Cadeira em madeira maciça com assento trançado em palha natural.', category: 'cadeiras', price: 180, cost: 85, stock: 30, min_stock: 5, status: ProductStatus.active, estimated_production_days: 2, image_url: 'https://picsum.photos/seed/marcenaria-cadeira/600/400' },
    { name: 'Cadeira Estofada', description: 'Cadeira com estrutura em compensado, estofamento em espuma D33 e revestimento em sarja.', category: 'cadeiras', price: 320, cost: 150, stock: 20, min_stock: 4, status: ProductStatus.active, estimated_production_days: 3, image_url: 'https://picsum.photos/seed/marcenaria-cadeiraestofada/600/400' },
    { name: 'Armário Planejado 3 Portas', description: 'Armário em MDF com 3 portas, prateleiras ajustáveis e pintura em laca na cor branca.', category: 'armarios', price: 1890, cost: 850, stock: 5, min_stock: 1, status: ProductStatus.active, estimated_production_days: 7, image_url: 'https://picsum.photos/seed/marcenaria-armario/600/400' },
    { name: 'Armário de Cozinha Aéreo', description: 'Armário aéreo para cozinha em MDF com portas de correr, 1,20m de largura.', category: 'armarios', price: 980, cost: 460, stock: 8, min_stock: 2, status: ProductStatus.active, estimated_production_days: 5, image_url: 'https://picsum.photos/seed/marcenaria-cozinha/600/400' },
    { name: 'Estante Modular', description: 'Estante modular em compensado naval com 5 prateleiras ajustáveis, acabamento em verniz.', category: 'estantes', price: 680, cost: 320, stock: 12, min_stock: 3, status: ProductStatus.active, estimated_production_days: 4, image_url: 'https://picsum.photos/seed/marcenaria-estante/600/400' },
    { name: 'Estante Cantinho', description: 'Estante pequena para canto em MDF, 3 prateleiras, ideal para salas compactas.', category: 'estantes', price: 390, cost: 180, stock: 15, min_stock: 3, status: ProductStatus.active, estimated_production_days: 2, image_url: 'https://picsum.photos/seed/marcenaria-estantecanto/600/400' },
    { name: 'Banco de Madeira', description: 'Banco em madeira maciça com 1,20m de comprimento, ideal para varandas e jardins.', category: 'bancos', price: 250, cost: 120, stock: 20, min_stock: 4, status: ProductStatus.active, estimated_production_days: 2, image_url: 'https://picsum.photos/seed/marcenaria-banco/600/400' },
    { name: 'Rack para TV', description: 'Rack para TV em MDF com 2 portas e 3 nichos, suporta TVs até 65 polegadas.', category: 'racks', price: 520, cost: 250, stock: 10, min_stock: 2, status: ProductStatus.active, estimated_production_days: 3, image_url: 'https://picsum.photos/seed/marcenaria-rack/600/400' },
    { name: 'Criado Mudo', description: 'Criado mudo em MDF com gaveta e nicho, acabamento em laca na cor escolhida.', category: 'criados', price: 320, cost: 150, stock: 18, min_stock: 3, status: ProductStatus.active, estimated_production_days: 2, image_url: 'https://picsum.photos/seed/marcenaria-criado/600/400' },
    { name: 'Escrivaninha', description: 'Escrivaninha em MDF com tampo de 1,00m, 3 gavetas e passagem para cabos.', category: 'escrivaninhas', price: 480, cost: 230, stock: 10, min_stock: 2, status: ProductStatus.active, estimated_production_days: 3, image_url: 'https://picsum.photos/seed/marcenaria-escrivaninha/600/400' },
    { name: 'Móvel Sob Medida', description: 'Produto base para orçamentos personalizados de móveis sob medida. Preço definido pelo atendente.', category: 'sob-medida', price: 0, cost: 0, stock: 999, min_stock: 0, status: ProductStatus.inactive, estimated_production_days: 3 },
  ];
  for (const prod of marcenariaProducts) {
    await upsertProduct(companyOne.id, prod);
  }

  // Demo reseller + affiliate code
  const resellerEmail = 'reseller@demo.local';
  const resellerUser = await upsertUser({ companyId: companyOne.id, email: resellerEmail, name: 'Revenda Demo', role: UserRole.reseller, password: passwordFromEnv('SEED_RESELLER_PASSWORD', 'Reseller@12345'), phone: '11990000005' });
  await prisma.userCompany.upsert({
    where: { user_id_company_id: { user_id: resellerUser.id, company_id: companyOne.id } },
    create: { user_id: resellerUser.id, company_id: companyOne.id, role: AccountRole.operator, is_primary: true, status: UserStatus.active, joined_at: new Date() },
    update: { role: AccountRole.operator, is_primary: true, status: UserStatus.active },
  });
  await prisma.reseller.upsert({
    where: { user_id: resellerUser.id },
    create: { user_id: resellerUser.id, name: 'Revenda Demo', email: resellerEmail, phone: '11990000005', commission_type: 'percentage', commission_value: 20, status: 'active' },
    update: { name: 'Revenda Demo', email: resellerEmail, commission_type: 'percentage', commission_value: 20 },
  });
  const reseller = await prisma.reseller.findUnique({ where: { user_id: resellerUser.id } });
  if (reseller) {
    await prisma.affiliateCode.upsert({
      where: { reseller_id_code: { reseller_id: reseller.id, code: 'REVENDA20' } },
      create: { reseller_id: reseller.id, code: 'REVENDA20', description: '20% de comissão para o revendedor', commission_rate: 0.2, is_active: true },
      update: { commission_rate: 0.2, is_active: true },
    });
    // Link companyOne to the reseller
    await prisma.company.update({ where: { id: companyOne.id }, data: { reseller_id: reseller.id } });
  }

  // Seed transactions for both companies
  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  const daysAgo2 = new Date(now); daysAgo2.setDate(daysAgo2.getDate() - 2);
  const daysAgo7 = new Date(now); daysAgo7.setDate(daysAgo7.getDate() - 7);
  const daysAgo15 = new Date(now); daysAgo15.setDate(daysAgo15.getDate() - 15);
  for (const company of [companyOne, companyTwo]) {
    const sub = await prisma.companySubscription.findFirst({ where: { company_id: company.id } });
    const subValue = sub?.price ?? plan.monthly_price;
    const owner = await prisma.user.findFirst({ where: { UserCompany: { some: { company_id: company.id, role: 'admin' } } } });
    await prisma.transaction.create({
      data: { company_id: company.id, description: `Assinatura ${plan.name} — diix`, type: 'expense', category: 'Plataforma', value: Number(subValue), status: 'completed', transaction_date: daysAgo7, created_by: owner?.id },
    });
    await prisma.transaction.create({
      data: { company_id: company.id, description: 'Venda de produtos (Combo Aurora / Kit Brisa)', type: 'income', category: 'Vendas', value: 59.9, status: 'completed', transaction_date: yesterday, created_by: owner?.id },
    });
    await prisma.transaction.create({
      data: { company_id: company.id, description: 'Fornecedor — insumos', type: 'expense', category: 'Fornecedores', value: 145.5, status: 'completed', transaction_date: daysAgo2, created_by: owner?.id },
    });
    await prisma.transaction.create({
      data: { company_id: company.id, description: 'Reposição de estoque', type: 'expense', category: 'Logística', value: 89.9, status: 'completed', transaction_date: daysAgo15, created_by: owner?.id },
    });
  }

  // Default automation flows + quick replies for demo store (Aurora)
  const defaultFlow = {
    name: 'Atendimento de vendas',
    type: 'vendas',
    description: 'Fluxo padrão de vendas com menu de produtos, pedido e transferência para atendente.',
    icon_emoji: '🛍️',
    is_active: true,
    config_json: {
      steps: [
        { id: 'welcome', type: 'message', content: 'Olá! Seja bem-vindo(a) à Loja Aurora! 🛍️ Como posso ajudar hoje?', next: 'menu' },
        {
          id: 'menu', type: 'question', content: 'Escolha uma opção abaixo:', options: [
            { label: 'Ver produtos', value: 'products', next: 'products' },
            { label: 'Fazer pedido', value: 'order', next: 'order' },
            { label: 'Falar com atendente', value: 'human', next: 'human' },
          ],
        },
        { id: 'products', type: 'message', content: 'Confira nosso catálogo: [link do catálogo] ou digite "produtos" para mais opções.', next: 'menu' },
        { id: 'order', type: 'message', content: 'Perfeito! Me diga quais itens deseja e enviaremos o resumo do pedido.', next: null },
        { id: 'human', type: 'action', action: 'transfer_to_human', next: null },
      ],
      triggers: [
        { keyword: 'oi', step: 'welcome' },
        { keyword: 'olá', step: 'welcome' },
        { keyword: 'boa noite', step: 'welcome' },
        { keyword: 'bom dia', step: 'welcome' },
        { keyword: 'boa tarde', step: 'welcome' },
        { keyword: 'menu', step: 'menu' },
        { keyword: 'cardápio', step: 'menu' },
        { keyword: 'catálogo', step: 'products' },
        { keyword: 'produtos', step: 'products' },
        { keyword: 'pedido', step: 'order' },
      ],
      defaultStep: 'welcome',
    },
  };
  const existingFlow = await prisma.automationFlow.findFirst({ where: { company_id: companyOne.id, name: defaultFlow.name } });
  if (existingFlow) {
    await prisma.automationFlow.update({ where: { id: existingFlow.id }, data: defaultFlow });
  } else {
    await prisma.automationFlow.create({ data: { company_id: companyOne.id, ...defaultFlow } });
  }

  // Loja do ZM (Farmácia) — fluxo completo de farmácia
  const lojaZmFlow = {
    name: 'Loja do ZM (Farmácia)',
    type: 'vendas',
    description: 'Fluxo completo de farmácia: verifica se o número é cliente, cadastro de novos clientes com endereço padrão, catálogo com carrinho, PIX com atendente e aviso ao motoqueiro após confirmação.',
    icon_emoji: '💊',
    is_active: false,
    config_json: {
      steps: [
        { id: 'inicio', type: 'condition', expression: 'ctx.cliente == true', next: 'bemVindoCliente', next_false: 'naoCadastrado' },
        { id: 'naoCadastrado', type: 'message', content: 'Bem vindo a farmacia ZM! Vejo que seu numero nao esta registrado em nosso sistema. Para prosseguir informe seu Codigo de Referencia ou digite *Atendente* para falar com um de nossos atendentes.', next: 'capturarResposta' },
        { id: 'capturarResposta', type: 'variable', variable: 'zm_resposta', mode: 'input', next: 'verificaAtendente' },
        { id: 'verificaAtendente', type: 'condition', expression: "String(ctx.zm_resposta || '').toLowerCase().includes('atendente')", next: 'transferirCadastro', next_false: 'codigoRegistro' },
        { id: 'codigoRegistro', type: 'message', content: 'Codigo de referencia recebido: *{zm_resposta}*. Vou te transferir para um atendente concluir seu cadastro e registrar seu endereco padrao de entrega.', next: 'transferirCadastro' },
        { id: 'transferirCadastro', type: 'action', action: 'transfer_to_human', content: 'Transferindo para um atendente concluir seu cadastro (nome, telefone e endereco padrao de entrega).' },
        { id: 'atendenteHumano', type: 'action', action: 'transfer_to_human', content: 'Transferindo para um atendente humano.' },
        { id: 'bemVindoCliente', type: 'message', content: 'Bem vindo a Farmacia ZM! Para ver nossa lista de produtos digite *Produtos* ou *Catalogo*.', next: 'iniciaCatalogo' },
        { id: 'iniciaCatalogo', type: 'action', action: 'init_catalog_loop', content: 'Confira nosso catalogo de produtos:', next: 'produto' },
        { id: 'produto', type: 'product', productSource: 'catalog', askQuantity: true, next_sim: 'produto', next_nao: 'produto', next_empty: 'temEndereco' },
        { id: 'temEndereco', type: 'condition', expression: "ctx.endereco_padrao != null && ctx.endereco_padrao != ''", next: 'enderecoPergunta', next_false: 'capturarEndereco' },
        { id: 'enderecoPergunta', type: 'question', content: 'Deseja informar um novo endereco de entrega ou usar o endereco ja cadastrado?', options: [
          { label: 'Usar endereco cadastrado', value: 'padrao', next: 'carrinho' },
          { label: 'Informar novo endereco', value: 'novo', next: 'capturarEndereco' },
        ] },
        { id: 'capturarEndereco', type: 'variable', variable: 'zm_endereco_entrega', mode: 'input', next: 'carrinho' },
        { id: 'carrinho', type: 'action', action: 'cart_summary', next: 'finalizar', next_nao: 'iniciaCatalogo' },
        { id: 'finalizar', type: 'action', action: 'cart_checkout', paymentMethod: 'pix' },
      ],
      triggers: [
        { keyword: 'oi', step: 'inicio' },
        { keyword: 'bom dia', step: 'inicio' },
        { keyword: 'ola', step: 'inicio' },
        { keyword: 'bem vindo', step: 'inicio' },
        { keyword: 'produtos', step: 'inicio' },
        { keyword: 'catalogo', step: 'inicio' },
        { keyword: 'atendente', step: 'atendenteHumano' },
      ],
      defaultStep: 'inicio',
    },
  };
  const existingLojaZm = await prisma.automationFlow.findFirst({ where: { company_id: companyOne.id, name: lojaZmFlow.name } });
  if (existingLojaZm) {
    await prisma.automationFlow.update({ where: { id: existingLojaZm.id }, data: lojaZmFlow });
  } else {
    await prisma.automationFlow.create({ data: { company_id: companyOne.id, ...lojaZmFlow } });
  }

  // Marcenaria do Kelvin — fluxo completo de marcenaria
  const marcenariaKelvinFlow = {
    name: 'Marcenaria do Kelvin',
    type: 'vendas',
    description: 'Fluxo completo de marcenaria: catálogo, orçamento sob medida (medidas, material, acabamento), protocolo de retomada, agendamento de produção com relatório de fluxo de trabalho.',
    icon_emoji: '🪚',
    is_active: false,
    config_json: {
      steps: [
        { id: 'inicio', type: 'message', content: '\u{1FA9A} *Bem vindo a Marcenaria do Kelvin!* \u{1F3E0}\n\nAqui você encontra móveis planejados, sob medida e com qualidade de artesão.\n\n\u{1F4E6} Digite *Catalogo* para ver nossos produtos\n\u{1F4CB} Digite o *protocolo* para retomar um atendimento anterior\n\u{1F3ED} Digite *Orçamento* para solicitar um móvel sob medida\n\u{1F9D1}\u200D\u{1F9F0} Digite *Atendente* para falar com um atendente humano', next: 'informarProtocolo' },
        { id: 'informarProtocolo', type: 'action', action: 'inform_protocolo_existente', content: '\u{1F4CB} Voce ja possui um protocolo de atendimento: *{protocol}*\n\nGuarde para retomar a qualquer momento.', next: 'menuPrincipal' },
        { id: 'gerarProtocoloCatalogo', type: 'action', action: 'start_atendimento', content: '\u{1F4CB} Seu protocolo de atendimento: *{protocol}*\nGuarde para retomar depois!', next: 'catalogoInicio' },
        { id: 'gerarProtocoloOrcamento', type: 'action', action: 'start_atendimento', content: '\u{1F4CB} Seu protocolo de atendimento: *{protocol}*\nGuarde para retomar depois!', next: 'orcamentoInicio' },
        { id: 'gerarProtocoloEntrega', type: 'action', action: 'start_atendimento', content: '\u{1F4CB} Seu protocolo de atendimento: *{protocol}*\nGuarde para retomar depois!', next: 'entregaPergunta' },
        { id: 'menuPrincipal', type: 'question', content: '\u{1F4CB} *O que você deseja fazer?*', options: [
          { label: '\u{1F4E6} Ver catálogo', value: 'catalogo', next: 'gerarProtocoloCatalogo' },
          { label: '\u{1F4CB} Digitar protocolo', value: 'protocolo', next: 'capturarProtocolo' },
          { label: '\u{1F3ED} Solicitar orçamento', value: 'orcamento', next: 'gerarProtocoloOrcamento' },
          { label: '\u{1F9D1}\u200D\u{1F9F0} Falar com atendente', value: 'atendente', next: 'atendenteHumano' },
          { label: '\u{1F69A} Entrega ou retirada', value: 'entrega', next: 'gerarProtocoloEntrega' },
        ] },
        { id: 'capturarProtocolo', type: 'variable', variable: 'protocolo_input', mode: 'input', next: 'validaProtocolo' },
        { id: 'validaProtocolo', type: 'action', action: 'resume_by_protocol', next: 'menuPrincipal', next_nao: 'menuPrincipal' },
        { id: 'catalogoInicio', type: 'action', action: 'init_catalog_loop', content: '\u{1F4E6} *Confira nossos produtos:*\n\nVeja abaixo os itens disponíveis no catálogo. Escolha SIM ou NÃO para cada produto.', next: 'produto' },
        { id: 'produto', type: 'product', productSource: 'catalog', askQuantity: true, next_sim: 'produto', next_nao: 'produto', next_empty: 'entregaPergunta' },
        { id: 'entregaPergunta', type: 'question', content: '\u{1F69A} *Deseja receber em casa ou retirar na marcenaria?*', options: [
          { label: '\u{1F69A} Entrega em casa', value: 'entrega', next: 'capturarEndereco' },
          { label: '\u{1F3E0} Retirar na marcenaria', value: 'retirada', next: 'carrinho' },
        ] },
        { id: 'capturarEndereco', type: 'variable', variable: 'zm_endereco_entrega', mode: 'input', next: 'carrinho' },
        { id: 'carrinho', type: 'action', action: 'cart_summary', next: 'finalizar', next_nao: 'menuPrincipal' },
        { id: 'finalizar', type: 'action', action: 'cart_checkout', paymentMethod: 'pix' },
        { id: 'orcamentoInicio', type: 'message', content: '\u{1F3ED} *Vou te ajudar com o orçamento!*\n\nPrimeiro, *qual móvel você deseja?* Escolha uma opção abaixo ou digite "Outro" para informar manualmente.', next: 'orcamentoMoveis' },
        { id: 'orcamentoMoveis', type: 'question', content: '\u{1F6CB}\uFE0F *Qual móvel você deseja?*', options: [
          { label: '\u{1F37D} Mesa', value: 'mesa', next: 'orcamentoMedidas' },
          { label: '\u{1FA91} Cadeira', value: 'cadeira', next: 'orcamentoMedidas' },
          { label: '\u{1F5C4}\uFE0F Armário', value: 'armario', next: 'orcamentoMedidas' },
          { label: '\u{1F4DA} Estante', value: 'estante', next: 'orcamentoMedidas' },
          { label: '\u{2795} Outro', value: 'outro', next: 'orcamentoOutro' },
        ] },
        { id: 'orcamentoOutro', type: 'variable', variable: 'orcamento_tipo', mode: 'input', next: 'orcamentoMedidas' },
        { id: 'orcamentoMedidas', type: 'message', content: '\u{1F4D0} *Informe as medidas do móvel:*\n\nDigite no formato *Largura x Altura x Profundidade* em centímetros.\n\nExemplo: *120x80x45*', next: 'capturarMedidas' },
        { id: 'capturarMedidas', type: 'variable', variable: 'orcamento_medidas', mode: 'input', next: 'orcamentoMaterial' },
        { id: 'orcamentoMaterial', type: 'question', content: '\u{1FAB5} *Qual o material desejado?*', options: [
          { label: '\u{1F4CB} MDF', value: 'mdf', next: 'orcamentoAcabamento' },
          { label: '\u{1FAB5} Compensado', value: 'compensado', next: 'orcamentoAcabamento' },
          { label: '\u{1F333} Maciço', value: 'macico', next: 'orcamentoAcabamento' },
          { label: '\u{2795} Outro', value: 'outro', next: 'orcamentoOutroMaterial' },
        ] },
        { id: 'orcamentoOutroMaterial', type: 'variable', variable: 'orcamento_material', mode: 'input', next: 'orcamentoAcabamento' },
        { id: 'orcamentoAcabamento', type: 'question', content: '\u{1F3A8} *Qual o acabamento?*', options: [
          { label: '\u{2728} Laca', value: 'laca', next: 'orcamentoQuantidade' },
          { label: '\u{1F3A8} Verniz', value: 'verniz', next: 'orcamentoQuantidade' },
          { label: '\u{1F341} Natural', value: 'natural', next: 'orcamentoQuantidade' },
          { label: '\u{2795} Outro', value: 'outro', next: 'orcamentoOutroAcabamento' },
        ] },
        { id: 'orcamentoOutroAcabamento', type: 'variable', variable: 'orcamento_acabamento', mode: 'input', next: 'orcamentoQuantidade' },
        { id: 'orcamentoQuantidade', type: 'message', content: '\u{1F522} *Quantas unidades?* (digite apenas o número)\n\nExemplo: *2*', next: 'capturarQtd' },
        { id: 'capturarQtd', type: 'variable', variable: 'orcamento_quantidade', mode: 'input', next: 'orcamentoResumo' },
        { id: 'orcamentoResumo', type: 'message', content: '\u{1F4CB} *Resumo do seu orçamento:*\n\n\u{1F37D} *Móvel:* {orcamento_tipo}\n\u{1F4D0} *Medidas:* {orcamento_medidas}\n\u{1FAB5} *Material:* {orcamento_material}\n\u{1F3A8} *Acabamento:* {orcamento_acabamento}\n\u{1F522} *Quantidade:* {orcamento_quantidade}', next: 'orcamentoConfirmar' },
        { id: 'orcamentoConfirmar', type: 'question', content: '\u{2705} *O que deseja fazer?*', options: [
          { label: '\u{1F4E8} Enviar para atendente', value: 'enviar', next: 'criarPedido' },
          { label: '\u{2795} Adicionar mais itens', value: 'adicionar', next: 'orcamentoMoveis' },
        ] },
        { id: 'criarPedido', type: 'action', action: 'create_custom_order', paymentMethod: 'pix', content: '\u{1F4E6} Registrando seu orçamento...', next: 'carrinho' },
        { id: 'agendarProducao', type: 'action', action: 'schedule_production', next: 'enviarAlerta' },
        { id: 'enviarAlerta', type: 'action', action: 'alert', title: 'Novo orçamento sob medida', content: '\u{1F3ED} *Novo orçamento*\n\nCliente: {telefone}\nMóvel: {orcamento_tipo}\nMedidas: {orcamento_medidas}\nMaterial: {orcamento_material}\nAcabamento: {orcamento_acabamento}\nQtd: {orcamento_quantidade}\nEndereço: {zm_endereco_entrega}', next: 'atendenteHumano' },
        { id: 'atendenteHumano', type: 'action', action: 'transfer_to_human', content: '\u{1F9D1}\u200D\u{1F9F0} *Transferindo para um atendente humano.*\n\nAguarde, em instantes alguém da nossa equipe vai te atender.' },
      ],
      triggers: [
        { keyword: 'oi', step: 'inicio' },
        { keyword: 'bom dia', step: 'inicio' },
        { keyword: 'ola', step: 'inicio' },
        { keyword: 'bem vindo', step: 'inicio' },
        { keyword: 'catalogo', step: 'catalogoInicio' },
        { keyword: 'produtos', step: 'catalogoInicio' },
        { keyword: 'atendente', step: 'atendenteHumano' },
        { keyword: 'ajuda', step: 'atendenteHumano' },
        { keyword: 'orcamento', step: 'orcamentoInicio' },
        { keyword: 'orçamento', step: 'orcamentoInicio' },
      ],
      defaultStep: 'inicio',
    },
  };
  const existingMarcenaria = await prisma.automationFlow.findFirst({ where: { company_id: companyOne.id, name: marcenariaKelvinFlow.name } });
  if (existingMarcenaria) {
    await prisma.automationFlow.update({ where: { id: existingMarcenaria.id }, data: marcenariaKelvinFlow });
  } else {
    await prisma.automationFlow.create({ data: { company_id: companyOne.id, ...marcenariaKelvinFlow } });
  }

  const quickReplies = [
    { shortcut: 'horario', message_text: 'Nosso horário de atendimento é de segunda a sábado, das 9h às 18h. 😊' },
    { shortcut: 'entrega', message_text: 'Fazemos entregas em até 60 minutos para a região. Taxa a partir de R$ 8,00.' },
    { shortcut: 'pix', message_text: 'Aceitamos PIX, cartão de crédito e dinheiro. O PIX tem 5% de desconto!' },
    { shortcut: 'endereco', message_text: 'Estamos na Rua das Flores, 100 — São Paulo/SP. Venha nos visitar!' },
  ];
  for (const qr of quickReplies) {
    await prisma.quickReply.upsert({
      where: { company_id_shortcut: { company_id: companyOne.id, shortcut: qr.shortcut } },
      create: { company_id: companyOne.id, shortcut: qr.shortcut, message_text: qr.message_text },
      update: { message_text: qr.message_text },
    });
  }

  // Cestas da Samira — loja + usuária + produtos + fluxo
  const samiraCompany = await upsertCompany({ name: 'Cestas da Samira', trade_name: 'Cestas da Samira', company_type: CompanyType.store, status: CompanyStatus.active, cnpj: '33333333333333', whatsapp_enabled: true, ecommerce_enabled: true, address_city: 'São Paulo', address_state: 'SP' });
  const samiraUser = await upsertUser({ companyId: samiraCompany.id, email: 'samirasahali29@gmail.com', name: 'Samira Sahali', role: UserRole.admin, password: passwordFromEnv('SEED_SAMIRA_PASSWORD', 'Sahali1@'), phone: '11990000007' });
  await prisma.userCompany.upsert({
    where: { user_id_company_id: { user_id: samiraUser.id, company_id: samiraCompany.id } },
    create: { user_id: samiraUser.id, company_id: samiraCompany.id, role: AccountRole.admin, is_primary: true, status: UserStatus.active, joined_at: new Date() },
    update: { role: AccountRole.admin, is_primary: true, status: UserStatus.active },
  });
  const samiraPlan = await prisma.plan.findUniqueOrThrow({ where: { code: PlanCode.silver } });
  const samiraSubStart = new Date();
  const samiraSubEnd = new Date(samiraSubStart); samiraSubEnd.setDate(samiraSubEnd.getDate() + 30);
  await prisma.companySubscription.upsert({
    where: { company_id: samiraCompany.id },
    create: { company_id: samiraCompany.id, plan_id: samiraPlan.id, status: SubscriptionStatus.active, billing_cycle: BillingCycle.monthly, price: samiraPlan.monthly_price, current_period_start: samiraSubStart, current_period_end: samiraSubEnd },
    update: { plan_id: samiraPlan.id, status: SubscriptionStatus.active, price: samiraPlan.monthly_price, current_period_start: samiraSubStart, current_period_end: samiraSubEnd },
  });
  await prisma.deliverySettings.upsert({
    where: { company_id: samiraCompany.id },
    create: { company_id: samiraCompany.id, enabled: true, pickup_enabled: true, default_delivery_fee: 12, minimum_order_value: 50, estimated_min_minutes: 30, estimated_max_minutes: 90, accepted_payments: ['pix', 'cash_on_delivery', 'card_on_delivery'] },
    update: { enabled: true, pickup_enabled: true, default_delivery_fee: 12, minimum_order_value: 50, estimated_min_minutes: 30, estimated_max_minutes: 90, accepted_payments: ['pix', 'cash_on_delivery', 'card_on_delivery'] },
  });
  await prisma.companyCustomization.upsert({
    where: { company_id: samiraCompany.id },
    create: { company_id: samiraCompany.id, brand_name: 'Cestas da Samira', primary_color: '#e91e63', secondary_color: '#fce4ec', whatsapp_greeting: 'Olá! Bem-vindo(a) à Cestas da Samira! 🧺✨' },
    update: { brand_name: 'Cestas da Samira', primary_color: '#e91e63', secondary_color: '#fce4ec' },
  });
  const samiraCategory = await prisma.catalogCategory.findUnique({ where: { slug: 'varejo-comercio-digital' } });
  if (samiraCategory) await prisma.companyCategory.upsert({ where: { company_id_category_id: { company_id: samiraCompany.id, category_id: samiraCategory.id } }, create: { company_id: samiraCompany.id, category_id: samiraCategory.id, is_primary: true }, update: { is_primary: true } });

  const samiraProducts = [
    { name: 'Cesta Básica', description: 'Cesta com itens essenciais: arroz, feijão, açúcar, café, leite, farinha, macarrão, óleo e biscoitos. Ideal para o dia a dia.', category: 'cestas', price: 89.9, cost: 55, stock: 30, min_stock: 5, status: ProductStatus.active, image_url: 'https://picsum.photos/seed/cesta-basica/600/400' },
    { name: 'Café da Manhã', description: 'Café da manhã completo: pães, frios, geleia, manteiga, café especial, suco, frutas, iogurte e granola.', category: 'cestas', price: 69.9, cost: 40, stock: 25, min_stock: 5, status: ProductStatus.active, image_url: 'https://picsum.photos/seed/cesta-cafe-manha/600/400' },
    { name: 'Cesta Gourmet', description: 'Cesta premium com vinhos, queijos finos, azeites, patês, torradas, chocolates importados e geleia artesanal.', category: 'cestas', price: 199.9, cost: 120, stock: 15, min_stock: 3, status: ProductStatus.active, image_url: 'https://picsum.photos/seed/cesta-gourmet/600/400' },
    { name: 'Cesta Personalizada', description: 'Monte sua própria cesta! Escolha os itens que deseja com ajuda da nossa equipe.', category: 'cestas', price: 149.9, cost: 90, stock: 20, min_stock: 3, status: ProductStatus.active, image_url: 'https://picsum.photos/seed/cesta-personalizada/600/400' },
    { name: 'Buquê de Rosas', description: 'Buquê com 12 rosas vermelhas importadas, embalagem especial e laço decorativo. Brinde perfeito!', category: 'brindes', price: 79.9, cost: 35, stock: 20, min_stock: 5, status: ProductStatus.active, image_url: 'https://picsum.photos/seed/buque-rosas/600/400' },
    { name: 'Caixa de Chocolates', description: 'Caixa de chocolates finos com 24 unidades sortidas: trufas, bombons, crocantes e caramelos.', category: 'brindes', price: 59.9, cost: 28, stock: 30, min_stock: 5, status: ProductStatus.active, image_url: 'https://picsum.photos/seed/caixa-chocolates/600/400' },
    { name: 'Vinho Tinto Premium', description: 'Vinho tinto seco premium, safra selecionada, acompanha taça de cristal.', category: 'bebidas', price: 89.9, cost: 50, stock: 15, min_stock: 3, status: ProductStatus.active, image_url: 'https://picsum.photos/seed/vinho-premium/600/400' },
    { name: 'Cesta de Aniversário', description: 'Cesta temática de aniversário com bolo, velas, doces finos, balões e cartão comemorativo.', category: 'cestas', price: 129.9, cost: 75, stock: 10, min_stock: 2, status: ProductStatus.active, image_url: 'https://picsum.photos/seed/cesta-aniversario/600/400' },
    { name: 'Cesta Natalina', description: 'Cesta especial de Natal com panetone, espumante, frutas secas, castanhas, rabanada e chocolate.', category: 'cestas', price: 179.9, cost: 100, stock: 10, min_stock: 2, status: ProductStatus.active, image_url: 'https://picsum.photos/seed/cesta-natalina/600/400' },
    { name: 'Cesta de Páscoa', description: 'Cesta de Páscoa com ovos de chocolate, coelhinhos, bombons, doces artesanais e cartão.', category: 'cestas', price: 149.9, cost: 85, stock: 10, min_stock: 2, status: ProductStatus.active, image_url: 'https://picsum.photos/seed/cesta-pascoa/600/400' },
  ];
  for (const prod of samiraProducts) {
    await upsertProduct(samiraCompany.id, prod);
  }

  // Fluxo da Cestas da Samira: saudação + filtro por palavras-chave do cliente.
  const samiraFlow = {
    name: 'Cestas da Samira',
    type: 'vendas',
    description: 'Fluxo de vendas: sauda a loja, apresenta o menu e responde por palavras-chave (produtos, modelos, cestas, preços, atendente).',
    icon_emoji: '\u{1F9FA}',
    is_active: true,
    config_json: {
      steps: [
        { id: 'boas_vindas', type: 'message', content: 'Olá! Bem-vindo(a) à Cestas da Samira! 🧺✨\n\nPosso te ajudar com:\n\u{1F9FA} *produtos* ou *cestas* — ver o que temos\n\u{1F4B0} *preços* — valores e modelos\n\u{1F9D1}\u200D\u{1F9F0} *atendente* — falar com um humano\n\nDigite uma das opções ou me envie sua mensagem.', next: 'menu' },
        { id: 'menu', type: 'question', content: 'O que você deseja?', options: [
          { label: 'Ver produtos', value: 'produtos', next: 'lista_produtos' },
          { label: 'Ver cestas', value: 'cestas', next: 'lista_produtos' },
          { label: 'Preços e modelos', value: 'precos', next: 'info_precos' },
          { label: 'Falar com atendente', value: 'atendente', next: 'transferir' },
          { label: 'Sair', value: 'sair', next: 'fim' },
        ] },
        { id: 'lista_produtos', type: 'message', content: '\u{1F9FA} *Nossas cestas e produtos:*\n\n\u{1F9FA} *Cesta Básica* — R$ 89,90\n\u{2615} *Café da Manhã* — R$ 69,90\n\u{1F9C1} *Cesta Gourmet* — R$ 199,90\n\u{1F381} *Cesta Personalizada* — R$ 149,90\n\u{1F490} *Buquê de Rosas* — R$ 79,90\n\u{1F36B} *Caixa de Chocolates* — R$ 59,90\n\u{1F377} *Vinho Premium* — R$ 89,90\n\u{1F382} *Cesta de Aniversário* — R$ 129,90\n\u{1F384} *Cesta Natalina* — R$ 179,90\n\u{1F430} *Cesta de Páscoa* — R$ 149,90\n\nDigite *preços* para mais detalhes ou *atendente* para falar com alguém.', next: 'menu' },
        { id: 'info_precos', type: 'message', content: '\u{1F4B0} *Preços e modelos:*\n\n\u{1F9FA} Cesta Básica — R$ 89,90\n\u{2615} Café da Manhã — R$ 69,90\n\u{1F9C1} Cesta Gourmet — R$ 199,90\n\u{1F381} Cesta Personalizada — a partir de R$ 149,90\n\u{1F490} Buquê de Rosas — R$ 79,90\n\u{1F36B} Caixa de Chocolates — R$ 59,90\n\u{1F377} Vinho Premium — R$ 89,90\n\u{1F382} Cesta de Aniversário — R$ 129,90\n\u{1F384} Cesta Natalina — R$ 179,90\n\u{1F430} Cesta de Páscoa — R$ 149,90\n\nPara montar sua cesta, fale com nosso *atendente*.', next: 'menu' },
        { id: 'transferir', type: 'action', action: 'transfer_to_human', content: '\u{1F9D1}\u200D\u{1F9F0} *Transferindo para um atendente humano.*\n\nUm instante, alguém da nossa equipe vai te atender.' },
        { id: 'fim', type: 'end', content: '\u{1F44B} Obrigado pela visita! Até logo.' },
      ],
      triggers: [
        { keyword: 'cesta', step: 'lista_produtos' },
        { keyword: 'cestas', step: 'lista_produtos' },
        { keyword: 'produto', step: 'lista_produtos' },
        { keyword: 'produtos', step: 'lista_produtos' },
        { keyword: 'modelo', step: 'lista_produtos' },
        { keyword: 'modelos', step: 'lista_produtos' },
        { keyword: 'catálogo', step: 'lista_produtos' },
        { keyword: 'catalogo', step: 'lista_produtos' },
        { keyword: 'você tem', step: 'lista_produtos' },
        { keyword: 'voce tem', step: 'lista_produtos' },
        { keyword: 'o que tem', step: 'lista_produtos' },
        { keyword: 'o que voce tem', step: 'lista_produtos' },
        { keyword: 'quero ver', step: 'lista_produtos' },
        { keyword: 'preço', step: 'info_precos' },
        { keyword: 'preco', step: 'info_precos' },
        { keyword: 'preços', step: 'info_precos' },
        { keyword: 'precos', step: 'info_precos' },
        { keyword: 'valor', step: 'info_precos' },
        { keyword: 'quanto custa', step: 'info_precos' },
        { keyword: 'quanto é', step: 'info_precos' },
        { keyword: 'atendente', step: 'transferir' },
        { keyword: 'humano', step: 'transferir' },
        { keyword: 'ajuda', step: 'transferir' },
      ],
      defaultStep: 'boas_vindas',
    },
  };
  const existingSamiraFlow = await prisma.automationFlow.findFirst({ where: { company_id: samiraCompany.id } });
  if (existingSamiraFlow) {
    await prisma.automationFlow.update({ where: { id: existingSamiraFlow.id }, data: samiraFlow });
  } else {
    await prisma.automationFlow.create({ data: { company_id: samiraCompany.id, ...samiraFlow } });
  }
  // Garante que existe apenas um fluxo para a loja da Samira.
  const extraFlows = await prisma.automationFlow.findMany({ where: { company_id: samiraCompany.id, NOT: { id: existingSamiraFlow?.id } } });
  for (const extra of extraFlows) {
    await prisma.automationFlow.delete({ where: { id: extra.id } });
  }

  await prisma.quickReply.upsert({
    where: { company_id_shortcut: { company_id: samiraCompany.id, shortcut: 'horario' } },
    create: { company_id: samiraCompany.id, shortcut: 'horario', message_text: 'Atendemos de segunda a sabado, das 8h as 20h. Aos domingos, das 9h as 14h. 🧺' },
    update: { message_text: 'Atendemos de segunda a sabado, das 8h as 20h. Aos domingos, das 9h as 14h. 🧺' },
  });
  await prisma.quickReply.upsert({
    where: { company_id_shortcut: { company_id: samiraCompany.id, shortcut: 'entrega' } },
    create: { company_id: samiraCompany.id, shortcut: 'entrega', message_text: 'Fazemos entregas em toda Sao Paulo e Grande ABC. Taxa a partir de R$ 12,00. Agendamento disponivel!' },
    update: { message_text: 'Fazemos entregas em toda Sao Paulo e Grande ABC. Taxa a partir de R$ 12,00. Agendamento disponivel!' },
  });
  await prisma.quickReply.upsert({
    where: { company_id_shortcut: { company_id: samiraCompany.id, shortcut: 'pix' } },
    create: { company_id: samiraCompany.id, shortcut: 'pix', message_text: 'Aceitamos PIX, cartao de credito e dinheiro. Pix tem 5% de desconto! 🎉' },
    update: { message_text: 'Aceitamos PIX, cartao de credito e dinheiro. Pix tem 5% de desconto! 🎉' },
  });

  console.log('Seed demo criado/atualizado com 3 lojas: Aurora, Brisa, Cestas da Samira + usuarios, produtos, clientes, pedidos, entregadores, revendedor, codigo de afiliado, fluxos de automacao, respostas rapidas e transacoes financeiras.');
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
