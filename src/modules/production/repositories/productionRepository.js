import prisma from '../../../infrastructure/database/prismaClient.js';

export function findSettings(companyId) {
  return prisma.productionSettings.findUnique({ where: { company_id: companyId } });
}

export function upsertSettings(companyId, data) {
  return prisma.productionSettings.upsert({
    where: { company_id: companyId },
    create: { company_id: companyId, ...data },
    update: data,
  });
}

export function findOrderWithItems(companyId, orderId) {
  return prisma.order.findFirst({
    where: { id: orderId, company_id: companyId },
    include: { order_items: { include: { product: true } }, customer: true },
  });
}

export function listScheduledOrders(companyId, status) {
  return prisma.productionSchedule.findMany({
    where: { company_id: companyId, ...(status ? { status } : {}) },
    include: { order: { include: { customer: true } } },
    orderBy: { scheduled_date: 'asc' },
  });
}

export function findLastSchedule(companyId) {
  return prisma.productionSchedule.findFirst({
    where: { company_id: companyId },
    orderBy: { scheduled_date: 'desc' },
  });
}

export function findScheduleByOrder(companyId, orderId) {
  return prisma.productionSchedule.findFirst({
    where: { company_id: companyId, order_id: orderId },
  });
}

export function createSchedule(companyId, data) {
  return prisma.productionSchedule.create({ data: { company_id: companyId, ...data } });
}

export function updateSchedule(companyId, id, data) {
  return prisma.productionSchedule.updateMany({ where: { id, company_id: companyId }, data });
}

export function updateOrderDates(companyId, orderId, data) {
  return prisma.order.updateMany({ where: { id: orderId, company_id: companyId }, data });
}

export default {
  findSettings,
  upsertSettings,
  findOrderWithItems,
  listScheduledOrders,
  findLastSchedule,
  findScheduleByOrder,
  createSchedule,
  updateSchedule,
  updateOrderDates,
};
