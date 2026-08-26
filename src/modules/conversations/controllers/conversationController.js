import * as conversationService from '../services/conversationService.js';
import { updateConversationStatusSchema, assignConversationSchema, sendReplySchema } from '../validators/conversationValidators.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';

export async function list(req, res, next) {
  try {
    const { channel, status, search, limit } = req.query;
    const data = await conversationService.list(req.tenant.companyId, { channel, status, search, limit });
    return successResponse(res, data);
  } catch (error) { return next(error); }
}

export async function getById(req, res, next) {
  try {
    const data = await conversationService.getById(req.tenant.companyId, req.params.id);
    return successResponse(res, data);
  } catch (error) { return next(error); }
}

export async function listMessages(req, res, next) {
  try {
    const data = await conversationService.listMessages(req.tenant.companyId, req.params.id, { limit: req.query.limit });
    return successResponse(res, data);
  } catch (error) { return next(error); }
}

export async function updateStatus(req, res, next) {
  try {
    const data = updateConversationStatusSchema.parse(req.body);
    const result = await conversationService.updateStatus(req.tenant.companyId, req.params.id, data.status);
    return successResponse(res, result);
  } catch (error) { return next(error); }
}

export async function assign(req, res, next) {
  try {
    const data = assignConversationSchema.parse(req.body);
    const result = await conversationService.assign(req.tenant.companyId, req.params.id, data.userId);
    return successResponse(res, result);
  } catch (error) { return next(error); }
}

export async function sendReply(req, res, next) {
  try {
    const data = sendReplySchema.parse(req.body);
    const result = await conversationService.sendReply(req.tenant.companyId, req.params.id, req.user.id, data.text);
    return createdResponse(res, result);
  } catch (error) { return next(error); }
}

export default { list, getById, listMessages, updateStatus, assign, sendReply };