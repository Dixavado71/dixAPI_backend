import * as repo from '../repositories/notificationRepository.js';
import * as evolutionApi from '../../../infrastructure/whatsapp/evolutionApiClient.js';
import prisma from '../../../infrastructure/database/prismaClient.js';

const TEMPLATES = {
  delivery_food: {
    order_created: { to: 'kitchen', message: '🍔 Novo pedido #{order}\n\n{items}\n\nTotal: {total}\nCliente: {customer}' },
    order_completed: { to: 'owner', message: '✅ Venda #{order} concluída\nCliente: {customer}\nTotal: {total}' },
    delivery_assigned: { to: 'driver', message: '📦 Nova entrega #{order}\n{address}\nCliente: {customer}\nTaxa: R$ {fee}' },
    delivery_in_transit: { to: 'customer', message: '🚚 Seu pedido #{order} está a caminho!\nPrevisão: {eta}' },
    delivery_at_location: { to: 'customer', message: '🛎️ O entregador chegou no endereço!\n{address}' },
    delivery_delivered: { to: 'customer', message: '✅ Pedido #{order} entregue!\nObrigado por comprar conosco! 🎉' },
    delivery_delivered_owner: { to: 'owner', message: '✅ Entrega #{order} concluída\nCliente: {customer}\nEntregue em: {address}' },
  },
  retail: {
    order_created: { to: 'owner', message: '🛒 Novo pedido #{order}\n{items}\nTotal: {total}\nCliente: {customer}' },
    order_completed: { to: 'owner', message: '✅ Venda #{order} concluída: {total} — {customer}' },
    delivery_in_transit: { to: 'customer', message: '🚚 Seu pedido #{order} está a caminho!' },
    delivery_at_location: { to: 'customer', message: '🛎️ Entregador chegou no endereço!' },
    delivery_delivered: { to: 'customer', message: '✅ Pedido #{order} entregue! Obrigado!' },
    delivery_delivered_owner: { to: 'owner', message: '✅ Entrega #{order} concluída — {customer}' },
  },
  services: {
    order_created: { to: 'owner', message: '🛠️ Novo serviço #{order}\n{items}\nTotal: {total}\nCliente: {customer}' },
    order_completed: { to: 'owner', message: '✅ Serviço #{order} concluído: {total} — {customer}' },
    delivery_delivered: { to: 'customer', message: '✅ Serviço #{order} concluído. Obrigado!' },
    delivery_delivered_owner: { to: 'owner', message: '✅ Serviço #{order} concluído — {customer}' },
  },
};

function formatBRL(n) {
  return Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function resolvePhone(companyId, to, order, delivery, config) {
  if (to === 'owner') return config?.ownerPhone || null;
  if (to === 'kitchen') return config?.kitchenPhone || null;
  if (to === 'driver' && delivery?.driver) {
    const driver = await prisma.deliveryDriver.findUnique({ where: { id: delivery.driver_id } });
    return driver?.phone || null;
  }
  if (to === 'customer' && order?.customer) {
    const customer = await prisma.customer.findUnique({ where: { id: order.customer_id } });
    return customer?.phone || null;
  }
  return null;
}

function fillTemplate(template, vars) {
  return template
    .replace(/{order}/g, vars.orderNumber)
    .replace(/{items}/g, vars.items)
    .replace(/{total}/g, vars.total)
    .replace(/{customer}/g, vars.customerName)
    .replace(/{address}/g, vars.address)
    .replace(/{fee}/g, vars.fee)
    .replace(/{eta}/g, vars.eta);
}

export async function handleOrderEvent(companyId, orderId, event) {
  try {
    const order = await prisma.order.findFirst({
      where: { id: orderId, company_id: companyId },
      include: { customer: true, order_items: { include: { product: true } }, delivery: { include: { driver: true } } },
    });
    if (!order) return;

    const customization = await prisma.companyCustomization.findUnique({ where: { company_id: companyId } });
    const config = customization?.bot_config ?? {};
    const segment = config.segment || 'retail';
    const templates = TEMPLATES[segment] || TEMPLATES.retail;
    const template = templates[event];
    if (!template) return;

    const number = await prisma.whatsAppNumber.findFirst({ where: { company_id: companyId, status: 'connected' } });
    if (!number?.external_account_id) return;

    const items = order.order_items?.map((i) => `• ${i.quantity}x ${i.product.name} — ${formatBRL(i.unit_price)}`).join('\n') || '';
    const vars = {
      orderNumber: order.order_number,
      items,
      total: formatBRL(order.total),
      customerName: order.customer?.name || 'Cliente',
      address: order.delivery ? `${order.delivery.address_street || ''}, ${order.delivery.address_number || ''}`.trim() || '—' : '—',
      fee: formatBRL(order.delivery?.delivery_fee || 0),
      eta: '—',
    };

    const phone = await resolvePhone(companyId, template.to, order, order.delivery, config);
    if (!phone) return;

    const message = fillTemplate(template.message, vars);
    const result = await evolutionApi.sendText(number.external_account_id, phone, message, 500).catch(() => null);

    await repo.createOrderNotificationLog({
      company_id: companyId,
      order_id: event.startsWith('delivery') ? null : orderId,
      delivery_id: event.startsWith('delivery') ? order.delivery?.id || null : null,
      event,
      recipient: template.to,
      recipient_phone: phone,
      message,
      status: result ? 'sent' : 'failed',
      error: result ? null : 'send failed',
    });
  } catch (error) {
    await repo.createOrderNotificationLog({
      company_id: companyId,
      order_id: null,
      delivery_id: null,
      event,
      recipient: 'error',
      recipient_phone: '',
      message: '',
      status: 'failed',
      error: error.message,
    }).catch(() => null);
  }
}

export async function listLogs(companyId, limit) {
  return repo.listOrderNotificationLogs(companyId, { limit });
}

export default { handleOrderEvent, listLogs };