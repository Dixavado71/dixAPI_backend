import * as notificationService from '../services/notificationService.js';
import * as orderNotificationService from '../services/orderNotificationService.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';
import { triggerSchema, triggerUpdateSchema } from '../validators/notificationValidators.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 30;
  const data = await notificationService.list(req.user.id, req.tenant.companyId, limit);
  const unread = await notificationService.unreadCount(req.user.id, req.tenant.companyId);
  return successResponse(res, { items: data, unread });
});

export const markRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAsRead(req.user.id, req.tenant.companyId, req.params.id);
  return successResponse(res, result);
});

export const markAllRead = asyncHandler(async (req, res) => {
  await notificationService.markAllRead(req.user.id, req.tenant.companyId);
  return successResponse(res, { read: true });
});

export const listLogs = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  const data = await orderNotificationService.listLogs(req.tenant.companyId, limit);
  return successResponse(res, data);
});

export const listTriggers = asyncHandler(async (req, res) => {
  const data = await notificationService.listTriggers(req.tenant.companyId);
  return successResponse(res, data);
});

export const createTrigger = asyncHandler(async (req, res) => {
  const data = triggerSchema.parse(req.body);
  const result = await notificationService.createTrigger(req.tenant.companyId, req.user.id, data);
  return createdResponse(res, result);
});

export const updateTrigger = asyncHandler(async (req, res) => {
  const data = triggerUpdateSchema.parse(req.body);
  const result = await notificationService.updateTrigger(req.tenant.companyId, req.params.id, data);
  return successResponse(res, result);
});

export const deleteTrigger = asyncHandler(async (req, res) => {
  const result = await notificationService.deleteTrigger(req.tenant.companyId, req.params.id);
  return successResponse(res, result);
});

export default { list, markRead, markAllRead, listLogs, listTriggers, createTrigger, updateTrigger, deleteTrigger };
