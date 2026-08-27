import { createHash } from 'node:crypto';
import prisma from '../../../infrastructure/database/prismaClient.js';

export function hashRefreshToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function findUsersByEmail(email) {
  return prisma.user.findMany({
    where: { email },
    include: {
      UserCompany: {
        where: { status: 'active', removed_at: null },
        orderBy: { is_primary: 'desc' },
        include: { company: true },
      },
    },
  });
}

export function findUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      UserCompany: {
        where: { status: 'active', removed_at: null },
        orderBy: { is_primary: 'desc' },
        include: { company: true },
      },
    },
  });
}

export function findActiveMembership(userId, companyId) {
  return prisma.userCompany.findFirst({
    where: { user_id: userId, company_id: companyId, status: 'active', removed_at: null },
    include: { company: true },
  });
}

export function createMembership(userId, companyId, role) {
  return prisma.userCompany.create({
    data: { user_id: userId, company_id: companyId, role, status: 'active', joined_at: new Date() },
  });
}

export function createUser(userData) {
  return prisma.user.create({ data: userData });
}

export function updateUserLastLogin(userId) {
  return prisma.user.update({ where: { id: userId }, data: { last_login_at: new Date() } });
}

export function createRefreshToken(userId, token, expiresAt) {
  return prisma.refreshToken.create({
    data: { user_id: userId, token_hash: hashRefreshToken(token), expires_at: expiresAt },
  });
}

export function findRefreshToken(token) {
  return prisma.refreshToken.findUnique({ where: { token_hash: hashRefreshToken(token) } });
}

export function revokeRefreshToken(id) {
  return prisma.refreshToken.update({ where: { id }, data: { revoked_at: new Date() } });
}

export function revokeUserRefreshTokens(userId) {
  return prisma.refreshToken.updateMany({ where: { user_id: userId, revoked_at: null }, data: { revoked_at: new Date() } });
}

export function findUserByEmailAndCompany(email, companyId) {
  return prisma.user.findFirst({
    where: { email, UserCompany: { some: { company_id: companyId } } },
  });
}

export function findActiveUserByEmail(email) {
  return prisma.user.findFirst({ where: { email, is_active: true } });
}

export function updateUserPassword(userId, passwordHash) {
  return prisma.user.update({ where: { id: userId }, data: { password_hash: passwordHash } });
}

export function findResellerByAffiliateCode(code) {
  return prisma.affiliateCode.findFirst({
    where: {
      code,
      is_active: true,
      OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
    },
    include: { reseller: true },
  });
}

export function createStoreWithSubscription(data) {
  return prisma.$transaction(async (tx) => {
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
        name: data.adminName,
        email: data.email,
        phone: data.phone ?? null,
        password_hash: data.passwordHash,
        role: 'admin',
        is_active: true,
      },
    });

    await tx.userCompany.create({
      data: {
        user_id: user.id,
        company_id: company.id,
        role: 'admin',
        status: 'active',
        is_primary: true,
        joined_at: new Date(),
      },
    });

    const plan = await tx.plan.findUnique({ where: { code: data.planCode ?? 'simple' } });
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + (plan?.trial_days ?? 14));

    await tx.companySubscription.create({
      data: {
        company_id: company.id,
        plan_id: plan?.id ?? null,
        status: 'trialing',
        billing_cycle: 'monthly',
        price: plan?.monthly_price ?? 0,
        current_period_start: now,
        current_period_end: periodEnd,
        trial_ends_at: periodEnd,
      },
    });

    await tx.companyStatusHistory.create({
      data: {
        company_id: company.id,
        from_status: null,
        to_status: 'active',
        reason: 'Store registered',
        changed_by: user.id,
      },
    });

    await tx.auditLog.create({
      data: {
        company_id: company.id,
        user_id: user.id,
        action: 'create',
        entity_type: 'company',
        entity_id: company.id,
        after_data: { name: company.name, trade_name: company.trade_name },
      },
    });

    return { user, company, membership: { role: 'admin' } };
  });
}

export default { findUsersByEmail, findUserById, findActiveMembership, createMembership, createUser, updateUserLastLogin, createRefreshToken, findRefreshToken, revokeRefreshToken, revokeUserRefreshTokens, hashRefreshToken, findUserByEmailAndCompany, findResellerByAffiliateCode, createStoreWithSubscription, findActiveUserByEmail, updateUserPassword };
