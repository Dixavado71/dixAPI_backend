import { NotFoundError, BadRequestError } from '../../../shared/errors/AppError.js';
import * as repository from '../repositories/orderRepository.js';
import { handleOrderEvent } from '../../notifications/services/orderNotificationService.js';
import { dispatchEventAsync } from '../../notifications/services/notificationService.js';

function toOrderItemDTO(item) {
  if (!item) return item;
  return {
    id: item.id,
    orderId: item.order_id,
    productId: item.product_id,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    unitCost: item.unit_cost,
    subtotal: item.subtotal,
    createdAt: item.created_at,
    product: item.product ? { id: item.product.id, name: item.product.name } : undefined,
  };
}

function toOrderDTO(order) {
  if (!order) return order;
  return {
    id: order.id,
    orderNumber: order.order_number,
    companyId: order.company_id,
    customerId: order.customer_id,
    status: order.status,
    paymentMethod: order.payment_method,
    subtotal: order.subtotal,
    discount: order.discount,
    shippingCost: order.shipping_cost,
    total: order.total,
    shippingAddress: order.shipping_address,
    notes: order.notes,
    orderDate: order.order_date,
    completedAt: order.completed_at,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    orderItems: Array.isArray(order.order_items) ? order.order_items.map(toOrderItemDTO) : undefined,
    customer: order.customer,
    payments: order.payments,
  };
}

export async function listOrders(companyId, status) {
  const orders = await repository.listOrders(companyId, status);
  return orders.map(toOrderDTO);
}

export async function getOrder(companyId, id) {
  const order = await repository.findOrderById(companyId, id);
  if (!order) throw new NotFoundError('Order');
  return toOrderDTO(order);
}

export async function createOrder(companyId, data) {
  const order = await repository.createOrder(companyId, data.customerId, data.paymentMethod, data.items, data.couponCode);
  await handleOrderEvent(companyId, order.id, 'order_created').catch(() => null);
  dispatchEventAsync({ companyId, event: 'order_created', vars: { orderNumber: order.order_number }, relatedEntityType: 'order', relatedEntityId: order.id });
  return toOrderDTO(order);
}

export async function updateOrderStatus(companyId, id, status) {
  const order = await repository.findOrderById(companyId, id);
  if (!order) throw new NotFoundError('Order');
  const patch = { status };
  if (status === 'completed' && !order.completed_at) patch.completed_at = new Date();
  await repository.updateOrder(companyId, id, patch);
  if (status === 'completed') {
    await handleOrderEvent(companyId, id, 'order_completed').catch(() => null);
    dispatchEventAsync({ companyId, event: 'order_completed', vars: { orderNumber: order.order_number }, relatedEntityType: 'order', relatedEntityId: id });
  }
  const updated = await repository.findUpdatedOrder(companyId, id);
  return toOrderDTO(updated);
}