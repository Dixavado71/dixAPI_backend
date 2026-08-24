import prisma from '../../../infrastructure/database/prismaClient.js';

export async function findAll(companyId, { skip, take, search, status, segment }) {
  const where = { company_id: companyId };
  
  if (status) where.status = status;
  if (segment) where.segment = segment;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }
  
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({ where, skip, take, orderBy: { created_at: 'desc' } }),
    prisma.customer.count({ where }),
  ]);
  
  return { customers, total };
}

export async function findById(id, companyId) {
  return prisma.customer.findFirst({ where: { id, company_id: companyId } });
}

export async function create(data) {
  return prisma.customer.create({ data });
}

export async function update(id, data) {
  return prisma.customer.update({ where: { id }, data });
}

export async function remove(id) {
  return prisma.customer.delete({ where: { id } });
}

export default { findAll, findById, create, update, remove };
