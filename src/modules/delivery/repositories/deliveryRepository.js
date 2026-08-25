import prisma from '../../../infrastructure/database/prismaClient.js';

export function findSettings(companyId) {
  return prisma.deliverySettings.findUnique({ where: { company_id: companyId } });
}

export function upsertSettings(companyId, data) {
  return prisma.deliverySettings.upsert({
    where: { company_id: companyId },
    create: { company_id: companyId, ...data },
    update: data,
  });
}

export function listDrivers(companyId) {
  return prisma.deliveryDriver.findMany({ where: { company_id: companyId }, orderBy: { name: 'asc' } });
}

export function createDriver(companyId, data) {
  return prisma.deliveryDriver.create({ data: { company_id: companyId, ...data } });
}

export function findDelivery(companyId, id) {
  return prisma.delivery.findFirst({
    where: { id, company_id: companyId },
    include: { order: true, driver: true, zone: true, payments: true },
  });
}

export function findOrder(companyId, orderId) {
  return prisma.order.findFirst({ where: { id: orderId, company_id: companyId }, select: { id: true, status: true } });
}

export function findDeliveryByOrderId(companyId, orderId) {
  return prisma.delivery.findFirst({
    where: { order_id: orderId, company_id: companyId },
    include: { order: true, driver: true, zone: true, payments: true },
  });
}

export function listDeliveries(companyId, status) {
  return prisma.delivery.findMany({
    where: { company_id: companyId, ...(status ? { status } : {}) },
    include: { order: true, driver: true, zone: true, payments: true },
    orderBy: { created_at: 'desc' },
  });
}

export function createDelivery(companyId, data) {
  return prisma.delivery.create({
    data: { company_id: companyId, ...data },
    include: { order: true, driver: true, zone: true },
  });
}

export function updateDelivery(companyId, id, data) {
  return prisma.delivery.updateMany({ where: { id, company_id: companyId }, data });
}

export function createPayment(companyId, data) {
  return prisma.paymentRecord.create({ data: { company_id: companyId, ...data } });
}

export function findPayment(companyId, id) {
  return prisma.paymentRecord.findFirst({ where: { id, company_id: companyId } });
}

export function updatePayment(companyId, id, data) {
  return prisma.paymentRecord.updateMany({ where: { id, company_id: companyId }, data });
}
