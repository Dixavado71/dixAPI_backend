import prisma from '../../../infrastructure/database/prismaClient.js';
import { BadRequestError } from '../../../shared/errors/AppError.js';

export function findCoupon(companyId, code) {
  return prisma.coupon.findFirst({
    where: { company_id: companyId, code },
    include: { promotion: true },
  });
}

export function countCustomerRedemptions(companyId, couponId, customerId) {
  return prisma.couponRedemption.count({ where: { company_id: companyId, coupon_id: couponId, customer_id: customerId } });
}

export function redeemCoupon(data) {
  return prisma.$transaction(async (tx) => {
    const coupon = await tx.coupon.findFirst({
      where: { company_id: data.companyId, id: data.couponId },
    });
    if (!coupon) return null;

    const order = await tx.order.findFirst({ where: { id: data.orderId, company_id: data.companyId } });
    if (!order) return null;
    if (data.customerId) {
      const customer = await tx.customer.findFirst({ where: { id: data.customerId, company_id: data.companyId } });
      if (!customer) return null;
      if (order.customer_id !== data.customerId) throw new BadRequestError('Order does not belong to customer');
    }

    const redemption = await tx.couponRedemption.create({
      data: {
        company_id: data.companyId,
        coupon_id: data.couponId,
        customer_id: data.customerId,
        order_id: data.orderId,
        discount_amount: data.discountAmount,
      },
    });
    await tx.coupon.updateMany({
      where: { company_id: data.companyId, id: data.couponId },
      data: { usage_count: { increment: 1 } },
    });
    return redemption;
  });
}
