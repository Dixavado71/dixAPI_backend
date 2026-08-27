import * as notificationService from '../services/notificationService.js';
import * as orderNotificationService from '../services/orderNotificationService.js';
import { successResponse } from '../../../shared/utils/response.js';

export async function list(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 30;
    const data = await notificationService.list(req.user.id, req.tenant.companyId, limit);
    const unread = await notificationService.unreadCount(req.user.id, req.tenant.companyId);
    return successResponse(res, { items: data, unread });
  } catch (error) { return next(error); }
}

export async function markRead(req, res, next) {
  try {
    const result = await notificationService.markAsRead(req.user.id, req.tenant.companyId, req.params.id);
    return successResponse(res, result);
  } catch (error) { return next(error); }
}

export async function markAllRead(req, res, next) {
  try {
    await notificationService.markAllRead(req.user.id, req.tenant.companyId);
    return successResponse(res, { read: true });
  } catch (error) { return next(error); }
}

export async function listLogs(req, res, next) {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const data = await orderNotificationService.listLogs(req.tenant.companyId, limit);
    return successResponse(res, data);
  } catch (error) { return next(error); }
}

export default { list, markRead, markAllRead, listLogs };