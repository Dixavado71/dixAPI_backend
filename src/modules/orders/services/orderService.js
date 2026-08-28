import { NotFoundError, BadRequestError } from '../../../shared/errors/AppError.js';
import * as repository from '../repositories/orderRepository.js';

export function listOrders(companyId, status) {
  return repository.listOrders(companyId, status);
}

export async function getOrder(companyId, id) {
  const order = await repository.findOrderById(companyId, id);
  if (!order) throw new NotFoundError('Order');
  return order;
}

export async function createOrder(companyId, data) {
  const order = await repository.createOrder(companyId, data.customerId, data.paymentMethod, data.items, data.couponCode);
  const { handleOrderEvent } = await import('../../notifications/services/orderNotificationService.js');
  await handleOrderEvent(companyId, order.id, 'order_created').catch(() => null);
  return order;
}

export async function updateOrderStatus(companyId, id, status) {
  const order = await repository.findOrderById(companyId, id);
  if (!order) throw new NotFoundError('Order');
  const patch = { status };
  if (status === 'completed' && !order.completed_at) patch.completed_at = new Date();
  await repository.updateOrder(companyId, id, patch);
  const { handleOrderEvent } = await import('../../notifications/services/orderNotificationService.js');
  if (status === 'completed') {
    await handleOrderEvent(companyId, id, 'order_completed').catch(() => null);
  }
  return repository.findUpdatedOrder(companyId, id);
}