import * as automationService from '../services/automationService.js';
import { createFlowSchema, updateFlowSchema, testFlowSchema, importFlowSchema } from '../validators/automationValidators.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const { type, isActive } = req.query;
  const filters = {};
  if (type) filters.type = type;
  if (isActive !== undefined) filters.isActive = isActive === 'true';
  const data = await automationService.listFlows(req.tenant.companyId, filters);
  return successResponse(res, data);
});

export const create = asyncHandler(async (req, res) => {
  const data = createFlowSchema.parse(req.body);
  const result = await automationService.createFlow(req.tenant.companyId, data);
  return createdResponse(res, result);
});

export const getById = asyncHandler(async (req, res) => {
  const result = await automationService.getFlowById(req.tenant.companyId, req.params.id);
  return successResponse(res, result);
});

export const update = asyncHandler(async (req, res) => {
  const data = updateFlowSchema.parse(req.body);
  const result = await automationService.updateFlow(req.tenant.companyId, req.params.id, data);
  return successResponse(res, result);
});

export const remove = asyncHandler(async (req, res) => {
  const result = await automationService.deleteFlow(req.tenant.companyId, req.params.id);
  return successResponse(res, result);
});

export const toggle = asyncHandler(async (req, res) => {
  const result = await automationService.toggleFlow(req.tenant.companyId, req.params.id);
  return successResponse(res, result);
});

export const duplicate = asyncHandler(async (req, res) => {
  const result = await automationService.duplicateFlow(req.tenant.companyId, req.params.id);
  return createdResponse(res, result);
});

export const test = asyncHandler(async (req, res) => {
  const data = testFlowSchema.parse(req.body ?? {});
  const result = await automationService.testFlow(req.tenant.companyId, req.params.id, data);
  return successResponse(res, result);
});

export const exportFlow = asyncHandler(async (req, res) => {
  const result = await automationService.exportFlow(req.tenant.companyId, req.params.id);
  return successResponse(res, result);
});

export const importFlow = asyncHandler(async (req, res) => {
  const data = importFlowSchema.parse(req.body);
  const result = await automationService.importFlow(req.tenant.companyId, data);
  return createdResponse(res, result);
});

export default { list, create, getById, update, remove, toggle, duplicate, test, exportFlow, importFlow };