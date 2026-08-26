import prisma from '../../../infrastructure/database/prismaClient.js';

export function listFlows(companyId, { type, isActive } = {}) {
  return prisma.automationFlow.findMany({
    where: {
      company_id: companyId,
      ...(type ? { type } : {}),
      ...(typeof isActive === 'boolean' ? { is_active: isActive } : {}),
    },
    orderBy: { created_at: 'desc' },
  });
}

export function findFlowById(companyId, id) {
  return prisma.automationFlow.findFirst({ where: { company_id: companyId, id } });
}

export function createFlow(data) {
  return prisma.automationFlow.create({ data });
}

export function updateFlow(companyId, id, data) {
  return prisma.automationFlow.updateMany({ where: { company_id: companyId, id }, data });
}

export function findUpdatedFlow(companyId, id) {
  return prisma.automationFlow.findFirst({ where: { company_id: companyId, id } });
}

export function deleteFlow(companyId, id) {
  return prisma.automationFlow.deleteMany({ where: { company_id: companyId, id } });
}

export function incrementMessagesCount(id) {
  return prisma.automationFlow.update({
    where: { id },
    data: { messages_count: { increment: 1 } },
  });
}

export function findActiveFlowByType(companyId, type) {
  return prisma.automationFlow.findFirst({
    where: { company_id: companyId, type, is_active: true },
    orderBy: { updated_at: 'desc' },
  });
}

export function listQuickReplies(companyId) {
  return prisma.quickReply.findMany({
    where: { company_id: companyId },
    orderBy: { shortcut: 'asc' },
  });
}

export function findQuickReplyById(companyId, id) {
  return prisma.quickReply.findFirst({ where: { company_id: companyId, id } });
}

export function createQuickReply(data) {
  return prisma.quickReply.create({ data });
}

export function updateQuickReply(companyId, id, data) {
  return prisma.quickReply.updateMany({ where: { company_id: companyId, id }, data });
}

export function deleteQuickReply(companyId, id) {
  return prisma.quickReply.deleteMany({ where: { company_id: companyId, id } });
}

export function incrementQuickReplyUsage(id) {
  return prisma.quickReply.update({ where: { id }, data: { usage_count: { increment: 1 } } });
}

export default {
  listFlows,
  findFlowById,
  createFlow,
  updateFlow,
  findUpdatedFlow,
  deleteFlow,
  incrementMessagesCount,
  findActiveFlowByType,
  listQuickReplies,
  findQuickReplyById,
  createQuickReply,
  updateQuickReply,
  deleteQuickReply,
  incrementQuickReplyUsage,
};