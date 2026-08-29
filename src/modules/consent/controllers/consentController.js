import * as service from '../services/consentService.js';
import { consentSchema, customerParamsSchema } from '../validators/consentValidators.js';
import { createdResponse, successResponse } from '../../../shared/utils/response.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const create = asyncHandler(async (req, res) => createdResponse(res, await service.createConsent(req.tenant.companyId, consentSchema.parse(req.body))));

export const list = asyncHandler(async (req, res) => {
  const { customerId } = customerParamsSchema.parse(req.params);
  return successResponse(res, await service.listConsents(req.tenant.companyId, customerId));
});
