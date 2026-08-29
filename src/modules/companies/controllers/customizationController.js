import * as service from '../services/customizationService.js';
import { customizationSchema } from '../validators/customizationValidators.js';
import { successResponse } from '../../../shared/utils/response.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const get = asyncHandler(async (req, res) => { return successResponse(res, await service.getCustomization(req.tenant.companyId)); });
export const update = asyncHandler(async (req, res) => { return successResponse(res, await service.updateCustomization(req.tenant.companyId, customizationSchema.parse(req.body))); });
