import prisma from '../../../infrastructure/database/prismaClient.js';

export function listUsers(companyId, { role, isActive, search } = {}) {
  return prisma.user.findMany({
    where: {
      UserCompany: { some: { company_id: companyId } },
      ...(role ? { role } : {}),
      ...(typeof isActive === 'boolean' ? { is_active: isActive } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    },
    include: {
      UserCompany: {
        where: { company_id: companyId },
        select: { role: true, status: true, is_primary: true, joined_at: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export function findUserByEmail(companyId, email) {
  return prisma.user.findFirst({ where: { email, UserCompany: { some: { company_id: companyId } } } });
}

export function findUserById(companyId, id) {
  return prisma.user.findFirst({
    where: { id, UserCompany: { some: { company_id: companyId } } },
    include: {
      UserCompany: {
        where: { company_id: companyId },
        select: { role: true, status: true, is_primary: true, joined_at: true },
      },
    },
  });
}

export function createUser(data) {
  return prisma.user.create({ data });
}

export function updateUser(companyId, id, data) {
  return prisma.user.updateMany({
    where: { id, UserCompany: { some: { company_id: companyId } } },
    data,
  });
}

export function createMembership(data) {
  return prisma.userCompany.create({ data });
}

export function updateMembership(companyId, userId, data) {
  return prisma.userCompany.updateMany({ where: { user_id: userId, company_id: companyId }, data });
}

export function findMembership(companyId, userId) {
  return prisma.userCompany.findFirst({ where: { company_id: companyId, user_id: userId } });
}

export default { listUsers, findUserByEmail, findUserById, createUser, updateUser, createMembership, updateMembership, findMembership };
