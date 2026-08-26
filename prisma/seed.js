import { PrismaClient, PlanCode, CompanyType, CompanyStatus, CatalogKind, UserRole, AccountRole, UserStatus, CustomerSegment, CustomerStatus, ProductStatus, PaymentMethod, OrderStatus, DeliveryProviderType, DriverStatus, DeliveryStatus, DeliveryMode, SubscriptionStatus, BillingCycle, VehicleType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const passwordFromEnv = (key, fallback) => process.env[key] || fallback;

async function upsertUser({ companyId, email, name, role, password, phone }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { company_id_email: { company_id: companyId, email } },
    create: { company_id: companyId, name, email, phone, password_hash: passwordHash, role, is_active: true },
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
    const owner = await prisma.user.findFirst({ where: { company_id: company.id, role: 'admin' } });
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

  console.log('Seed demo criado/atualizado com 2 lojas, usuários, produtos, clientes, pedidos, entregadores, revendedor, código de afiliado, fluxo de automação, respostas rápidas e transações financeiras.');
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
