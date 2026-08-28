import { BadRequestError, ConflictError, NotFoundError } from '../../../shared/errors/AppError.js';
import * as repository from '../repositories/couponRepository.js';

function isWithinWindow(coupon, now) {
  return (!coupon.starts_at || coupon.starts_at <= now) && (!coupon.ends_at || coupon.ends_at >= now);
}

function computeDiscount(coupon, subtotal) {
  const value = Number(coupon.discount_value ?? 0);
  let discount = 0;
  switch (coupon.discount_type) {
    case 'percentage':
      discount = (subtotal || 0) * (value / 100);
      break;
    case 'fixed_amount':
      discount = value;
      break;
    case 'free_shipping':
    case 'buy_x_get_y':
    default:
      discount = 0;
  }
  if (coupon.max_discount !== null && coupon.max_discount !== undefined) {
    discount = Math.min(discount, Number(coupon.max_discount));
  }
  return Math.max(0, Math.min(discount, subtotal || 0));
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
  const discountAmount = computeDiscount(coupon, data.subtotal);
  try {
    const redemption = await repository.redeemCoupon({ ...data, couponId: coupon.id, discountAmount });
    if (!redemption) throw new NotFoundError('Coupon');
    return redemption;
  } catch (error) {
    if (error.code === 'P2002') throw new ConflictError('Coupon already redeemed for this order');
    throw error;
  }
}
