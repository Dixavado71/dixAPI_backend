import * as service from '../services/promotionService.js';
import { promotionSchema, couponAdminSchema } from '../validators/promotionValidators.js';
import { createdResponse, successResponse } from '../../../shared/utils/response.js';

export async function listPromotions(req, res, next) { try { return successResponse(res, await service.listPromotions(req.tenant.companyId)); } catch (error) { next(error); } }
export async function createPromotion(req, res, next) { try { return createdResponse(res, await service.createPromotion(req.tenant.companyId, promotionSchema.parse(req.body))); } catch (error) { next(error); } }
export async function listCoupons(req, res, next) { try { return successResponse(res, await service.listCoupons(req.tenant.companyId)); } catch (error) { next(error); } }
export async function createCoupon(req, res, next) { try { return createdResponse(res, await service.createCoupon(req.tenant.companyId, couponAdminSchema.parse(req.body))); } catch (error) { next(error); } }
