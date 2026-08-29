import * as conversationService from '../services/conversationService.js';
import { updateConversationStatusSchema, assignConversationSchema, sendReplySchema } from '../validators/conversationValidators.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const { channel, status, search, limit } = req.query;
  const data = await conversationService.list(req.tenant.companyId, { channel, status, search, limit });
  return successResponse(res, data);
});

export const getById = asyncHandler(async (req, res) => {
  const data = await conversationService.getById(req.tenant.companyId, req.params.id);
  return successResponse(res, data);
});

export const listMessages = asyncHandler(async (req, res) => {
  const data = await conversationService.listMessages(req.tenant.companyId, req.params.id, { limit: req.query.limit });
  return successResponse(res, data);
});

export const updateStatus = asyncHandler(async (req, res) => {
  const data = updateConversationStatusSchema.parse(req.body);
  const result = await conversationService.updateStatus(req.tenant.companyId, req.params.id, data.status);
  return successResponse(res, result);
});

export const assign = asyncHandler(async (req, res) => {
  const data = assignConversationSchema.parse(req.body);
  const result = await conversationService.assign(req.tenant.companyId, req.params.id, data.userId);
  return successResponse(res, result);
});

export const sendReply = asyncHandler(async (req, res) => {
  const data = sendReplySchema.parse(req.body);
  const result = await conversationService.sendReply(req.tenant.companyId, req.params.id, req.user.id, data.text);
  return createdResponse(res, result);
});

export default { list, getById, listMessages, updateStatus, assign, sendReply };
