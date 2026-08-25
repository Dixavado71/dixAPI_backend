import { NotFoundError } from '../../../shared/errors/AppError.js';
import * as repository from '../repositories/orderRepository.js';

export function listOrders(companyId, status) {
  return repository.listOrders(companyId, status);
}

export async function getOrder(companyId, id) {
  const order = await repository.findOrderById(companyId, id);
  if (!order) throw new NotFoundError('Order');
  return order;
}

export function createOrder(companyId, data) {
  return repository.createOrder(companyId, data.customerId, data.paymentMethod, data.items);
}