import { createHash } from 'node:crypto';
import prisma from '../../../infrastructure/database/prismaClient.js';

export function hashRefreshToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function findUsersByEmail(email) {
  return prisma.user.findMany({
    where: { email },
    include: {
      company: true,
      UserCompany: {
        where: { status: 'active', removed_at: null },
        orderBy: { is_primary: 'desc' },
        take: 1,
        include: { company: true },
      },
    },
    take: 2,
  });
}

export function findUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      company: true,
      UserCompany: {
        where: { status: 'active', removed_at: null },
        orderBy: { is_primary: 'desc' },
        take: 1,
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
  return prisma.user.create({ data: userData, include: { company: true } });
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

export default { findUsersByEmail, findUserById, findActiveMembership, createMembership, createUser, updateUserLastLogin, createRefreshToken, findRefreshToken, revokeRefreshToken, revokeUserRefreshTokens, hashRefreshToken };
