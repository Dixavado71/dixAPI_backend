import prisma from '../../../infrastructure/database/prismaClient.js';
import { ConflictError } from '../../../shared/errors/AppError.js';

/* ===== Admin (master) ===== */

export function findAllStores({ page = 1, limit = 100 } = {}) {
  const take = Math.min(Math.max(limit, 1), 200);
  const skip = (Math.max(page, 1) - 1) * take;
  return prisma.company.findMany({
    where: { company_type: 'store' },
    include: {
      subscription: { include: { plan: true } },
      reseller: { select: { id: true, name: true } },
      _count: { select: { orders: true, customers: true } },
    },
    orderBy: { created_at: 'desc' },
    take,
    skip,
  });
}

export function countStores() {
  return prisma.company.count({ where: { company_type: 'store' } });
}

export function findAllPayments({ page = 1, limit = 100 } = {}) {
  const take = Math.min(Math.max(limit, 1), 200);
  const skip = (Math.max(page, 1) - 1) * take;
  return prisma.platformTransaction.findMany({
    include: {
      company: { select: { id: true, name: true, trade_name: true } },
      subscription: { include: { plan: true } },
    },
    orderBy: { created_at: 'desc' },
    take,
    skip,
  });
}

export function countPayments() {
  return prisma.platformTransaction.count();
}

export function findAllPlans() {
  return prisma.plan.findMany({
    include: { _count: { select: { subscriptions: true } } },
    orderBy: { monthly_price: 'asc' },
  });
}

export function findAllUsers() {
  return prisma.user.findMany({
    include: {
      _count: { select: { UserCompany: true } },
    },
    orderBy: { created_at: 'desc' },
    take: 100,
  });
}

export function createAdminStore(data) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findFirst({
      where: { email: data.email, is_active: true },
      include: { UserCompany: { where: { status: 'active', removed_at: null }, take: 1 } },
    });
    if (existing) throw new ConflictError('Este e-mail já está cadastrado em uma loja ativa.');
    const company = await tx.company.create({
      data: {
        name: data.companyName,
        trade_name: data.companyTradeName ?? data.companyName,
        cnpj: data.cnpj ?? null,
        company_type: 'store',
        status: 'active',
        is_active: true,
        reseller_id: data.resellerId ?? null,
        support_email: data.email,
        support_phone: data.phone ?? null,
      },
    });
    const user = await tx.user.create({
      data: {
        company_id: company.id,
        name: data.adminName,
        email: data.email,
        phone: data.phone ?? null,
        password_hash: data.passwordHash,
        role: 'admin',
        is_active: true,
      },
    });
    await tx.userCompany.create({
      data: { user_id: user.id, company_id: company.id, role: 'admin', status: 'active', is_primary: true, joined_at: new Date() },
    });
    const plan = await tx.plan.findUnique({ where: { code: data.planCode ?? 'simple' } });
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + (plan?.trial_days ?? 14));
    await tx.companySubscription.create({
      data: {
        company_id: company.id,
        plan_id: plan?.id ?? null,
        status: 'trialing',
        billing_cycle: 'monthly',
        price: plan?.monthly_price ?? 0,
        current_period_start: now,
        current_period_end: end,
        trial_ends_at: end,
      },
    });
    await tx.companyStatusHistory.create({
      data: { company_id: company.id, from_status: null, to_status: 'active', reason: 'Created by platform admin', changed_by: data.createdBy ?? null },
    });
    await tx.auditLog.create({
      data: {
        company_id: company.id,
        user_id: data.createdBy ?? null,
        action: 'create',
        entity_type: 'company',
        entity_id: company.id,
        after_data: { name: company.name, created_by: 'platform_admin' },
      },
    });
    return company;
  });
}

/* ===== Reseller ===== */

export function findResellerByUserId(userId) {
  return prisma.reseller.findUnique({ where: { user_id: userId } });
}

export function findResellerStores(resellerId) {
  return prisma.company.findMany({
    where: { reseller_id: resellerId, company_type: 'store' },
    include: {
      subscription: { include: { plan: true } },
      _count: { select: { orders: true } },
    },
    orderBy: { created_at: 'desc' },
  });
}

export function findResellerCommissions(resellerId) {
  return prisma.commission.findMany({
    where: { reseller_id: resellerId },
    include: { company: { select: { id: true, name: true } } },
    orderBy: { created_at: 'desc' },
  });
}

export function findResellerPayments(resellerId) {
  return prisma.platformTransaction.findMany({
    where: { reseller_id: resellerId, type: 'subscription' },
    include: { company: { select: { id: true, name: true } } },
    orderBy: { created_at: 'desc' },
  });
}

export function findResellerOverview(resellerId) {
  return prisma.reseller.findUnique({
    where: { id: resellerId },
    include: {
      _count: { select: { companies: true } },
      commissions: { where: { status: 'pending' } },
      affiliate_codes: true,
    },
  });
}

export default {
  findAllStores,
  findAllPayments,
  findAllPlans,
  findAllUsers,
  createAdminStore,
  findResellerByUserId,
  findResellerStores,
  findResellerCommissions,
  findResellerPayments,
  findResellerOverview,
};
