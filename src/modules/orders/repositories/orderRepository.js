import crypto from 'node:crypto';
import prisma from '../../../infrastructure/database/prismaClient.js';
import { BadRequestError, NotFoundError } from '../../../shared/errors/AppError.js';

export function findOrderById(companyId, id) {
  return prisma.order.findFirst({ where: { id, company_id: companyId }, include: { customer: true, order_items: { include: { product: true } }, payments: true } });
}

export function listOrders(companyId, status) {
  return prisma.order.findMany({ where: { company_id: companyId, ...(status ? { status } : {}) }, orderBy: { created_at: 'desc' }, include: { customer: true, order_items: { include: { product: true } }, payments: true } });
}

export async function createOrder(companyId, customerId, paymentMethod, itemsData) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findFirst({ where: { id: customerId, company_id: companyId } });
    if (!customer) throw new NotFoundError('Customer');

    let subtotal = 0;
    const orderItems = [];

    for (const itemData of itemsData) {
      const product = await tx.product.findFirst({ where: { id: itemData.productId, company_id: companyId } });
      if (!product) throw new NotFoundError('Product');
      if (itemData.quantity < 1) throw new BadRequestError('Item quantity must be at least 1');

      const updated = await tx.product.updateMany({
        where: { id: itemData.productId, company_id: companyId, stock: { gte: itemData.quantity } },
        data: { stock: { decrement: itemData.quantity } },
      });
      if (!updated.count) throw new BadRequestError(`Insufficient stock for product ${product.name}`);

      const itemSubtotal = Number(product.price) * itemData.quantity;
      subtotal += itemSubtotal;
      orderItems.push({
        product_id: itemData.productId,
        quantity: itemData.quantity,
        unit_price: product.price,
        unit_cost: product.cost || 0,
        subtotal: itemSubtotal,
      });
    }

    const discount = 0;
    const shippingCost = 10;
    const total = subtotal - discount + shippingCost;
    const order = await tx.order.create({
      data: {
        company_id: companyId,
        customer_id: customerId,
        order_number: `ORD-${crypto.randomUUID()}`,
        status: 'pending',
        payment_method: paymentMethod,
        subtotal,
        discount,
        shipping_cost: shippingCost,
        total,
      },
    });

    await tx.orderItem.createMany({ data: orderItems.map(item => ({ ...item, order_id: order.id })) });
    return order;
  });
}

export function updateOrder(companyId, id, data) {
  return prisma.order.updateMany({ where: { id, company_id: companyId }, data });
}

export function findUpdatedOrder(companyId, id) {
  return prisma.order.findFirst({ where: { id, company_id: companyId }, include: { customer: true, order_items: { include: { product: true } } } });
}