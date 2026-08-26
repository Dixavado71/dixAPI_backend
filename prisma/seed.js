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
  const plan = await prisma.plan.findUniqueOrThrow({ where: { code: PlanCode.silver } });
  for (const company of [companyOne, companyTwo]) {
    const start = new Date();
    const end = new Date(start); end.setDate(end.getDate() + 30);
    await prisma.companySubscription.upsert({ where: { company_id: company.id }, create: { company_id: company.id, plan_id: plan.id, status: SubscriptionStatus.active, billing_cycle: BillingCycle.monthly, price: plan.monthly_price, current_period_start: start, current_period_end: end }, update: { plan_id: plan.id, status: SubscriptionStatus.active, price: plan.monthly_price, current_period_start: start, current_period_end: end } });
  }
  const products = [{ name: 'Combo Aurora', description: 'Produto destaque da loja', category: 'alimentacao', price: 39.9, cost: 15, stock: 50, min_stock: 5, status: ProductStatus.active }, { name: 'Café Especial', description: 'Café torrado premium', category: 'alimentacao', price: 24.9, cost: 8, stock: 80, min_stock: 10, status: ProductStatus.active }, { name: 'Kit Brisa', description: 'Kit promocional da loja', category: 'outros', price: 59.9, cost: 22, stock: 30, min_stock: 5, status: ProductStatus.active }];
  await seedCompanyData(companyOne, products.slice(0, 2), [{ name: 'Mariana Costa', email: 'mariana@example.local', phone: '11991112222', segment: CustomerSegment.vip, status: CustomerStatus.active }, { name: 'Rafael Almeida', email: 'rafael@example.local', phone: '11992223333', segment: CustomerSegment.frequent, status: CustomerStatus.active }], [{ name: 'Carlos Entregas', phone: '11993334444', vehicle_type: VehicleType.motorcycle, vehicle_plate: 'ABC1D23', status: DriverStatus.available, provider_type: DeliveryProviderType.own }]);
  await seedCompanyData(companyTwo, products.slice(2), [{ name: 'Camila Nunes', email: 'camila@example.local', phone: '21994445555', segment: CustomerSegment.new, status: CustomerStatus.active }, { name: 'João Victor', email: 'joao@example.local', phone: '21995556666', segment: CustomerSegment.occasional, status: CustomerStatus.active }], [{ name: 'Fernanda Rotas', phone: '21996667777', vehicle_type: VehicleType.car, vehicle_plate: 'XYZ4E56', status: DriverStatus.available, provider_type: DeliveryProviderType.own }]);
  console.log('Seed demo criado/atualizado com 2 lojas, usuários, produtos, clientes, pedidos e entregadores.');
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
