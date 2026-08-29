import * as service from '../services/promotionService.js';
import { promotionSchema, couponAdminSchema } from '../validators/promotionValidators.js';
import { createdResponse, successResponse } from '../../../shared/utils/response.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const listPromotions = asyncHandler(async (req, res) => {
  return successResponse(res, await service.listPromotions(req.tenant.companyId));
});

export const createPromotion = asyncHandler(async (req, res) => {
  return createdResponse(res, await service.createPromotion(req.tenant.companyId, promotionSchema.parse(req.body)));
});

export const listCoupons = asyncHandler(async (req, res) => {
  return successResponse(res, await service.listCoupons(req.tenant.companyId));
});

export const createCoupon = asyncHandler(async (req, res) => {
  return createdResponse(res, await service.createCoupon(req.tenant.companyId, couponAdminSchema.parse(req.body)));
});
