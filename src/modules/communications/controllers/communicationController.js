import * as service from '../services/communicationService.js';
import { communicationSchema } from '../validators/communicationValidators.js';
import { createdResponse, successResponse } from '../../../shared/utils/response.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  return successResponse(res, await service.listCommunications(req.tenant.companyId));
});

export const create = asyncHandler(async (req, res) => {
  return createdResponse(res, await service.createCommunication(req.tenant.companyId, req.user.id, communicationSchema.parse(req.body)));
});
