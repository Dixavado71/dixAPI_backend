import { PrismaClient, PlanCode, CompanyType, CompanyStatus, CatalogKind, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const plans = [
    { code: PlanCode.simple, name: 'Simples', monthly_price: 0, yearly_price: 0, trial_days: 14, max_users: 3, max_products: 100, max_orders_month: 200, max_drivers: 1 },
    { code: PlanCode.silver, name: 'Prata', monthly_price: 99.9, yearly_price: 999, trial_days: 14, max_users: 10, max_products: 1000, max_orders_month: 2000, max_drivers: 10 },
    { code: PlanCode.diamond, name: 'Diamante', monthly_price: 249.9, yearly_price: 2499, trial_days: 30, max_users: null, max_products: null, max_orders_month: null, max_drivers: null },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({ where: { code: plan.code }, create: plan, update: plan });
  }

  const company = await prisma.company.upsert({
    where: { cnpj: '00000000000000' },
    create: { name: 'Ambiente Demo', company_type: CompanyType.demo, status: CompanyStatus.active, cnpj: '00000000000000' },
    update: { name: 'Ambiente Demo', company_type: CompanyType.demo, status: CompanyStatus.active },
  });

  const categories = [
    { name: 'Alimentação e delivery', slug: 'alimentacao-delivery', kind: CatalogKind.store_category, is_system: true },
    { name: 'Varejo e comércio digital', slug: 'varejo-comercio-digital', kind: CatalogKind.store_category, is_system: true },
    { name: 'Serviços profissionais', slug: 'servicos-profissionais', kind: CatalogKind.store_category, is_system: true },
    { name: 'Delivery de alimentos', slug: 'delivery-alimentos', kind: CatalogKind.service_category, is_system: true },
    { name: 'Venda pelo WhatsApp', slug: 'venda-whatsapp', kind: CatalogKind.service_category, is_system: true },
    { name: 'E-commerce web', slug: 'ecommerce-web', kind: CatalogKind.service_category, is_system: true },
  ];

  for (const category of categories) {
    await prisma.catalogCategory.upsert({ where: { slug: category.slug }, create: category, update: category });
  }

  const adminPasswordHash = await bcrypt.hash('admin123', 12);
  const adminUser = await prisma.user.upsert({
    where: { company_id_email: { company_id: company.id, email: 'admin@demo.com' } },
    create: {
      company_id: company.id,
      name: 'Administrador Demo',
      email: 'admin@demo.com',
      password_hash: adminPasswordHash,
      role: UserRole.admin,
      is_active: true,
    },
    update: { password_hash: adminPasswordHash },
  });

  const managerPasswordHash = await bcrypt.hash('manager123', 12);
  const managerUser = await prisma.user.upsert({
    where: { company_id_email: { company_id: company.id, email: 'manager@demo.com' } },
    create: {
      company_id: company.id,
      name: 'Gerente Demo',
      email: 'manager@demo.com',
      password_hash: managerPasswordHash,
      role: UserRole.manager,
      is_active: true,
    },
    update: { password_hash: managerPasswordHash },
  });

  await prisma.userCompany.upsert({
    where: { user_id_company_id: { user_id: adminUser.id, company_id: company.id } },
    create: {
      user_id: adminUser.id,
      company_id: company.id,
      role: 'admin',
      is_primary: true,
      status: 'active',
    },
    update: { role: 'admin' },
  });

  await prisma.userCompany.upsert({
    where: { user_id_company_id: { user_id: managerUser.id, company_id: company.id } },
    create: {
      user_id: managerUser.id,
      company_id: company.id,
      role: 'manager',
      is_primary: true,
      status: 'active',
    },
    update: { role: 'manager' },
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
