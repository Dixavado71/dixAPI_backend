import * as billingService from '../services/billingService.js';
import { subscribeSchema, confirmPaymentSchema } from '../validators/billingValidators.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';

export async function index(req, res, next) {
  try {
    const subscription = await billingService.getMySubscription(req.user.companyId);
    return successResponse(res, subscription);
  } catch (error) {
    next(error);
  }
}

export async function subscribe(req, res, next) {
  try {
    const validatedData = subscribeSchema.parse(req.body);
    const result = await billingService.subscribe(req.user.companyId, req.user.id, validatedData);
    return createdResponse(res, result);
  } catch (error) {
    next(error);
  }
}

export async function confirmPayment(req, res, next) {
  try {
    const validatedData = confirmPaymentSchema.parse(req.body);
    const result = await billingService.confirmPayment(req.user.companyId, req.user.id, validatedData.transactionId);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
}

export default { index, subscribe, confirmPayment };
