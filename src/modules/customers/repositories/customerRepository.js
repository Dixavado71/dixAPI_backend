import prisma from '../../../infrastructure/database/prismaClient.js';

export async function findAll(companyId, { page = 1, limit = 20, search } = {}) {
  const where = { company_id: companyId };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
    prisma.customer.count({ where }),
  ]);
  return { customers, total, page, limit };
}

export function findById(companyId, id) {
  return prisma.customer.findFirst({ where: { id, company_id: companyId } });
}

export function create(companyId, data) {
  return prisma.customer.create({ data: { company_id: companyId, ...data } });
}

export function updateMany(companyId, id, data) {
  return prisma.customer.updateMany({ where: { id, company_id: companyId }, data });
}

export function deleteMany(companyId, id) {
  return prisma.customer.deleteMany({ where: { id, company_id: companyId } });
}

export default { findAll, findById, create, updateMany, deleteMany };