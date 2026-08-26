import { ForbiddenError, ConflictError } from '../../../shared/errors/AppError.js';
import { hashPassword } from '../../../infrastructure/security/password.js';
import * as adminRepository from '../repositories/adminRepository.js';

/* ===== Admin (master) ===== */

function storeDto(store) {
  const active = store.subscription?.status === 'active';
  return {
    id: store.id,
    name: store.name,
    trade_name: store.trade_name,
    status: store.status,
    plan: store.subscription?.plan?.name ?? 'Sem plano',
    plan_code: store.subscription?.plan?.code ?? null,
    mrr: active ? Number(store.subscription.price) : 0,
    owner: store.support_email ?? null,
    email: store.support_email,
    created: store.created_at,
    sales: store._count.orders,
    customers: store._count.customers,
    reseller: store.reseller?.name ?? null,
  };
}

export async function getOverview() {
  const stores = await adminRepository.findAllStores({ limit: 50 });
  const payments = await adminRepository.findAllPayments({ limit: 50 });
  const activeStores = stores.filter((s) => s.status === 'active');
  const mrr = activeStores.reduce((a, s) => a + (s.subscription?.status === 'active' ? Number(s.subscription.price) : 0), 0);
  const paid = payments.filter((p) => p.status === 'paid').reduce((a, p) => a + Number(p.amount), 0);
  return {
    activeStores: activeStores.length,
    totalStores: await adminRepository.countStores(),
    mrr,
    paidThisMonth: paid,
    overdueStores: stores.filter((s) => s.status === 'suspended' || s.status === 'pending').length,
    recentStores: stores.slice(0, 5).map(storeDto),
    recentPayments: payments.slice(0, 5).map((p) => ({
      id: p.id,
      storeName: p.company.name,
      amount: Number(p.amount),
      status: p.status,
      date: p.created_at,
    })),
  };
}

export async function listStores(page, limit) {
  const [stores, total] = await Promise.all([
    adminRepository.findAllStores({ page, limit }),
    adminRepository.countStores(),
  ]);
  return { data: stores.map(storeDto), total, page: Math.max(page, 1), limit: Math.min(Math.max(limit, 1), 200) };
}

export async function listPayments(page, limit) {
  const [payments, total] = await Promise.all([
    adminRepository.findAllPayments({ page, limit }),
    adminRepository.countPayments(),
  ]);
  return {
    data: payments.map((p) => ({
      id: p.id,
      storeName: p.company.name,
      plan: p.subscription?.plan?.name ?? p.type,
      amount: Number(p.amount),
      status: p.status,
      date: p.created_at,
    })),
    total,
    page: Math.max(page, 1),
    limit: Math.min(Math.max(limit, 1), 200),
  };
}

export async function listPlans() {
  const plans = await adminRepository.findAllPlans();
  return plans.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    monthly_price: Number(p.monthly_price),
    yearly_price: Number(p.yearly_price),
    stores: p._count.subscriptions,
    revenue: p._count.subscriptions * Number(p.monthly_price),
  }));
}

export async function listUsers() {
  const users = await adminRepository.findAllUsers();
  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    stores: u._count.UserCompany,
    status: u.is_active ? 'active' : 'inactive',
    lastActive: u.last_login_at,
  }));
}

export async function createStore(userId, data) {
  const passwordHash = await hashPassword(data.password);
  const company = await adminRepository.createAdminStore({ ...data, passwordHash, createdBy: userId });
  return storeDto({
    ...company,
    subscription: null,
    reseller: null,
    _count: { orders: 0, customers: 0 },
  });
}

export async function createResellerStore(userId, data) {
  const reseller = requireReseller(await adminRepository.findResellerByUserId(userId));
  const passwordHash = await hashPassword(data.password);
  const company = await adminRepository.createAdminStore({
    ...data,
    passwordHash,
    createdBy: userId,
    resellerId: reseller.id,
  });
  return {
    id: company.id,
    name: company.name,
    status: company.status,
    plan: 'Sem plano',
    mrr: 0,
    sales: 0,
  };
}

/* ===== Reseller ===== */

function requireReseller(reseller) {
  if (!reseller) throw new ForbiddenError('Você não está cadastrado como revendedor.');
  return reseller;
}

export async function getResellerOverview(userId) {
  const reseller = requireReseller(await adminRepository.findResellerByUserId(userId));
  const stores = await adminRepository.findResellerStores(reseller.id);
  const commissions = await adminRepository.findResellerCommissions(reseller.id);
  const paid = commissions.filter((c) => c.status === 'paid').reduce((a, c) => a + Number(c.amount), 0);
  const pending = commissions.filter((c) => c.status === 'pending').reduce((a, c) => a + Number(c.amount), 0);
  return {
    stores: stores.length,
    paid,
    pending,
    mrr: stores.reduce((a, s) => a + (s.subscription?.status === 'active' ? Number(s.subscription.price) : 0), 0),
    recentStores: stores.slice(0, 5).map((s) => ({
      id: s.id, name: s.name, plan: s.subscription?.plan?.name ?? 'Sem plano',
      status: s.status, mrr: s.subscription?.status === 'active' ? Number(s.subscription.price) : 0, sales: s._count.orders,
    })),
  };
}

export async function listResellerStores(userId) {
  const reseller = requireReseller(await adminRepository.findResellerByUserId(userId));
  const stores = await adminRepository.findResellerStores(reseller.id);
  return stores.map((s) => ({
    id: s.id, name: s.name, plan: s.subscription?.plan?.name ?? 'Sem plano',
    status: s.status, mrr: s.subscription?.status === 'active' ? Number(s.subscription.price) : 0,
    sales: s._count.orders,
  }));
}

export async function listResellerCommissions(userId) {
  const reseller = requireReseller(await adminRepository.findResellerByUserId(userId));
  const commissions = await adminRepository.findResellerCommissions(reseller.id);
  return commissions.map((c) => ({
    id: c.id,
    store: c.company.name,
    mrr: Number(c.base_amount),
    value: Number(c.amount),
    rate: Number(c.rate),
    status: c.status,
    period: c.created_at,
  }));
}

export async function listResellerPayments(userId) {
  const reseller = requireReseller(await adminRepository.findResellerByUserId(userId));
  const payments = await adminRepository.findResellerPayments(reseller.id);
  return payments.map((p) => ({
    id: p.id,
    storeName: p.company.name,
    amount: Number(p.amount),
    status: p.status,
    date: p.created_at,
  }));
}

export default {
  getOverview,
  listStores,
  listPayments,
  listPlans,
  listUsers,
  createStore,
  createResellerStore,
  getResellerOverview,
  listResellerStores,
  listResellerCommissions,
  listResellerPayments,
};
