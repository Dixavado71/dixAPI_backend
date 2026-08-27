import prisma from '../../../infrastructure/database/prismaClient.js';

export function listNotifications(userId, companyId, { limit = 30 } = {}) {
  return prisma.notification.findMany({
    where: { user_id: userId, company_id: companyId },
    orderBy: [{ is_read: 'asc' }, { created_at: 'desc' }],
    take: Math.min(Math.max(limit, 1), 100),
  });
}

export function countUnread(userId, companyId) {
  return prisma.notification.count({ where: { user_id: userId, company_id: companyId, is_read: false } });
}

export function findNotification(userId, companyId, id) {
  return prisma.notification.findFirst({ where: { id, user_id: userId, company_id: companyId } });
}

export function markRead(id) {
  return prisma.notification.update({ where: { id }, data: { is_read: true } });
}

export function markAllRead(userId, companyId) {
  return prisma.notification.updateMany({ where: { user_id: userId, company_id: companyId }, data: { is_read: true } });
}

export function createNotification(data) {
  return prisma.notification.create({ data });
}

export function listAttendantUsers(companyId) {
  return prisma.userCompany.findMany({
    where: { company_id: companyId, status: 'active', role: { in: ['admin', 'manager', 'operator'] } },
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
  });
}

export function createOrderNotificationLog(data) {
  return prisma.orderNotificationLog.create({ data });
}

export function listOrderNotificationLogs(companyId, { limit = 50 } = {}) {
  return prisma.orderNotificationLog.findMany({
    where: { company_id: companyId },
    orderBy: { created_at: 'desc' },
    take: Math.min(Math.max(limit, 1), 200),
  });
}

export default {
  listNotifications,
  countUnread,
  findNotification,
  markRead,
  markAllRead,
  createNotification,
  listAttendantUsers,
  createOrderNotificationLog,
  listOrderNotificationLogs,
};