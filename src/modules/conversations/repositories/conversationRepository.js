import prisma from '../../../infrastructure/database/prismaClient.js';

export function listConversations(companyId, { channel, status, search, limit = 50, cursor } = {}) {
  const where = { company_id: companyId, is_archived: false };
  if (channel) where.channel = channel;
  if (status) where.status = status;
  if (search) where.OR = [
    { contact_name: { contains: search, mode: 'insensitive' } },
    { contact_phone: { contains: search } },
    { last_message: { contains: search, mode: 'insensitive' } },
  ];

  return prisma.conversation.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true } },
      messages: { orderBy: { sent_at: 'desc' }, take: 1, select: { content: true, sender_type: true, sent_at: true } },
    },
    orderBy: [{ is_pinned: 'desc' }, { last_message_at: 'desc' }],
    take: Math.min(Math.max(limit, 1), 200),
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
}

export function findConversationById(companyId, id) {
  return prisma.conversation.findFirst({
    where: { company_id: companyId, id },
    include: {
      assignee: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true, phone: true } },
    },
  });
}

export function findConversationByContact(companyId, channel, contactPhone) {
  return prisma.conversation.findFirst({
    where: { company_id: companyId, channel, contact_phone: contactPhone },
  });
}

export function createConversation(data) {
  return prisma.conversation.create({ data });
}

export function findWaitingConversationsOlderThan(companyId, thresholdDate) {
  return prisma.conversation.findMany({
    where: {
      company_id: companyId,
      status: 'waiting',
      updated_at: { lt: thresholdDate },
    },
    take: 50,
  });
}

export function updateConversation(id, data) {
  return prisma.conversation.update({ where: { id }, data });
}

export function updateConversationLastMessage(id, content, unreadIncrement = 0) {
  return prisma.conversation.update({
    where: { id },
    data: {
      last_message: content,
      last_message_at: new Date(),
      unread_count: { increment: unreadIncrement },
    },
  });
}

export function listMessages(companyId, conversationId, { limit = 50, before } = {}) {
  return prisma.message.findMany({
    where: { conversation_id: conversationId, conversation: { company_id: companyId } },
    orderBy: { sent_at: 'desc' },
    take: Math.min(Math.max(limit, 1), 200),
    ...(before ? { cursor: { id: before }, skip: 1 } : {}),
  });
}

export function createMessage(data) {
  return prisma.message.create({ data });
}

export function markConversationRead(id) {
  return prisma.conversation.update({
    where: { id },
    data: { unread_count: 0 },
  });
}

export function markMessagesRead(conversationId) {
  return prisma.message.updateMany({
    where: { conversation_id: conversationId, is_read: false },
    data: { is_read: true, read_at: new Date() },
  });
}

export default {
  listConversations,
  findConversationById,
  findConversationByContact,
  createConversation,
  updateConversation,
  updateConversationLastMessage,
  listMessages,
  createMessage,
  markConversationRead,
  markMessagesRead,
};