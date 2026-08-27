import { NotFoundError } from '../../../shared/errors/AppError.js';
import * as repo from '../repositories/notificationRepository.js';

export async function list(userId, companyId, limit) {
  return repo.listNotifications(userId, companyId, { limit });
}

export async function unreadCount(userId, companyId) {
  return repo.countUnread(userId, companyId);
}

export async function markAsRead(userId, companyId, id) {
  const notif = await repo.findNotification(userId, companyId, id);
  if (!notif) throw new NotFoundError('Notificação não encontrada.');
  return repo.markRead(id);
}

export async function markAllRead(userId, companyId) {
  return repo.markAllRead(userId, companyId);
}

export async function notifyAttendants({ companyId, title, message, type = 'message', relatedEntityType, relatedEntityId }) {
  const attendants = await repo.listAttendantUsers(companyId);
  const results = [];
  for (const uc of attendants) {
    const n = await repo.createNotification({
      user_id: uc.user_id,
      company_id: companyId,
      type,
      title,
      message,
      related_entity_type: relatedEntityType ?? null,
      related_entity_id: relatedEntityId ?? null,
    });
    results.push(n);
  }
  return results;
}

export default { list, unreadCount, markAsRead, markAllRead, notifyAttendants };