import * as billingService from '../services/billingService.js';
import { subscribeSchema, confirmPaymentSchema } from '../validators/billingValidators.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const index = asyncHandler(async (req, res) => {
  const subscription = await billingService.getMySubscription(req.user.companyId);
  return successResponse(res, subscription);
});

export const subscribe = asyncHandler(async (req, res) => {
  const validatedData = subscribeSchema.parse(req.body);
  const result = await billingService.subscribe(req.user.companyId, req.user.id, validatedData);
  return createdResponse(res, result);
});

export const confirmPayment = asyncHandler(async (req, res) => {
  const validatedData = confirmPaymentSchema.parse(req.body);
  const result = await billingService.confirmPayment(req.user.companyId, req.user.id, validatedData.transactionId);
  return successResponse(res, result);
});

export default { index, subscribe, confirmPayment };
