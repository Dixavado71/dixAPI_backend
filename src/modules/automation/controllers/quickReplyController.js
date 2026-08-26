import * as automationService from '../services/automationService.js';
import { createQuickReplySchema, updateQuickReplySchema } from '../validators/automationValidators.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';

export async function list(req, res, next) {
  try {
    const data = await automationService.listQuickReplies(req.tenant.companyId);
    return successResponse(res, data);
  } catch (error) { return next(error); }
}

export async function create(req, res, next) {
  try {
    const data = createQuickReplySchema.parse(req.body);
    const result = await automationService.createQuickReply(req.tenant.companyId, req.user.id, data);
    return createdResponse(res, result);
  } catch (error) { return next(error); }
}

export async function update(req, res, next) {
  try {
    const data = updateQuickReplySchema.parse(req.body);
    const result = await automationService.updateQuickReply(req.tenant.companyId, req.params.id, data);
    return successResponse(res, result);
  } catch (error) { return next(error); }
}

export async function remove(req, res, next) {
  try {
    const result = await automationService.deleteQuickReply(req.tenant.companyId, req.params.id);
    return successResponse(res, result);
  } catch (error) { return next(error); }
}

export async function incrementUsage(req, res, next) {
  try {
    const result = await automationService.useQuickReply(req.tenant.companyId, req.params.id);
    return successResponse(res, result);
  } catch (error) { return next(error); }
}

export default { list, create, update, remove, incrementUsage };