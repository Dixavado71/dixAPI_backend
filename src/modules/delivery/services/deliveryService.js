import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/AppError.js';
import * as repository from '../repositories/deliveryRepository.js';

export const getSettings = (companyId) => repository.findSettings(companyId);
export const saveSettings = (companyId, data) => repository.upsertSettings(companyId, data);
export const listDrivers = (companyId) => repository.listDrivers(companyId);
export const createDriver = (companyId, data) => repository.createDriver(companyId, data);

export async function listDeliveries(companyId, status) {
  return repository.listDeliveries(companyId, status);
}

export async function createDelivery(companyId, data) {
  const settings = await repository.findSettings(companyId);
  if (data.mode === 'delivery' && !settings?.enabled) throw new BadRequestError('Delivery service is disabled');
  if (data.mode === 'pickup' && !settings?.pickup_enabled) throw new BadRequestError('Pickup service is disabled');
  const order = await repository.findOrder(companyId, data.order_id);
  if (!order) throw new NotFoundError('Order');
  if (['cancelled', 'completed'].includes(order.status)) throw new BadRequestError('Order status does not allow delivery');
  const existing = await repository.findDeliveryByOrderId(companyId, data.order_id);
  if (existing) throw new ConflictError('Order already has a delivery');
  try {
    return await repository.createDelivery(companyId, data);
  } catch (error) {
    if (error.code === 'P2002') throw new ConflictError('Order already has a delivery');
    throw error;
  }
}

export async function getDelivery(companyId, id) {
  const delivery = await repository.findDelivery(companyId, id);
  if (!delivery) throw new NotFoundError('Delivery');
  return delivery;
}

const transitions = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['assigned', 'cancelled'],
  assigned: ['picked_up', 'cancelled'],
  picked_up: ['in_transit', 'delivered', 'failed'],
  in_transit: ['at_location', 'delivered', 'failed'],
  at_location: ['delivered', 'failed'],
  delivered: [],
  cancelled: [],
  failed: [],
};

export async function updateStatus(companyId, id, data) {
  const delivery = await getDelivery(companyId, id);
  if (!transitions[delivery.status]?.includes(data.status)) throw new BadRequestError('Invalid delivery status transition');
  if (data.status === 'failed' && !data.failure_reason?.trim()) throw new BadRequestError('Failure reason is required');
  const result = await repository.updateDelivery(companyId, id, {
    status: data.status,
    failure_reason: data.status === 'failed' ? data.failure_reason : null,
    ...(data.status === 'in_transit' ? { dispatched_at: new Date() } : {}),
    ...(data.status === 'delivered' ? { delivered_at: new Date() } : {}),
  });
  if (!result.count) throw new NotFoundError('Delivery');

  if (['assigned', 'in_transit', 'at_location', 'delivered'].includes(data.status)) {
    const { handleOrderEvent } = await import('../../notifications/services/orderNotificationService.js');
    await handleOrderEvent(companyId, delivery.order_id, `delivery_${data.status}`).catch(() => null);
  }

  return getDelivery(companyId, id);
}

export async function markAtLocation(companyId, id) {
  return updateStatus(companyId, id, { status: 'at_location' });
}

export async function registerPayment(companyId, data) {
  if (data.method === 'cash_on_delivery') {
    if (data.channel !== 'delivery_cash') throw new BadRequestError('Cash on delivery requires delivery_cash channel');
    if (data.amount_received === undefined || data.amount_received === null) throw new BadRequestError('Amount received is required');
    if (data.amount_received < data.amount) throw new BadRequestError('Amount received cannot be less than payment amount');
    data.change_amount = data.amount_received - data.amount;
    data.status = data.confirmed_by_driver ? 'paid' : 'pending';
    data.confirmed_at = data.confirmed_by_driver ? new Date() : null;
  }
  if (data.method === 'card_on_delivery' && data.channel !== 'delivery_card') throw new BadRequestError('Card on delivery requires delivery_card channel');
  if (data.method === 'whatsapp_pay' && !['whatsapp_manual', 'whatsapp_api'].includes(data.channel)) throw new BadRequestError('WhatsApp payment requires a WhatsApp channel');
  return repository.createPayment(companyId, data);
}

export async function confirmPayment(companyId, id, data) {
  const existing = await repository.findPayment(companyId, id);
  if (!existing) throw new NotFoundError('Payment');
  if (existing.method !== 'cash_on_delivery') throw new BadRequestError('Only cash on delivery payments require driver confirmation');
  if (data.amount_received < Number(existing.amount)) throw new BadRequestError('Amount received cannot be less than payment amount');
  const payment = await repository.updatePayment(companyId, id, {
    status: 'paid', confirmed_by_driver: true, confirmed_at: new Date(),
    amount_received: data.amount_received,
    change_amount: data.amount_received - Number(existing.amount),
  });
  if (!payment.count) throw new NotFoundError('Payment');
  return repository.findPayment(companyId, id);
}
