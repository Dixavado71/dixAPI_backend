import * as automationService from '../services/automationService.js';
import { createFlowSchema, updateFlowSchema } from '../validators/automationValidators.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';

export async function list(req, res, next) {
  try {
    const { type, isActive } = req.query;
    const filters = {};
    if (type) filters.type = type;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    const data = await automationService.listFlows(req.tenant.companyId, filters);
    return successResponse(res, data);
  } catch (error) { return next(error); }
}

export async function create(req, res, next) {
  try {
    const data = createFlowSchema.parse(req.body);
    const result = await automationService.createFlow(req.tenant.companyId, data);
    return createdResponse(res, result);
  } catch (error) { return next(error); }
}

export async function getById(req, res, next) {
  try {
    const result = await automationService.getFlowById(req.tenant.companyId, req.params.id);
    return successResponse(res, result);
  } catch (error) { return next(error); }
}

export async function update(req, res, next) {
  try {
    const data = updateFlowSchema.parse(req.body);
    const result = await automationService.updateFlow(req.tenant.companyId, req.params.id, data);
    return successResponse(res, result);
  } catch (error) { return next(error); }
}

export async function remove(req, res, next) {
  try {
    const result = await automationService.deleteFlow(req.tenant.companyId, req.params.id);
    return successResponse(res, result);
  } catch (error) { return next(error); }
}

export async function toggle(req, res, next) {
  try {
    const result = await automationService.toggleFlow(req.tenant.companyId, req.params.id);
    return successResponse(res, result);
  } catch (error) { return next(error); }
}

export default { list, create, getById, update, remove, toggle };