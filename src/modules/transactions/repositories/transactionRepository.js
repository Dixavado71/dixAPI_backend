import prisma from '../../../infrastructure/database/prismaClient.js';
import { ConflictError } from '../../../shared/errors/AppError.js';

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

export async function findByCompanyAndIdempotencyKey(companyId, idempotencyKey) {
  if (!idempotencyKey) return null;
  return prisma.transaction.findFirst({ where: { company_id: companyId, idempotency_key: idempotencyKey } });
}

export async function create(companyId, userId, data) {
  if (data.idempotencyKey) {
    const existing = await findByCompanyAndIdempotencyKey(companyId, data.idempotencyKey);
    if (existing) throw new ConflictError('Transação já registrada com esta chave de idempotência.');
  }
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
      idempotency_key: data.idempotencyKey ?? null,
      created_by: userId,
    },
  });
}

export default { findAll, create };
