import { NotFoundError, BadRequestError } from '../../../shared/errors/AppError.js';
import * as conversationRepo from '../repositories/conversationRepository.js';
import * as whatsappRepo from '../../whatsapp/repositories/whatsappRepository.js';
import * as evolutionApi from '../../../infrastructure/whatsapp/evolutionApiClient.js';
import { handleCustomerCommand } from '../../../shared/whatsapp/customer.js';

function mapConversation(conversation) {
  if (!conversation) return conversation;
  return {
    id: conversation.id,
    companyId: conversation.company_id,
    customerId: conversation.customer_id,
    channel: conversation.channel,
    contactName: conversation.contact_name,
    contactPhone: conversation.contact_phone,
    lastMessage: conversation.last_message,
    lastMessageAt: conversation.last_message_at,
    unreadCount: conversation.unread_count,
    isPinned: conversation.is_pinned,
    isArchived: conversation.is_archived,
    assignedTo: conversation.assigned_to,
    status: conversation.status,
    createdAt: conversation.created_at,
    updatedAt: conversation.updated_at,
    assignee: conversation.assignee,
    customer: conversation.customer,
  };
}

function mapMessage(message) {
  if (!message) return message;
  return {
    id: message.id,
    conversationId: message.conversation_id,
    senderType: message.sender_type,
    senderId: message.sender_id,
    messageType: message.message_type,
    content: message.content,
    mediaUrl: message.media_url,
    status: message.status,
    isRead: message.is_read,
    readAt: message.read_at,
    sentAt: message.sent_at,
    createdAt: message.created_at,
  };
}

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
  return mapConversation(conversation);
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
  const updated = await conversationRepo.updateConversation(id, { status });
  return mapConversation(updated);
}

export async function assign(companyId, id, userId) {
  const conversation = await conversationRepo.findConversationById(companyId, id);
  if (!conversation) throw new NotFoundError('Conversa não encontrada.');
  const updated = await conversationRepo.updateConversation(id, { assigned_to: userId });
  return mapConversation(updated);
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
      const commandResult = await handleCustomerCommand(companyId, number, conversation.contact_phone, text);
      if (commandResult) {
        const reply = await conversationRepo.createMessage({
          conversation_id: id,
          sender_type: 'bot',
          sender_id: userId,
          message_type: 'text',
          content: `Cliente cadastrado automaticamente.`,
          status: 'sent',
        });
        await conversationRepo.updateConversation(id, { last_message: reply.content, last_message_at: new Date() });
        return { ...mapMessage(reply), delivered: true, registered: true };
      }
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

  return { ...mapMessage(message), delivered: sent, externalMessageId };
}

export default { list, getById, listMessages, updateStatus, assign, sendReply };