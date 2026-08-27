import crypto from 'node:crypto';
import prisma from '../../../infrastructure/database/prismaClient.js';
import { BadRequestError, NotFoundError } from '../../../shared/errors/AppError.js';

export function findOrderById(companyId, id) {
  return prisma.order.findFirst({ where: { id, company_id: companyId }, include: { customer: true, order_items: { include: { product: true } }, payments: true } });
}

export function listOrders(companyId, status) {
  return prisma.order.findMany({ where: { company_id: companyId, ...(status ? { status } : {}) }, orderBy: { created_at: 'desc' }, include: { customer: true, order_items: { include: { product: true } }, payments: true } });
}

export async function createOrder(companyId, customerId, paymentMethod, itemsData, couponCode) {
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

    const settings = await tx.deliverySettings.findUnique({ where: { company_id: companyId } });
    const shippingCost = settings?.default_delivery_fee ? Number(settings.default_delivery_fee) : 0;

    let discount = 0;
    let coupon = null;
    if (couponCode) {
      coupon = await tx.coupon.findFirst({ where: { company_id: companyId, code: couponCode } });
      if (!coupon) throw new NotFoundError('Coupon');
      const now = new Date();
      if (coupon.status !== 'active') throw new BadRequestError('Coupon is not active');
      if (coupon.starts_at && coupon.starts_at > now) throw new BadRequestError('Coupon is not active');
      if (coupon.ends_at && coupon.ends_at < now) throw new BadRequestError('Coupon is expired');
      if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) throw new BadRequestError('Coupon usage limit reached');
      if (coupon.minimum_amount !== null && subtotal < Number(coupon.minimum_amount)) throw new BadRequestError('Order minimum not met');
      if (coupon.per_customer_limit !== null) {
        const used = await tx.couponRedemption.count({ where: { company_id: companyId, coupon_id: coupon.id, customer_id: customerId } });
        if (used >= coupon.per_customer_limit) throw new BadRequestError('Customer coupon limit reached');
      }
      if (coupon.discount_type === 'percentage') {
        discount = (subtotal * Number(coupon.discount_value)) / 100;
        if (coupon.max_discount !== null) discount = Math.min(discount, Number(coupon.max_discount));
      } else if (coupon.discount_type === 'fixed_amount') {
        discount = Number(coupon.discount_value);
      } else if (coupon.discount_type === 'free_shipping') {
        discount = shippingCost;
      }
      discount = Math.min(discount, subtotal + shippingCost);
    }

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

    if (coupon) {
      await tx.couponRedemption.create({
        data: {
          company_id: companyId,
          coupon_id: coupon.id,
          customer_id: customerId,
          order_id: order.id,
          discount_amount: discount,
        },
      });
      await tx.coupon.updateMany({
        where: { company_id: companyId, id: coupon.id },
        data: { usage_count: { increment: 1 } },
      });
    }

    return order;
  });
}

export function updateOrder(companyId, id, data) {
  return prisma.order.updateMany({ where: { id, company_id: companyId }, data });
}

export function findUpdatedOrder(companyId, id) {
  return prisma.order.findFirst({ where: { id, company_id: companyId }, include: { customer: true, order_items: { include: { product: true } } } });
}