import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/AppError.js';
import * as repository from '../repositories/couponRepository.js';

function isWithinWindow(coupon, now) {
  return (!coupon.starts_at || coupon.starts_at <= now) && (!coupon.ends_at || coupon.ends_at >= now);
}

export async function validateCoupon({ companyId, code, customerId, subtotal }) {
  const coupon = await repository.findCoupon(companyId, code);
  if (!coupon) throw new NotFoundError('Coupon');
  const now = new Date();
  if (coupon.status !== 'active' || !isWithinWindow(coupon, now)) throw new BadRequestError('Coupon is not active');
  if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) throw new BadRequestError('Coupon usage limit reached');
  if (coupon.minimum_amount !== null && subtotal < Number(coupon.minimum_amount)) throw new BadRequestError('Order minimum not met');
  if (customerId && coupon.per_customer_limit !== null) {
    const count = await repository.countCustomerRedemptions(companyId, coupon.id, customerId);
    if (count >= coupon.per_customer_limit) throw new BadRequestError('Customer coupon limit reached');
  }
  return coupon;
}

export async function redeemCoupon(data) {
  if (!data.orderId) throw new BadRequestError('Order is required to redeem a coupon');
  const coupon = await validateCoupon(data);
  try {
    const redemption = await repository.redeemCoupon({ ...data, couponId: coupon.id });
    if (!redemption) throw new NotFoundError('Coupon');
    return redemption;
  } catch (error) {
    if (error.code === 'P2002') throw new ConflictError('Coupon already redeemed for this order');
    throw error;
  }
}
