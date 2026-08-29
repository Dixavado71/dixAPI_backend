import { NotFoundError, BadRequestError } from '../../../shared/errors/AppError.js';
import * as repository from '../repositories/orderRepository.js';
import * as evolutionApi from '../../../infrastructure/whatsapp/evolutionApiClient.js';
import prisma from '../../../infrastructure/database/prismaClient.js';
import { handleOrderEvent } from '../../notifications/services/orderNotificationService.js';
import { dispatchEventAsync } from '../../notifications/services/notificationService.js';
import { logger } from '../../../config/logger.js';

function formatBRL(n) {
  return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function notifyMotoboyForOrder(companyId, orderId) {
  try {
    const order = await prisma.order.findFirst({
      where: { id: orderId, company_id: companyId },
      include: { customer: true, order_items: { include: { product: true } } },
    });
    if (!order) return null;

    const driver = await prisma.deliveryDriver.findFirst({
      where: { company_id: companyId, status: 'available', is_active: true, phone: { not: null } },
      orderBy: { created_at: 'asc' },
    });
    if (!driver?.phone) {
      logger.warn({ companyId, orderId }, 'motoboy: nenhum entregador disponivel cadastrado');
      return null;
    }

    const number = await prisma.whatsAppNumber.findFirst({ where: { company_id: companyId, status: 'connected' } });
    if (!number?.external_account_id) {
      logger.warn({ companyId, orderId }, 'motoboy: nenhum numero whatsapp conectado');
      return null;
    }

    const items = order.order_items?.map((i) => `\u2022 ${i.quantity}x ${i.product.name} \u2014 ${formatBRL(i.unit_price)}`).join('\n') || '';
    const endereco = order.shipping_address || 'Endereco informado pelo atendente';
    const message = [
      `\u{1F69B} *Novo pedido para entrega*`,
      ``,
      `Pedido: ${order.order_number}`,
      `Cliente: ${order.customer?.name || 'Cliente'}`,
      `Telefone: ${order.customer?.phone || ''}`,
      ``,
      `Itens:`,
      items,
      ``,
      `Total: ${formatBRL(order.total)}`,
      ``,
      `Endereco de entrega: ${endereco}`,
    ].join('\n');

    const result = await evolutionApi.sendText(number.external_account_id, driver.phone, message, 500).catch((err) => {
      logger.error({ err: err.message, companyId, orderId, driver: driver.phone }, 'motoboy: falha ao enviar sinal para entregador');
      return null;
    });
    logger.info({ companyId, orderId, driver: driver.phone, status: result ? 'sent' : 'failed' }, 'motoboy: sinal enviado para entregador');
    return result;
  } catch (err) {
    logger.error({ err: err.message, companyId, orderId }, 'motoboy: erro ao notificar entregador');
    return null;
  }
}

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
  const order = await repository.createOrder(companyId, data.customerId, data.paymentMethod, data.items, data.couponCode, data.shippingAddress ?? null);
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
    await notifyMotoboyForOrder(companyId, id);
  }
  const updated = await repository.findUpdatedOrder(companyId, id);
  return toOrderDTO(updated);
}