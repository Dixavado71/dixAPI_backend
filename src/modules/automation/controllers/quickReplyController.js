import * as automationService from '../services/automationService.js';
import { createQuickReplySchema, updateQuickReplySchema } from '../validators/automationValidators.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const data = await automationService.listQuickReplies(req.tenant.companyId);
  return successResponse(res, data);
});

export const create = asyncHandler(async (req, res) => {
  const data = createQuickReplySchema.parse(req.body);
  const result = await automationService.createQuickReply(req.tenant.companyId, req.user.id, data);
  return createdResponse(res, result);
});

export const update = asyncHandler(async (req, res) => {
  const data = updateQuickReplySchema.parse(req.body);
  const result = await automationService.updateQuickReply(req.tenant.companyId, req.params.id, data);
  return successResponse(res, result);
});

export const remove = asyncHandler(async (req, res) => {
  const result = await automationService.deleteQuickReply(req.tenant.companyId, req.params.id);
  return successResponse(res, result);
});

export const incrementUsage = asyncHandler(async (req, res) => {
  const result = await automationService.useQuickReply(req.tenant.companyId, req.params.id);
  return successResponse(res, result);
});

export default { list, create, update, remove, incrementUsage };