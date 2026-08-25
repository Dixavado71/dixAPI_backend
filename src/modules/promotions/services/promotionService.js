import { ConflictError, NotFoundError } from '../../../shared/errors/AppError.js';
import * as repository from '../repositories/promotionRepository.js';

export const listPromotions = (companyId) => repository.listPromotions(companyId);
export const listCoupons = (companyId) => repository.listCoupons(companyId);

export async function createPromotion(companyId, data) {
  if (data.endsAt && data.startsAt && data.endsAt <= data.startsAt) throw new ConflictError('Promotion end must be after start');
  return repository.createPromotion(companyId, data);
}

export async function createCoupon(companyId, data) {
  if (data.endsAt && data.startsAt && data.endsAt <= data.startsAt) throw new ConflictError('Coupon end must be after start');
  try {
    const coupon = await repository.createCoupon(companyId, data);
    if (!coupon) throw new NotFoundError('Promotion');
    return coupon;
  } catch (error) {
    if (error.code === 'P2002') throw new ConflictError('Coupon code already exists in this company');
    throw error;
  }
}
