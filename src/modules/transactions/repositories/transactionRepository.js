import prisma from '../../../infrastructure/database/prismaClient.js';

export function findAll(companyId, { type, status }) {
  return prisma.transaction.findMany({
    where: {
      company_id: companyId,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { transaction_date: 'desc' },
    take: 200,
  });
}

export function create(companyId, userId, data) {
  return prisma.transaction.create({
    data: {
      company_id: companyId,
      description: data.description,
      type: data.type,
      category: data.category,
      value: data.value,
      status: data.status ?? 'completed',
      payment_method: data.payment_method ?? null,
      transaction_date: data.transaction_date ? new Date(data.transaction_date) : new Date(),
      notes: data.notes ?? null,
      created_by: userId,
    },
  });
}

export default { findAll, create };
