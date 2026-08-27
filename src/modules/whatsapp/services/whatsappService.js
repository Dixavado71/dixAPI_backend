import { BadRequestError, NotFoundError, ConflictError } from '../../../shared/errors/AppError.js';
import * as whatsappRepo from '../repositories/whatsappRepository.js';
import * as conversationRepo from '../../conversations/repositories/conversationRepository.js';
import * as evolutionApi from '../../../infrastructure/whatsapp/evolutionApiClient.js';
import { env } from '../../../config/env.js';

async function syncConversation({ companyId, number, phoneNumber, sender, content, messageType, sentAt }) {
  const channel = 'whatsapp';
  let conversation = await conversationRepo.findConversationByContact(companyId, channel, phoneNumber);
  const name = content || messageType;

  if (!conversation) {
    conversation = await conversationRepo.createConversation({
      company_id: companyId,
      channel,
      contact_name: phoneNumber,
      contact_phone: phoneNumber,
      last_message: content || null,
      last_message_at: sentAt,
      unread_count: sender === 'customer' ? 1 : 0,
      status: sender === 'customer' ? 'open' : 'waiting',
    });
  } else {
    conversation = await conversationRepo.updateConversationLastMessage(conversation.id, content || null, sender === 'customer' ? 1 : 0);
    if (sender === 'customer') {
      conversation = await conversationRepo.updateConversation(conversation.id, { status: 'open' });
    }
  }

  await conversationRepo.createMessage({
    conversation_id: conversation.id,
    sender_type: sender,
    message_type: messageType === 'audio' ? 'audio' : messageType === 'image' ? 'image' : messageType === 'document' ? 'file' : 'text',
    content: content || '',
    status: 'delivered',
    sent_at: sentAt,
  });

  void number;
  return conversation;
}

export async function listNumbers(companyId) {
  return whatsappRepo.listNumbers(companyId);
}

export async function connectNumber(companyId, data) {
  if (!env.evolutionApiUrl) throw new BadRequestError('EvolutionAPI não configurada. Contate o administrador.');

  const existing = await whatsappRepo.findNumberByPhone(companyId, data.phoneNumber);
  if (existing && existing.status !== 'disconnected') throw new ConflictError('Este número já está cadastrado.');

  const instanceName = `${companyId.slice(0, 8)}_${data.phoneNumber}`;
  let evolutionInstance;
  try {
    evolutionInstance = await evolutionApi.createInstance(instanceName);
  } catch (error) {
    throw new BadRequestError(`Não foi possível criar a instância no EvolutionAPI: ${error.message}`);
  }

  if (!evolutionInstance) throw new BadRequestError('Não foi possível criar a instância no EvolutionAPI.');

  const number = await whatsappRepo.upsertNumber(companyId, {
    phoneNumber: data.phoneNumber,
    displayName: data.displayName,
    status: 'pending',
    isBotEnabled: true,
    externalAccountId: instanceName,
  });

  return { number, qrcode: evolutionInstance?.qrcode?.base64 ?? null, instanceName };
}

export async function getQrCode(companyId, numberId) {
  const number = await whatsappRepo.findNumberById(companyId, numberId);
  if (!number) throw new NotFoundError('Número não encontrado.');
  if (!number.external_account_id) throw new BadRequestError('Número não possui instância EvolutionAPI.');

  const qr = await evolutionApi.getInstanceQrCode(number.external_account_id);
  return { base64: qr.base64 ?? null, code: qr.code ?? null, pairingCode: qr.pairingCode ?? null };
}

export async function getStatus(companyId, numberId) {
  const number = await whatsappRepo.findNumberById(companyId, numberId);
  if (!number) throw new NotFoundError('Número não encontrado.');

  if (!number.external_account_id) {
    return { number, connectionState: null, rawState: null, isConnecting: false };
  }

  const state = await evolutionApi.getConnectionState(number.external_account_id).catch(() => null);
  const rawState = state?.instance?.state ?? 'unknown';
  const mappedStatus = rawState === 'open' ? 'connected' : rawState === 'close' ? 'disconnected' : 'pending';

  if (mappedStatus !== number.status) {
    await whatsappRepo.updateNumberById(number.id, { status: mappedStatus });
  }

  return {
    number: { ...number, status: mappedStatus },
    connectionState: state,
    rawState,
    isConnecting: rawState === 'connecting' || rawState === 'pending' || rawState === 'qrcode',
  };
}

export async function disconnectNumber(companyId, numberId) {
  const number = await whatsappRepo.findNumberById(companyId, numberId);
  if (!number) throw new NotFoundError('Número não encontrado.');

  if (number.external_account_id) {
    await evolutionApi.logoutInstance(number.external_account_id).catch(() => null);
    await evolutionApi.deleteInstance(number.external_account_id).catch(() => null);
  }

  await whatsappRepo.updateNumberById(number.id, { status: 'disconnected', external_account_id: null, is_bot_enabled: false });
  return { disconnected: true };
}

export async function deleteNumber(companyId, numberId) {
  const number = await whatsappRepo.findNumberById(companyId, numberId);
  if (!number) throw new NotFoundError('Número não encontrado.');

  if (number.external_account_id) {
    await evolutionApi.logoutInstance(number.external_account_id).catch(() => null);
    await evolutionApi.deleteInstance(number.external_account_id).catch(() => null);
  }

  await whatsappRepo.deleteNumberWithData(companyId, numberId);
  return { deleted: true };
}

export async function sendMessage(companyId, numberId, data) {
  const number = await whatsappRepo.findNumberById(companyId, numberId);
  if (!number) throw new NotFoundError('Número de envio não encontrado.');
  if (number.status !== 'connected') throw new BadRequestError('Número não está conectado.');
  if (!number.external_account_id) throw new BadRequestError('Número não possui instância EvolutionAPI.');

  const result = await evolutionApi.sendText(number.external_account_id, data.to, data.text, data.delay);
  const contact = await whatsappRepo.upsertContact(companyId, number.id, { phoneNumber: data.to });

  await whatsappRepo.createMessage({
    company_id: companyId,
    whatsapp_number_id: number.id,
    customer_id: contact.customer_id,
    external_message_id: result?.key?.id ?? null,
    direction: 'outbound',
    message_type: 'text',
    content: data.text,
    status: 'sent',
    sent_at: new Date(),
  });

  await syncConversation({
    companyId,
    number,
    phoneNumber: data.to,
    sender: 'user',
    content: data.text,
    messageType: 'text',
    sentAt: new Date(),
  }).catch(() => null);

  return { sent: true, externalMessageId: result?.key?.id ?? null };
}

export async function sendMedia(companyId, numberId, data) {
  const number = await whatsappRepo.findNumberById(companyId, numberId);
  if (!number) throw new NotFoundError('Número de envio não encontrado.');
  if (number.status !== 'connected') throw new BadRequestError('Número não está conectado.');
  if (!number.external_account_id) throw new BadRequestError('Número não possui instância EvolutionAPI.');

  const result = await evolutionApi.sendMedia(number.external_account_id, data.to, data.mediaType, data.mediaUrl, data.caption, data.delay);
  await whatsappRepo.upsertContact(companyId, number.id, { phoneNumber: data.to });

  await whatsappRepo.createMessage({
    company_id: companyId,
    whatsapp_number_id: number.id,
    direction: 'outbound',
    message_type: data.mediaType,
    content: data.caption ?? data.mediaUrl,
    status: 'sent',
    sent_at: new Date(),
  });

  await syncConversation({
    companyId,
    number,
    phoneNumber: data.to,
    sender: 'user',
    content: data.caption ?? data.mediaUrl,
    messageType: data.mediaType,
    sentAt: new Date(),
  }).catch(() => null);

  return { sent: true, externalMessageId: result?.key?.id ?? null };
}

async function requireConnectedNumber(companyId, numberId) {
  const number = await whatsappRepo.findNumberById(companyId, numberId);
  if (!number) throw new NotFoundError('Número de envio não encontrado.');
  if (number.status !== 'connected') throw new BadRequestError('Número não está conectado.');
  if (!number.external_account_id) throw new BadRequestError('Número não possui instância EvolutionAPI.');
  return number;
}

async function recordOutboundMessage(number, to, content, messageType, externalId) {
  const contact = await whatsappRepo.upsertContact(number.company_id, number.id, { phoneNumber: to }).catch(() => null);
  await whatsappRepo.createMessage({
    company_id: number.company_id,
    whatsapp_number_id: number.id,
    customer_id: contact?.customer_id ?? null,
    external_message_id: externalId ?? null,
    direction: 'outbound',
    message_type: messageType,
    content: content || null,
    status: 'sent',
    sent_at: new Date(),
  }).catch(() => null);
  await syncConversation({
    companyId: number.company_id,
    number,
    phoneNumber: to,
    sender: 'user',
    content: content || messageType,
    messageType,
    sentAt: new Date(),
  }).catch(() => null);
}

export async function sendAudioMessage(companyId, numberId, data) {
  const number = await requireConnectedNumber(companyId, numberId);
  const result = await evolutionApi.sendWhatsAppAudio(number.external_account_id, data.to, data.audioUrl, data.delay);
  await recordOutboundMessage(number, data.to, null, 'audio', result?.key?.id ?? null);
  return { sent: true, externalMessageId: result?.key?.id ?? null };
}

export async function sendDocumentMessage(companyId, numberId, data) {
  const number = await requireConnectedNumber(companyId, numberId);
  const result = await evolutionApi.sendDocument(number.external_account_id, data.to, data.documentUrl, data.caption, data.fileName, data.delay);
  await recordOutboundMessage(number, data.to, data.caption ?? data.fileName, 'file', result?.key?.id ?? null);
  return { sent: true, externalMessageId: result?.key?.id ?? null };
}

export async function sendVideoMessage(companyId, numberId, data) {
  const number = await requireConnectedNumber(companyId, numberId);
  const result = await evolutionApi.sendVideo(number.external_account_id, data.to, data.videoUrl, data.caption, data.delay);
  await recordOutboundMessage(number, data.to, data.caption, 'video', result?.key?.id ?? null);
  return { sent: true, externalMessageId: result?.key?.id ?? null };
}

export async function sendStickerMessage(companyId, numberId, data) {
  const number = await requireConnectedNumber(companyId, numberId);
  const result = await evolutionApi.sendSticker(number.external_account_id, data.to, data.stickerUrl, data.delay);
  await recordOutboundMessage(number, data.to, 'Sticker', 'sticker', result?.key?.id ?? null);
  return { sent: true, externalMessageId: result?.key?.id ?? null };
}

export async function sendButtonsMessage(companyId, numberId, data) {
  const number = await requireConnectedNumber(companyId, numberId);
  const buttons = (data.buttons ?? []).map((b) => ({ type: 'reply', title: b, id: `btn_${Date.now()}_${b}` }));
  const result = await evolutionApi.sendButtons(number.external_account_id, data.to, data.title, data.description, buttons, data.footer, data.delay);
  await recordOutboundMessage(number, data.to, `${data.title}\n${data.description ?? ''}`, 'text', result?.key?.id ?? null);
  return { sent: true, externalMessageId: result?.key?.id ?? null };
}

export async function sendListMessage(companyId, numberId, data) {
  const number = await requireConnectedNumber(companyId, numberId);
  const sections = (data.sections ?? []).map((s) => ({
    title: s.title,
    rows: (s.rows ?? []).map((r) => ({ title: r.title, description: r.description ?? '', rowId: r.id ?? r.title })),
  }));
  const result = await evolutionApi.sendList(number.external_account_id, data.to, data.title, data.description, data.buttonText, sections, data.delay);
  await recordOutboundMessage(number, data.to, `${data.title}\n${data.description ?? ''}`, 'text', result?.key?.id ?? null);
  return { sent: true, externalMessageId: result?.key?.id ?? null };
}

export async function sendLocationMessage(companyId, numberId, data) {
  const number = await requireConnectedNumber(companyId, numberId);
  const result = await evolutionApi.sendLocation(number.external_account_id, data.to, data.name, data.address, data.latitude, data.longitude, data.delay);
  await recordOutboundMessage(number, data.to, `📍 ${data.name ?? ''} ${data.address ?? ''}`.trim(), 'text', result?.key?.id ?? null);
  return { sent: true, externalMessageId: result?.key?.id ?? null };
}

export async function sendReactionMessage(companyId, numberId, data) {
  const number = await requireConnectedNumber(companyId, numberId);
  const result = await evolutionApi.sendReaction(number.external_account_id, data.to, data.messageId, data.reaction);
  return { sent: true, externalMessageId: result?.key?.id ?? null };
}

export async function sendStatus(companyId, numberId, data) {
  const number = await requireConnectedNumber(companyId, numberId);
  const statusJidList = (data.statusJidList ?? []).map((n) => n.replace(/\D/g, ''));
  const result = await evolutionApi.sendStatusText(number.external_account_id, data.content, statusJidList);
  return { sent: true, result };
}

export async function sendStatusMedia(companyId, numberId, data) {
  const number = await requireConnectedNumber(companyId, numberId);
  const statusJidList = (data.statusJidList ?? []).map((n) => n.replace(/\D/g, ''));
  const result = await evolutionApi.sendStatusMedia(number.external_account_id, data.mediaType, data.mediaUrl, data.caption, statusJidList);
  return { sent: true, result };
}

export async function markAsRead(companyId, numberId, data) {
  const number = await requireConnectedNumber(companyId, numberId);
  const result = await evolutionApi.markMessageAsRead(number.external_account_id, data.to, data.messageId);
  return { read: true, result };
}

export async function setTyping(companyId, numberId, data) {
  const number = await requireConnectedNumber(companyId, numberId);
  await evolutionApi.sendTyping(number.external_account_id, data.to);
  return { typing: true };
}

export async function setOnlinePresence(companyId, numberId, data) {
  const number = await requireConnectedNumber(companyId, numberId);
  await evolutionApi.setPresence(number.external_account_id, data.presence ?? 'available');
  return { presence: data.presence ?? 'available' };
}

function extractMessageText(message) {
  if (!message) return null;
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;
  if (message.documentMessage?.title) return message.documentMessage.title;
  if (message.audioMessage) return '🎵 Áudio';
  if (message.stickerMessage) return '🖼️ Sticker';
  if (message.locationMessage) return '📍 Localização';
  if (message.contactMessage?.displayName) return `👤 ${message.contactMessage.displayName}`;
  return '(mídia)';
}

function mapChat(chat) {
  const remoteJid = chat.remoteJid ?? chat.key?.remoteJid ?? '';
  const lastMsg = chat.lastMessage ?? {};
  return {
    id: remoteJid,
    remoteJid,
    name: chat.pushName ?? chat.name ?? remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', ''),
    pushName: chat.pushName ?? null,
    profilePicUrl: chat.profilePicUrl ?? null,
    lastMessage: extractMessageText(lastMsg.message),
    lastMessageType: lastMsg.messageType ?? null,
    lastMessageTime: lastMsg.messageTimestamp ? new Date(lastMsg.messageTimestamp * 1000).toISOString() : chat.updatedAt ?? null,
    unreadCount: chat.unreadCount ?? 0,
    isGroup: remoteJid.endsWith('@g.us'),
    isSaved: chat.isSaved ?? false,
    windowActive: chat.windowActive ?? false,
  };
}

function mapMessage(msg) {
  return {
    id: msg.key?.id ?? msg.id,
    remoteJid: msg.key?.remoteJid ?? '',
    fromMe: msg.key?.fromMe ?? false,
    pushName: msg.pushName ?? null,
    messageType: msg.messageType ?? null,
    content: extractMessageText(msg.message),
    messageTimestamp: msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : null,
    status: msg.status ?? null,
    source: msg.source ?? null,
  };
}

export async function listChats(companyId, numberId) {
  const number = await whatsappRepo.findNumberById(companyId, numberId);
  if (!number) throw new NotFoundError('Número não encontrado.');
  if (!number.external_account_id) throw new BadRequestError('Número não possui instância EvolutionAPI.');
  const chats = await evolutionApi.fetchChats(number.external_account_id);
  return Array.isArray(chats) ? chats.map(mapChat) : [];
}

export async function listChatMessages(companyId, numberId, chatId, limit) {
  const number = await whatsappRepo.findNumberById(companyId, numberId);
  if (!number) throw new NotFoundError('Número não encontrado.');
  if (!number.external_account_id) throw new BadRequestError('Número não possui instância EvolutionAPI.');
  const messages = await whatsappRepo.listMessages(companyId, numberId, { limit: limit || 100 });
  return messages.map((m) => ({
    id: m.id,
    remoteJid: chatId,
    fromMe: m.direction === 'outbound',
    pushName: null,
    messageType: m.message_type,
    content: m.content,
    messageTimestamp: m.sent_at ? new Date(m.sent_at).getTime() : null,
    status: m.status,
    source: 'database',
  })).reverse();
}

export async function updateProfile(companyId, numberId, data) {
  const number = await whatsappRepo.findNumberById(companyId, numberId);
  if (!number) throw new NotFoundError('Número não encontrado.');
  if (!number.external_account_id) throw new BadRequestError('Número não possui instância EvolutionAPI.');
  const result = await evolutionApi.updateProfileName(number.external_account_id, data.name);
  await whatsappRepo.updateNumberById(number.id, { display_name: data.name });
  return { updated: true, result };
}

export async function updateProfilePicture(companyId, numberId, data) {
  const number = await whatsappRepo.findNumberById(companyId, numberId);
  if (!number) throw new NotFoundError('Número não encontrado.');
  if (!number.external_account_id) throw new BadRequestError('Número não possui instância EvolutionAPI.');
  const result = await evolutionApi.updateProfilePicture(number.external_account_id, data.picture);
  return { updated: true, result };
}

export async function restartInstance(companyId, numberId) {
  const number = await whatsappRepo.findNumberById(companyId, numberId);
  if (!number) throw new NotFoundError('Número não encontrado.');
  if (!number.external_account_id) throw new BadRequestError('Número não possui instância EvolutionAPI.');
  const result = await evolutionApi.restartInstance(number.external_account_id);
  return { restarted: true, result };
}

export async function logoutOnly(companyId, numberId) {
  const number = await whatsappRepo.findNumberById(companyId, numberId);
  if (!number) throw new NotFoundError('Número não encontrado.');
  if (!number.external_account_id) throw new BadRequestError('Número não possui instância EvolutionAPI.');
  const result = await evolutionApi.logoutInstance(number.external_account_id);
  await whatsappRepo.updateNumberById(number.id, { status: 'disconnected' });
  return { loggedOut: true, result };
}

export async function getInstanceWebhook(companyId, numberId) {
  const number = await whatsappRepo.findNumberById(companyId, numberId);
  if (!number) throw new NotFoundError('Número não encontrado.');
  if (!number.external_account_id) throw new BadRequestError('Número não possui instância EvolutionAPI.');
  const result = await evolutionApi.getWebhook(number.external_account_id).catch(() => ({ webhook: null }));
  return { webhook: result?.webhook ?? null, verified: number.webhook_verified, url: `${env.publicApiUrl}/api/v1/whatsapp/webhook/${number.external_account_id}` };
}

export async function updateInstanceWebhook(companyId, numberId) {
  const number = await whatsappRepo.findNumberById(companyId, numberId);
  if (!number) throw new NotFoundError('Número não encontrado.');
  if (!number.external_account_id) throw new BadRequestError('Número não possui instância EvolutionAPI.');
  const webhookUrl = `${env.publicApiUrl}/api/v1/whatsapp/webhook/${number.external_account_id}`;
  const result = await evolutionApi.setWebhook(number.external_account_id, webhookUrl);
  await whatsappRepo.updateNumberById(number.id, { webhook_verified: true });
  return { configured: true, result };
}

async function requireNumber(companyId, numberId) {
  const number = await whatsappRepo.findNumberById(companyId, numberId);
  if (!number) throw new NotFoundError('Número não encontrado.');
  if (!number.external_account_id) throw new BadRequestError('Número não possui instância EvolutionAPI.');
  return number;
}

/* ===== Groups ===== */

export async function createGroup(companyId, numberId, data) {
  const number = await requireConnectedNumber(companyId, numberId);
  const participants = (data.participants ?? []).map((p) => p.replace(/\D/g, ''));
  return evolutionApi.createGroup(number.external_account_id, data.name, participants);
}

export async function listGroups(companyId, numberId) {
  const number = await requireNumber(companyId, numberId);
  const chats = await evolutionApi.fetchChats(number.external_account_id);
  return Array.isArray(chats) ? chats.filter((c) => c.remoteJid?.endsWith('@g.us')).map((c) => ({
    id: c.remoteJid ?? c.id,
    subject: c.name ?? c.subject ?? c.pushName ?? '',
    name: c.name ?? c.subject ?? c.pushName ?? '',
    participants: [],
    lastMessage: c.lastMessage ?? null,
    unreadCount: c.unreadCount ?? 0,
  })) : [];
}

export async function findGroup(companyId, numberId, groupId) {
  const number = await requireNumber(companyId, numberId);
  const chats = await evolutionApi.fetchChats(number.external_account_id);
  const found = Array.isArray(chats) ? chats.find((c) => c.remoteJid === groupId || c.id === groupId) : null;
  if (!found) throw new NotFoundError('Grupo não encontrado.');
  return {
    id: found.remoteJid ?? found.id,
    subject: found.name ?? found.subject ?? found.pushName ?? '',
    name: found.name ?? found.subject ?? found.pushName ?? '',
    participants: [],
    lastMessage: found.lastMessage ?? null,
    unreadCount: found.unreadCount ?? 0,
  };
}

export async function updateGroup(companyId, numberId, groupId, data) {
  const number = await requireNumber(companyId, numberId);
  if (data.name) return evolutionApi.updateGroupSubject(number.external_account_id, groupId, data.name);
  if (data.description) return evolutionApi.updateGroupDescription(number.external_account_id, groupId, data.description);
  return evolutionApi.updateGroupSetting(number.external_account_id, groupId, data.action);
}

export async function groupSettings(companyId, numberId, groupId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.updateGroupSetting(number.external_account_id, groupId, data.action);
}

export async function addParticipant(companyId, numberId, groupId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.updateParticipant(number.external_account_id, groupId, 'add', [data.phone]);
}

export async function removeParticipant(companyId, numberId, groupId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.updateParticipant(number.external_account_id, groupId, 'remove', [data.phone]);
}

export async function promoteParticipant(companyId, numberId, groupId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.updateParticipant(number.external_account_id, groupId, 'promote', [data.phone]);
}

export async function demoteParticipant(companyId, numberId, groupId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.updateParticipant(number.external_account_id, groupId, 'demote', [data.phone]);
}

export async function inviteLink(companyId, numberId, groupId) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.groupInviteCode(number.external_account_id, groupId);
}

export async function revokeInvite(companyId, numberId, groupId) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.revokeInviteCode(number.external_account_id, groupId);
}

export async function acceptInvite(companyId, numberId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.acceptInviteCode(number.external_account_id, data.code);
}

export async function groupPicture(companyId, numberId, groupId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.updateGroupPicture(number.external_account_id, groupId, data.picture);
}

export async function leaveGroup(companyId, numberId, groupId) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.leaveGroup(number.external_account_id, groupId);
}

/* ===== Status / Stories ===== */

export async function listStatus(companyId, numberId) {
  const number = await requireNumber(companyId, numberId);
  try {
    return await evolutionApi.findStatusMessage(number.external_account_id, 'status@broadcast');
  } catch {
    return [];
  }
}

export async function getStatusById(companyId, numberId, statusId) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.findStatusMessage(number.external_account_id, statusId);
}

export async function reactStatus(companyId, numberId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.sendReaction(number.external_account_id, data.number, data.statusId, data.reaction);
}

/* ===== Chats (extra) ===== */

export async function findChat(companyId, numberId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.findChatByRemoteJid(number.external_account_id, data.chatId);
}

export async function archiveChat(companyId, numberId, chatId) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.archiveChat(number.external_account_id, chatId);
}

export async function unarchiveChat(companyId, numberId, chatId) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.markChatUnread(number.external_account_id, chatId);
}

export async function fetchAllMessages(companyId, numberId, chatId) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.findChatByRemoteJid(number.external_account_id, chatId);
}

export async function checkNumber(companyId, numberId, data) {
  const number = await requireNumber(companyId, numberId);
  try {
    return await evolutionApi.whatsappNumbers(number.external_account_id, [data.number]);
  } catch {
    return { exists: null, reason: 'não foi possível verificar' };
  }
}

/* ===== Messages (advanced) ===== */

export async function sendPoll(companyId, numberId, data) {
  const number = await requireConnectedNumber(companyId, numberId);
  return evolutionApi.sendPoll(number.external_account_id, data.number, data.name, data.values);
}

export async function editMessage(companyId, numberId, data) {
  const number = await requireConnectedNumber(companyId, numberId);
  return evolutionApi.updateMessage(number.external_account_id, data.number, data.messageId, data.text);
}

export async function deleteMessage(companyId, numberId, data) {
  const number = await requireConnectedNumber(companyId, numberId);
  return evolutionApi.deleteMessageForEveryone(number.external_account_id, data.number, data.messageId);
}

export async function sendContact(companyId, numberId, data) {
  const number = await requireConnectedNumber(companyId, numberId);
  return evolutionApi.sendContactVcard(number.external_account_id, data.number, data.name, data.phone);
}

/* ===== Profile ===== */

export async function getProfilePicture(companyId, numberId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.fetchProfilePictureUrl(number.external_account_id, data.number);
}

export async function getProfileName(companyId, numberId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.fetchProfile(number.external_account_id, data.number);
}

export async function handleWebhook(instanceName, payload) {
  if (!payload?.event || !payload?.data) return;

  const number = await whatsappRepo.findNumberByExternalAccountId(instanceName);
  if (!number) return;

  const { event, data } = payload;

  if (event === 'CONNECTION_UPDATE') {
    const newStatus = data.state === 'open' ? 'connected' : data.state === 'close' ? 'disconnected' : 'pending';
    await whatsappRepo.updateNumberById(number.id, { status: newStatus, last_connected_at: newStatus === 'connected' ? new Date() : undefined });
    return;
  }

  if (event === 'QRCODE_UPDATED') return;

  if (event === 'MESSAGES_UPDATE' && data.key?.id) {
    const statusMap = { 1: 'sent', 2: 'delivered', 3: 'read', 4: 'played' };
    const statusCode = typeof data.status === 'number' ? data.status : null;
    const statusLabel = data.status && typeof data.status === 'string' ? data.status.toUpperCase() : statusMap[statusCode];
    if (statusLabel) {
      const normalized = String(statusLabel).toLowerCase();
      await whatsappRepo.updateMessageStatusByExternalId(data.key.id, normalized).catch(() => null);
    }
    return;
  }

  if (event === 'PRESENCE_UPDATE' && data.id) {
    const phone = String(data.id).replace('@c.us', '').replace('@s.whatsapp.net', '').replace('@lid', '');
    const presence = data.presences?.[phone] ?? data.presence ?? null;
    if (presence) {
      const contact = await whatsappRepo.findContactByPhone(number.company_id, number.id, phone);
      if (contact?.id) {
        await whatsappRepo.updateContactMetadata(contact.id, { ...(contact.metadata ?? {}), presence, presenceUpdatedAt: new Date().toISOString() });
      }
    }
    return;
  }

  if (event === 'CHAT_PRESENCE_UPDATE' && data.id) {
    const phone = String(data.id).replace('@c.us', '').replace('@s.whatsapp.net', '').replace('@lid', '');
    const state = data.state; // 'composing' | 'recording' | 'paused'
    const contact = await whatsappRepo.findContactByPhone(number.company_id, number.id, phone);
    if (contact?.id) {
      await whatsappRepo.updateContactMetadata(contact.id, { ...(contact.metadata ?? {}), typingState: state, typingUpdatedAt: new Date().toISOString() });
    }
    return;
  }

  if (event === 'MESSAGES_UPSERT' && data.key?.fromMe === false) {
    const remoteJid = data.key.remoteJid;
    const phoneNumber = String(remoteJid).replace('@c.us', '').replace('@s.whatsapp.net', '');
    const externalId = data.key.id;
    const messageContent = data.message?.conversation || data.message?.extendedTextMessage?.text || '';
    const messageType = data.messageType === 'conversation' ? 'text' : data.messageType;

    const existing = await whatsappRepo.findMessageByExternalId(number.id, externalId);
    if (existing) return;

    const contact = await whatsappRepo.upsertContact(number.company_id, number.id, {
      phoneNumber,
      name: data.pushName ?? null,
      metadata: { pushName: data.pushName, remoteJid },
    });

    await whatsappRepo.createMessage({
      company_id: number.company_id,
      whatsapp_number_id: number.id,
      customer_id: contact.customer_id,
      external_message_id: externalId,
      direction: 'inbound',
      message_type: messageType,
      content: messageContent || null,
      status: 'received',
      sent_at: new Date((data.messageTimestamp || 0) * 1000),
    });

    await syncConversation({
      companyId: number.company_id,
      number,
      phoneNumber,
      sender: 'customer',
      content: messageContent,
      messageType,
      sentAt: new Date((data.messageTimestamp || 0) * 1000),
    }).catch(() => null);

    if (number.is_bot_enabled && messageContent) {
      const { processIncomingMessage } = await import('../../automation/services/automationService.js');
      await processIncomingMessage({ companyId: number.company_id, number, from: phoneNumber, text: messageContent, contact }).catch(() => null);
    }
  }
}

export default {
  listNumbers,
  connectNumber,
  getQrCode,
  getStatus,
  disconnectNumber,
  deleteNumber,
  sendMessage,
  sendMedia,
  sendAudioMessage,
  sendDocumentMessage,
  sendVideoMessage,
  sendStickerMessage,
  sendButtonsMessage,
  sendListMessage,
  sendLocationMessage,
  sendReactionMessage,
  sendStatus,
  sendStatusMedia,
  markAsRead,
  setTyping,
  setOnlinePresence,
  listChats,
  listChatMessages,
  updateProfile,
  updateProfilePicture,
  restartInstance,
  logoutOnly,
  getInstanceWebhook,
  updateInstanceWebhook,
  createGroup,
  listGroups,
  findGroup,
  updateGroup,
  groupSettings,
  addParticipant,
  removeParticipant,
  promoteParticipant,
  demoteParticipant,
  inviteLink,
  revokeInvite,
  acceptInvite,
  groupPicture,
  leaveGroup,
  listStatus,
  getStatusById,
  reactStatus,
  findChat,
  archiveChat,
  unarchiveChat,
  fetchAllMessages,
  checkNumber,
  sendPoll,
  editMessage,
  deleteMessage,
  sendContact,
  getProfilePicture,
  getProfileName,
  handleWebhook,
};