import * as service from '../services/customizationService.js';
import { customizationSchema } from '../validators/customizationValidators.js';
import { successResponse } from '../../../shared/utils/response.js';

export async function get(req, res, next) { try { return successResponse(res, await service.getCustomization(req.tenant.companyId)); } catch (error) { next(error); } }
export async function update(req, res, next) { try { return successResponse(res, await service.updateCustomization(req.tenant.companyId, customizationSchema.parse(req.body))); } catch (error) { next(error); } }
