import * as transactionRepository from '../repositories/transactionRepository.js';

export async function list(companyId, filters) {
  const transactions = await transactionRepository.findAll(companyId, filters);
  return transactions.map((t) => ({
    id: t.id,
    order_id: t.order_id,
    description: t.description,
    type: t.type,
    category: t.category,
    value: Number(t.value),
    status: t.status,
    payment_method: t.payment_method,
    date: t.transaction_date,
    created_at: t.created_at,
  }));
}

export async function create(companyId, userId, data) {
  const result = await transactionRepository.create(companyId, userId, data);
  return {
    id: result.id,
    description: result.description,
    type: result.type,
    category: result.category,
    value: Number(result.value),
    status: result.status,
    date: result.transaction_date,
  };
}

export default { list, create };