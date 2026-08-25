import * as service from '../services/consentService.js';
import { consentSchema, customerParamsSchema } from '../validators/consentValidators.js';
import { createdResponse, successResponse } from '../../../shared/utils/response.js';

export async function create(req, res, next) {
  try { return createdResponse(res, await service.createConsent(req.tenant.companyId, consentSchema.parse(req.body))); } catch (error) { next(error); }
}

export async function list(req, res, next) {
  try {
    const { customerId } = customerParamsSchema.parse(req.params);
    return successResponse(res, await service.listConsents(req.tenant.companyId, customerId));
  } catch (error) { next(error); }
}
