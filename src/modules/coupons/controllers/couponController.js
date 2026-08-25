import * as couponService from '../services/couponService.js';
import { couponValidationSchema, couponRedemptionSchema } from '../validators/couponHttpValidators.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';

export async function validate(req, res, next) {
  try {
    const data = couponValidationSchema.parse(req.body);
    const coupon = await couponService.validateCoupon({ ...data, companyId: req.tenant.companyId });
    return successResponse(res, { valid: true, coupon: { id: coupon.id, code: coupon.code, discount_type: coupon.discount_type, discount_value: coupon.discount_value } });
  } catch (error) {
    next(error);
  }
}

export async function redeem(req, res, next) {
  try {
    const data = couponRedemptionSchema.parse(req.body);
    const redemption = await couponService.redeemCoupon({ ...data, companyId: req.tenant.companyId });
    return createdResponse(res, redemption);
  } catch (error) {
    next(error);
  }
}
