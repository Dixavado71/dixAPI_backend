import { NotFoundError, ConflictError } from '../../../shared/errors/AppError.js';
import * as repo from '../repositories/notificationRepository.js';
import { fillTemplate } from '../../automation/services/templateEngine.js';

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

/* ===== Notification triggers ===== */

export async function listTriggers(companyId) {
  return repo.listTriggers(companyId);
}

export async function createTrigger(companyId, userId, data) {
  const existing = await repo.findTriggerByEvent(companyId, data.event, data.channel ?? 'app');
  if (existing) throw new ConflictError('Regra de alerta já cadastrada para este evento/canal.');
  return repo.createTrigger({
    company_id: companyId,
    event: data.event,
    channel: data.channel ?? 'app',
    recipient_rule: data.recipientRule ?? null,
    template: data.template ?? null,
    is_active: data.isActive ?? true,
    created_by: userId,
  });
}

export async function updateTrigger(companyId, id, data) {
  const existing = await repo.findTriggerById(companyId, id);
  if (!existing) throw new NotFoundError('Regra de alerta não encontrada.');

  const patch = {};
  if (data.event !== undefined) patch.event = data.event;
  if (data.channel !== undefined) patch.channel = data.channel;
  if (data.recipientRule !== undefined) patch.recipient_rule = data.recipientRule;
  if (data.template !== undefined) patch.template = data.template;
  if (data.isActive !== undefined) patch.is_active = data.isActive;

  await repo.updateTrigger(companyId, id, patch);
  return repo.listTriggers(companyId).then((list) => list.find((t) => t.id === id) ?? null);
}

export async function deleteTrigger(companyId, id) {
  const existing = await repo.findTriggerById(companyId, id);
  if (!existing) throw new NotFoundError('Regra de alerta não encontrada.');
  await repo.deleteTrigger(companyId, id);
  return { deleted: true };
}

async function resolveRecipients(companyId, rule, context) {
  if (!rule) return [];
  if (rule.mode === 'fixed' && rule.phone) return [{ channel: 'whatsapp', phone: String(rule.phone).replace(/\D/g, ''), userId: null }];
  const roles = rule.roles ?? [rule.role ?? 'admin', 'manager', 'operator'];
  const attendants = await repo.listAttendantUsers(companyId).then((list) => list.filter((a) => roles.includes(a.role)));
  if (rule.mode === 'operator' && rule.attendantId) {
    const found = attendants.find((a) => a.user_id === rule.attendantId);
    if (found) return [{ channel: 'app', userId: found.user_id, phone: found.user?.phone ?? null }];
    return [];
  }
  return attendants.map((a) => ({ channel: 'app', userId: a.user_id, phone: a.user?.phone ?? null }));
}

export async function dispatchEvent({ companyId, event, vars = {}, relatedEntityType, relatedEntityId }) {
  const triggers = await repo.listTriggers(companyId).then((list) => list.filter((t) => t.is_active && t.event === event));
  if (triggers.length === 0) return { dispatched: 0 };

  const results = [];
  for (const trigger of triggers) {
    const message = fillTemplate(trigger.template ?? event, vars);
    const recipients = await resolveRecipients(companyId, trigger.recipient_rule, vars);
    const sendWhatsApp = trigger.channel === 'whatsapp' || trigger.channel === 'both';
    const sendApp = trigger.channel === 'app' || trigger.channel === 'both';

    for (const recipient of recipients) {
      if (sendApp && recipient.userId) {
        await repo.createNotification({
          user_id: recipient.userId,
          company_id: companyId,
          type: 'automation',
          title: event,
          message,
          related_entity_type: relatedEntityType ?? null,
          related_entity_id: relatedEntityId ?? null,
        }).catch(() => null);
        results.push({ channel: 'app', userId: recipient.userId });
      }
      if (sendWhatsApp && recipient.phone) {
        const { env } = await import('../../../config/env.js');
        const prisma = (await import('../../../infrastructure/database/prismaClient.js')).default;
        const number = await prisma.whatsAppNumber.findFirst({ where: { company_id: companyId, status: 'connected' } }).catch(() => null);
        if (number?.external_account_id) {
          const { sendText } = await import('../../../infrastructure/whatsapp/evolutionApiClient.js');
          await sendText(number.external_account_id, recipient.phone, message, 500).catch(() => null);
          results.push({ channel: 'whatsapp', phone: recipient.phone });
        }
      }
    }
  }
  return { dispatched: results.length, results };
}

export default {
  list,
  unreadCount,
  markAsRead,
  markAllRead,
  notifyAttendants,
  listTriggers,
  createTrigger,
  updateTrigger,
  deleteTrigger,
  dispatchEvent,
};