import prisma from '../../../infrastructure/database/prismaClient.js';

export async function findAll(companyId, { skip, take, search, isActive }) {
  const where = {
    id: companyId,
  };
  
  if (isActive !== undefined) {
    where.is_active = isActive;
  }
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { trade_name: { contains: search, mode: 'insensitive' } },
      { cnpj: { contains: search, mode: 'insensitive' } },
    ];
  }
  
  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
    }),
    prisma.company.count({ where }),
  ]);
  
  return { companies, total };
}

export async function findById(id, companyId) {
  return prisma.company.findFirst({
    where: {
      id,
      ...(companyId && { id: companyId }),
    },
  });
}

export async function findByCnpj(cnpj) {
  return prisma.company.findUnique({
    where: { cnpj },
  });
}

export async function create(data) {
  return prisma.company.create({ data });
}

export async function update(id, companyId, data) {
  return prisma.company.updateMany({
    where: { id, ...(companyId ? { id: companyId } : {}) },
    data,
  });
}

export async function remove(id, companyId) {
  return prisma.company.deleteMany({
    where: { id, ...(companyId ? { id: companyId } : {}) },
  });
}

export default {
  findAll,
  findById,
  findByCnpj,
  create,
  update,
  remove,
};
