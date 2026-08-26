import { NotFoundError, BadRequestError } from '../../../shared/errors/AppError.js';
import * as conversationRepo from '../repositories/conversationRepository.js';
import * as whatsappRepo from '../../whatsapp/repositories/whatsappRepository.js';
import * as evolutionApi from '../../../infrastructure/whatsapp/evolutionApiClient.js';

export async function list(companyId, filters) {
  const conversations = await conversationRepo.listConversations(companyId, filters);
  return conversations.map((c) => ({
    id: c.id,
    customer: c.contact_name,
    phone: c.contact_phone,
    channel: c.channel,
    status: c.status,
    lastMessage: c.last_message,
    lastMessageAt: c.last_message_at,
    unread: c.unread_count,
    pinned: c.is_pinned,
    assigned: c.assignee?.name ?? null,
    lastSender: c.messages?.[0]?.sender_type ?? null,
  }));
}

export async function getById(companyId, id) {
  const conversation = await conversationRepo.findConversationById(companyId, id);
  if (!conversation) throw new NotFoundError('Conversa não encontrada.');
  return conversation;
}

export async function listMessages(companyId, id, query) {
  const conversation = await conversationRepo.findConversationById(companyId, id);
  if (!conversation) throw new NotFoundError('Conversa não encontrada.');

  const messages = await conversationRepo.listMessages(companyId, id, { limit: query.limit });
  await conversationRepo.markConversationRead(id);
  await conversationRepo.markMessagesRead(id);

  return messages.map((m) => ({
    id: m.id,
    sender: m.sender_type,
    type: m.message_type,
    content: m.content,
    mediaUrl: m.media_url,
    status: m.status,
    read: m.is_read,
    sentAt: m.sent_at,
  })).reverse();
}

export async function updateStatus(companyId, id, status) {
  const conversation = await conversationRepo.findConversationById(companyId, id);
  if (!conversation) throw new NotFoundError('Conversa não encontrada.');
  return conversationRepo.updateConversation(id, { status });
}

export async function assign(companyId, id, userId) {
  const conversation = await conversationRepo.findConversationById(companyId, id);
  if (!conversation) throw new NotFoundError('Conversa não encontrada.');
  return conversationRepo.updateConversation(id, { assigned_to: userId });
}

export async function sendReply(companyId, id, userId, text) {
  const conversation = await conversationRepo.findConversationById(companyId, id);
  if (!conversation) throw new NotFoundError('Conversa não encontrada.');
  if (!conversation.contact_phone) throw new BadRequestError('Conversa não possui telefone de contato.');

  let sent = true;
  let externalMessageId = null;

  if (conversation.channel === 'whatsapp') {
    const number = await whatsappRepo.listNumbers(companyId).then((list) => list[0]);
    if (number && number.status === 'connected' && number.external_account_id) {
      const result = await evolutionApi.sendText(number.external_account_id, conversation.contact_phone, text).catch(() => null);
      if (result) externalMessageId = result?.key?.id ?? null;
      else sent = false;
    } else {
      sent = false;
    }
  }

  const message = await conversationRepo.createMessage({
    conversation_id: id,
    sender_type: 'user',
    sender_id: userId,
    message_type: 'text',
    content: text,
    status: sent ? 'sent' : 'failed',
  });

  if (sent) {
    await conversationRepo.updateConversationLastMessage(id, text, 0);
  }

  return { ...message, delivered: sent, externalMessageId };
}

export default { list, getById, listMessages, updateStatus, assign, sendReply };