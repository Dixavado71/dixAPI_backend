import { BadRequestError, NotFoundError, ConflictError } from '../../../shared/errors/AppError.js';
import * as whatsappRepo from '../repositories/whatsappRepository.js';
import * as conversationRepo from '../../conversations/repositories/conversationRepository.js';
import * as evolutionApi from '../../../infrastructure/whatsapp/evolutionApiClient.js';
import chatbotCache from '../../../infrastructure/cache/chatbotCache.js';
import { env } from '../../../config/env.js';
import { extractMessageText, extractMedia } from '../../../shared/whatsapp/extraction.js';
import { logger } from '../../../config/logger.js';

function jidFromPhone(phone) {
  if (!phone) return null;
  const p = String(phone);
  if (p.includes('@')) return p;
  if (p.endsWith('@g.us') || p.endsWith('@s.whatsapp.net') || p.endsWith('@c.us') || p.endsWith('@lid')) return p;
  return `${p}@s.whatsapp.net`;
}

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
    remote_jid: jidFromPhone(data.to),
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
    remote_jid: jidFromPhone(data.to),
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
    remote_jid: jidFromPhone(to),
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
  await recordOutboundMessage(number, data.to, data.reaction, 'reaction', result?.key?.id ?? null);
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
  const media = extractMedia(msg.message);
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
    isGroup: (msg.key?.remoteJid ?? '').endsWith('@g.us'),
    senderName: msg.pushName ?? null,
    media: media
      ? { type: media.type, url: media.url, caption: media.caption, mimeType: media.mimeType, fileName: media.fileName }
      : null,
  };
}

function mapDbMessage(m) {
  return {
    id: m.external_message_id ?? m.id,
    remoteJid: m.remote_jid ?? '',
    fromMe: m.direction === 'outbound',
    pushName: null,
    messageType: m.message_type ?? null,
    content: m.content ?? null,
    messageTimestamp: m.sent_at ? new Date(m.sent_at).getTime() : null,
    status: m.status ?? null,
    source: 'database',
    isGroup: (m.remote_jid ?? '').endsWith('@g.us'),
    senderName: null,
    media: null,
    reactions: Array.isArray(m.reactions) ? m.reactions : [],
    fetchedFrom: 'database',
  };
}

export async function listChats(companyId, numberId) {
  const number = await whatsappRepo.findNumberById(companyId, numberId);
  if (!number) throw new NotFoundError('Número não encontrado.');
  if (!number.external_account_id) throw new BadRequestError('Número não possui instância EvolutionAPI.');
  const chats = await evolutionApi.fetchChats(number.external_account_id);
  return Array.isArray(chats) ? chats.map(mapChat) : [];
}

export function parseEvolutionMessage(msg) {
  const base = mapMessage(msg);
  const inlineReactions = Array.isArray(msg.message?.reactions)
    ? msg.message.reactions.map((r) => ({
        emoji: r.reaction ?? r.text ?? '',
        author: r.senderId ?? null,
        at: r.timestamp ? Number(r.timestamp) * 1000 : null,
      }))
    : [];
  return { ...base, reactions: inlineReactions, fetchedFrom: 'evolution' };
}

export function isReactionMessage(msg) {
  return Boolean(
    msg?.message?.reactionMessage
    || msg?.messageType === 'reaction'
    || msg?.message?.reactions,
  );
}

export function aggregateReactions(messages) {
  const byId = new Map();
  const kept = [];
  for (const m of messages) {
    if (m.message?.reactionMessage?.key?.id) {
      const targetId = m.message.reactionMessage.key.id;
      const reactions = byId.get(targetId) ?? [];
      reactions.push({
        emoji: m.message.reactionMessage.text ?? '',
        author: m.message.reactionMessage.key?.participant ?? m.message.reactionMessage.key?.remoteJid ?? null,
        at: m.messageTimestamp ? Number(m.messageTimestamp) * 1000 : null,
      });
      byId.set(targetId, reactions);
      continue;
    }
    kept.push(m);
  }
  return { messages: kept, reactionsByTarget: byId };
}

export function mergeChatMessages(evolution, database) {
  const seen = new Set();
  const merged = [];
  for (const m of [...evolution, ...database]) {
    const key = m.id ?? `${m.remoteJid}-${m.messageTimestamp}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(m);
  }
  return merged.sort((a, b) => (a.messageTimestamp ?? 0) - (b.messageTimestamp ?? 0));
}

export async function listChatMessages(companyId, numberId, chatId, limit) {
  const number = await whatsappRepo.findNumberById(companyId, numberId);
  if (!number) throw new NotFoundError('Número não encontrado.');
  if (!number.external_account_id) throw new BadRequestError('Número não possui instância EvolutionAPI.');

  const max = Math.min(Math.max(limit || 100, 1), 200);

  let evolutionRaw = [];
  try {
    const fetched = await evolutionApi.fetchChatMessages(number.external_account_id, chatId, max);
    evolutionRaw = Array.isArray(fetched) ? fetched : [];
  } catch {
    evolutionRaw = [];
  }

  const { messages, reactionsByTarget } = aggregateReactions(evolutionRaw);
  const evolution = messages.map(parseEvolutionMessage).map((m) => ({
    ...m,
    remoteJid: m.remoteJid || chatId,
    reactions: reactionsByTarget.get(m.id) ?? [],
  }));

  for (const m of evolution) {
    if (!m.id) continue;
    try {
      await whatsappRepo.upsertMessage(companyId, numberId, {
        external_message_id: m.id,
        remote_jid: chatId,
        direction: m.fromMe ? 'outbound' : 'inbound',
        message_type: m.messageType ?? 'text',
        content: m.content ?? null,
        status: m.status ?? 'received',
        reactions: m.reactions.length > 0 ? m.reactions : undefined,
        sent_at: m.messageTimestamp ? new Date(m.messageTimestamp) : new Date(),
      });
    } catch {
      // best-effort cache; não impede o retorno
    }
  }

  if (evolution.length === 0) {
    const dbMessages = await whatsappRepo.listMessages(companyId, numberId, { remoteJid: chatId, limit: max });
    return dbMessages.map(mapDbMessage);
  }

  const dbMessages = await whatsappRepo.listMessages(companyId, numberId, { remoteJid: chatId, limit: max })
    .catch(() => []);
  return mergeChatMessages(evolution, dbMessages.map(mapDbMessage));
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
  if (data.action) return evolutionApi.updateGroupSetting(number.external_account_id, groupId, data.action);
  return { updated: false, message: 'Nenhuma alteração informada.' };
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

/* ===== Media proxy ===== */

async function sendMediaToTarget(number, to, media, caption, fileName) {
  if (!media?.url) return null;
  const base64 = await evolutionApi.downloadMedia(number.external_account_id, media.url);
  switch (media.type) {
    case 'document':
      return evolutionApi.sendDocument(number.external_account_id, to, base64, caption, fileName, 800);
    case 'audio':
      return evolutionApi.sendWhatsAppAudio(number.external_account_id, to, base64, 800);
    case 'video':
      return evolutionApi.sendVideo(number.external_account_id, to, base64, caption, 800);
    case 'sticker':
      return evolutionApi.sendSticker(number.external_account_id, to, base64, 800);
    case 'image':
    default:
      return evolutionApi.sendMedia(number.external_account_id, to, 'image', base64, caption, 800);
  }
}

export async function resolveForwardTarget(companyId, number, linkedGroup) {
  const rule = linkedGroup.forward_rule ?? {};
  const mode = rule.mode ?? 'fixed';
  const clean = (p) => (p ? String(p).replace(/\D/g, '') : null);
  if (mode === 'fixed') return clean(rule.phone);
  if (mode === 'operator') {
    const membership = rule.attendantId ? await whatsappRepo.findMembershipByUser(companyId, rule.attendantId) : null;
    return clean(membership?.user?.phone);
  }
  if (mode === 'group') {
    const attendants = await whatsappRepo.listAttendants(companyId, [rule.attendantRole || 'operator']);
    const target = attendants.find((a) => a.user?.phone);
    return clean(target?.user?.phone);
  }
  if (mode === 'round_robin') {
    const roles = rule.roles && rule.roles.length > 0 ? rule.roles : ['operator'];
    const attendants = await whatsappRepo.listAttendants(companyId, roles);
    const withPhone = attendants.filter((a) => a.user?.phone);
    if (withPhone.length === 0) return null;
    const index = await chatbotCache.nextRoundRobin(companyId, linkedGroup.id, withPhone.length);
    return clean(withPhone[index]?.user?.phone);
  }
  return null;
}

async function forwardGroupMessage(number, linkedGroup, { senderJid, senderName, text, media }) {
  const target = await resolveForwardTarget(number.company_id, number, linkedGroup);
  if (!target) return null;

  const rawText = text && text !== '(mídia)' ? text : (media ? `📎 ${media.type}` : '(mídia)');
  const message = (linkedGroup.forward_prefix || '📢 [{grupo}] {nome}: {mensagem}')
    .replace(/{grupo}/g, linkedGroup.subject || linkedGroup.remote_jid)
    .replace(/{nome}/g, senderName || senderJid)
    .replace(/{mensagem}/g, rawText);

  try {
    let result = null;
    if (media && linkedGroup.forward_media !== false) {
      result = await sendMediaToTarget(number, target, media, media.caption ?? null, media.fileName ?? null);
      if (text && text !== '(mídia)') {
        result = await evolutionApi.sendText(number.external_account_id, target, message, 400).catch(() => result);
      }
    } else {
      result = await evolutionApi.sendText(number.external_account_id, target, message, 500);
    }
    await whatsappRepo.createMessageLog({
      company_id: number.company_id,
      whatsapp_number_id: number.id,
      event: media ? 'media_forward' : 'group_forward',
      direction: 'forward',
      message_type: media ? media.type : 'text',
      content: message,
      media_url: media?.url ?? null,
      recipient: target,
      remote_jid: linkedGroup.remote_jid,
      status: 'sent',
    });
    return result;
  } catch (error) {
    await whatsappRepo.createMessageLog({
      company_id: number.company_id,
      whatsapp_number_id: number.id,
      event: media ? 'media_forward' : 'group_forward',
      direction: 'forward',
      message_type: media ? media.type : 'text',
      content: message,
      media_url: media?.url ?? null,
      recipient: target,
      remote_jid: linkedGroup.remote_jid,
      status: 'failed',
      error: error.message,
    });
    return null;
  }
}

/* ===== Linked groups ===== */

export async function listLinkedGroups(companyId, numberId) {
  await requireNumber(companyId, numberId);
  return whatsappRepo.listLinkedGroups(companyId, numberId);
}

export async function linkGroup(companyId, numberId, data) {
  const number = await requireNumber(companyId, numberId);
  const existing = await whatsappRepo.findLinkedGroupByRemoteJid(number.id, data.remoteJid);
  if (existing) throw new ConflictError('Grupo já vinculado a este número.');
  return whatsappRepo.createLinkedGroup({
    company_id: companyId,
    whatsapp_number_id: number.id,
    remote_jid: data.remoteJid,
    subject: data.subject ?? null,
    description: data.description ?? null,
    is_active: data.isActive ?? true,
    flow_id: data.flowId ?? null,
    forward_rule: data.forwardRule ?? null,
    forward_media: data.forwardMedia ?? true,
    forward_prefix: data.forwardPrefix ?? null,
  });
}

export async function updateLinkedGroup(companyId, numberId, groupId, data) {
  await requireNumber(companyId, numberId);
  const existing = await whatsappRepo.findLinkedGroupById(companyId, groupId);
  if (!existing) throw new NotFoundError('Grupo vinculado não encontrado.');

  const patch = {};
  if (data.remoteJid !== undefined) patch.remote_jid = data.remoteJid;
  if (data.subject !== undefined) patch.subject = data.subject;
  if (data.description !== undefined) patch.description = data.description;
  if (data.isActive !== undefined) patch.is_active = data.isActive;
  if (data.flowId !== undefined) patch.flow_id = data.flowId;
  if (data.forwardRule !== undefined) patch.forward_rule = data.forwardRule;
  if (data.forwardMedia !== undefined) patch.forward_media = data.forwardMedia;
  if (data.forwardPrefix !== undefined) patch.forward_prefix = data.forwardPrefix;

  await whatsappRepo.updateLinkedGroup(companyId, groupId, patch);
  return whatsappRepo.listLinkedGroups(companyId, numberId).then((list) => list.find((g) => g.id === groupId) ?? null);
}

export async function unlinkGroup(companyId, numberId, groupId) {
  await requireNumber(companyId, numberId);
  const existing = await whatsappRepo.findLinkedGroupById(companyId, groupId);
  if (!existing) throw new NotFoundError('Grupo vinculado não encontrado.');
  await whatsappRepo.deleteLinkedGroup(companyId, groupId);
  return { deleted: true };
}

export async function syncLinkedGroups(companyId, numberId, data) {
  const number = await requireNumber(companyId, numberId);
  const groups = Array.isArray(data?.groups) && data.groups.length > 0
    ? data.groups
    : await evolutionApi.fetchAllGroups(number.external_account_id).catch(() => []);
  const synced = [];
  for (const g of groups) {
    const remoteJid = g.id ?? g.remoteJid ?? g.jid ?? g.groupJid;
    if (!remoteJid) continue;
    const subject = g.name ?? g.subject ?? g.pushName ?? null;
    const existing = await whatsappRepo.findLinkedGroupByRemoteJid(number.id, remoteJid);
    if (existing) {
      if (subject && !existing.subject) await whatsappRepo.updateLinkedGroup(companyId, existing.id, { subject });
      synced.push(existing);
    } else {
      const created = await whatsappRepo.createLinkedGroup({
        company_id: companyId,
        whatsapp_number_id: number.id,
        remote_jid: remoteJid,
        subject,
        is_active: true,
        forward_media: true,
      });
      synced.push(created);
    }
  }
  return { synced: synced.length, groups: synced };
}

export async function listMessageLogs(companyId, numberId, query) {
  await requireNumber(companyId, numberId);
  return whatsappRepo.listMessageLogs(companyId, query);
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
  const result = await evolutionApi.sendPoll(number.external_account_id, data.number, data.name, data.values);
  await recordOutboundMessage(number, data.number, data.name, 'poll', result?.key?.id ?? null);
  return result;
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
  const result = await evolutionApi.sendContactVcard(number.external_account_id, data.number, data.name, data.phone);
  await recordOutboundMessage(number, data.number, data.name, 'contact', result?.key?.id ?? null);
  return result;
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

export async function updateProfileStatus(companyId, numberId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.updateProfileStatus(number.external_account_id, data.status);
}

/* ===== Bot config & catalog ===== */

export async function getBotConfig(companyId, numberId) {
  await requireNumber(companyId, numberId);
  const config = await whatsappRepo.getBotConfig(companyId);
  const defaults = { mode: 'public', greeting: null };
  return { ...defaults, ...(config ?? {}) };
}

export async function updateBotConfig(companyId, numberId, data) {
  await requireNumber(companyId, numberId);
  const current = (await whatsappRepo.getBotConfig(companyId)) ?? {};
  const next = { ...current, ...data };
  await whatsappRepo.updateBotConfig(companyId, next);
  return { ...next };
}

export async function getCatalog(companyId, numberId, limit) {
  await requireNumber(companyId, numberId);
  const products = await whatsappRepo.listActiveProducts(companyId, limit);
  return products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    price: Number(p.price),
    stock: p.stock,
    image_url: p.image_url,
  }));
}

/* ===== Bot contact validation ===== */

async function isContactAllowed(companyId, phone) {
  const customer = await whatsappRepo.findCustomerByPhone(companyId, phone);
  return !!customer;
}

async function isContactSaved(companyId, numberId, phone) {
  const contact = await whatsappRepo.findContactByPhone(companyId, numberId, phone);
  return !!contact;
}

export async function shouldBotRespond(companyId, numberId, phone, config = null) {
  const cfg = config ?? (await whatsappRepo.getBotConfig(companyId)) ?? {};
  const mode = cfg.mode ?? 'public';
  if (mode === 'public') return { allowed: true, reason: 'public' };
  if (mode === 'customers_only') {
    const allowed = await isContactAllowed(companyId, phone);
    return { allowed, reason: allowed ? 'customer' : 'not_customer' };
  }
  if (mode === 'private') {
    const isCustomer = await isContactAllowed(companyId, phone);
    const isSaved = await isContactSaved(companyId, numberId, phone);
    const allowed = isCustomer || isSaved;
    return { allowed, reason: allowed ? (isCustomer ? 'customer' : 'saved_contact') : 'not_known' };
  }
  return { allowed: true, reason: 'public' };
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

  if (event === 'MESSAGES_REVOKED' && data.key?.id) {
    await whatsappRepo.updateMessageStatusByExternalId(data.key.id, 'revoked').catch(() => null);
    logger.info({ numberId: number.id, messageId: data.key.id }, 'mensagem revogada marcada como revoked');
    return;
  }

  if (event === 'INSTANCE_ERROR' && data?.error) {
    logger.error({ numberId: number.id, error: data.error }, 'erro de instância EvolutionAPI');
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
    const remoteJid = data.key.remoteJid || '';

    if (remoteJid.endsWith('@g.us')) {
      await handleGroupMessage({ number, data }).catch(() => null);
      return;
    }

    const phoneNumber = String(remoteJid).replace('@c.us', '').replace('@s.whatsapp.net', '');
    const externalId = data.key.id;
    const messageContent = extractMessageText(data.message) || '';
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
      remote_jid: remoteJid,
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

    if (!number.is_bot_enabled && messageContent) {
      logger.info({ companyId: number.company_id, from: phoneNumber }, 'bot desabilitado — mensagem ignorada');
    }

    if (number.is_bot_enabled && messageContent) {
      const { processIncomingMessage } = await import('../../automation/services/automationService.js');
      const { notifyAttendants } = await import('../../notifications/services/notificationService.js');
      const { handleOrderEvent } = await import('../../notifications/services/orderNotificationService.js');
      const check = await shouldBotRespond(number.company_id, number.id, phoneNumber);
      if (check.allowed) {
        try {
          const result = await processIncomingMessage({ companyId: number.company_id, number, from: phoneNumber, text: messageContent, contact });
          if (result) {
            logger.info({ companyId: number.company_id, from: phoneNumber, text: messageContent, flowId: result.flowId, stepId: result.stepId }, 'bot respondeu');
          } else {
            logger.warn({ companyId: number.company_id, from: phoneNumber, text: messageContent }, 'bot nao respondeu — processIncomingMessage retornou null (sem fluxo ativo ou sem steps)');
          }
        } catch (err) {
          logger.error({ companyId: number.company_id, from: phoneNumber, text: messageContent, err: err.message }, 'bot falhou ao processar mensagem');
        }
      } else {
        logger.info({ companyId: number.company_id, from: phoneNumber, reason: check.reason, mode: (await whatsappRepo.getBotConfig(number.company_id).catch(() => ({})))?.mode ?? 'unknown' }, 'bot: contato nao permitido pelo modo de atendimento');
        const config = (await whatsappRepo.getBotConfig(number.company_id)) ?? {};
        const conv = await conversationRepo.findConversationByContact(number.company_id, 'whatsapp', phoneNumber);
        if (conv) {
          await conversationRepo.updateConversation(conv.id, { status: 'waiting' }).catch(() => null);
        }
        await notifyAttendants({
          companyId: number.company_id,
          title: 'Novo contato desconhecido',
          message: `${data.pushName || phoneNumber} enviou: "${messageContent}"`,
          type: 'message',
          relatedEntityType: 'conversation',
          relatedEntityId: conv?.id ?? null,
        }).catch(() => null);
        if (config.forwardTo) {
          const forwardMsg = (config.forwardMessage || '📩 Novo contato: {nome} ({phone}) — {mensagem}')
            .replace(/{nome}/g, data.pushName || phoneNumber)
            .replace(/{phone}/g, phoneNumber)
            .replace(/{mensagem}/g, messageContent);
          await evolutionApi.sendText(number.external_account_id, config.forwardTo.replace(/\D/g, ''), forwardMsg, 500).catch(() => null);
        }
      }
    }
  }
}

async function handleGroupMessage({ number, data }) {
  const remoteJid = data.key.remoteJid;
  const externalId = data.key.id;
  const participant = data.key.participant || data.remoteJid || '';
  const senderJid = String(participant).replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');
  const messageType = data.messageType === 'conversation' ? 'text' : data.messageType;
  const media = extractMedia(data.message);
  const text = extractMessageText(data.message);

  const existing = await whatsappRepo.findMessageByExternalId(number.id, externalId);
  if (existing) return;

  const linkedGroup = await whatsappRepo.findLinkedGroupByRemoteJid(number.id, remoteJid);
  if (!linkedGroup || !linkedGroup.is_active) return;

  const senderName = data.pushName || senderJid;

  await whatsappRepo.createMessage({
    company_id: number.company_id,
    whatsapp_number_id: number.id,
    external_message_id: externalId,
    remote_jid: remoteJid,
    direction: 'inbound',
    message_type: messageType,
    content: text && text !== '(mídia)' ? text : (media ? media.type : '') || null,
    status: 'received',
    sent_at: new Date((data.messageTimestamp || 0) * 1000),
  });

  const hasForwardRule = linkedGroup.forward_rule && Object.keys(linkedGroup.forward_rule).length > 0;
  if (hasForwardRule) {
    await forwardGroupMessage(number, linkedGroup, { senderJid, senderName, text, media }).catch(() => null);
  }

  if (linkedGroup.flow_id && number.is_bot_enabled && text) {
    const { processIncomingMessage } = await import('../../automation/services/automationService.js');
    await processIncomingMessage({
      companyId: number.company_id,
      number,
      from: senderJid,
      text,
      group: { remoteJid, participant: senderJid, senderName },
    }).catch(() => null);
  }
}

/* ===== Capabilities EvolutionAPI (novos endpoints) ===== */

export async function blockContact(companyId, numberId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.updateBlockStatus(number.external_account_id, String(data.number).replace(/\D/g, ''), data.action);
}

export async function requestPairingCode(companyId, numberId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.requestPairing(number.external_account_id, String(data.phone).replace(/\D/g, ''));
}

export async function listGroupParticipants(companyId, numberId, groupId) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.groupParticipants(number.external_account_id, groupId);
}

export async function sendTemplateMessage(companyId, numberId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.sendTemplate(number.external_account_id, String(data.number).replace(/\D/g, ''), data.template);
}

export async function sendPtvMessage(companyId, numberId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.sendPtv(number.external_account_id, String(data.number).replace(/\D/g, ''), data.videoUrl, data.caption ?? null, 800);
}

export async function toggleEphemeralMessage(companyId, numberId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.toggleEphemeral(number.external_account_id, data.groupJid, data.expiration);
}

export async function sendBulkMessages(companyId, numberId, data) {
  const number = await requireNumber(companyId, numberId);
  const messages = (data.messages ?? []).map((m) => ({
    number: String(m.number).replace(/\D/g, ''),
    text: m.text,
    delay: m.delay ?? 1000,
  }));
  const results = [];
  for (const m of messages) {
    await evolutionApi.sendText(number.external_account_id, m.number, m.text, m.delay).catch((e) => results.push({ number: m.number, ok: false, error: e.message }));
    results.push({ number: m.number, ok: true });
  }
  return { sent: results.length, results };
}

export async function sendBase64Message(companyId, numberId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.sendBase64(number.external_account_id, String(data.number).replace(/\D/g, ''), data.mediaType, data.base64, data.fileName ?? null);
}

export async function groupInviteInfo(companyId, numberId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.groupInviteInfo(number.external_account_id, data.inviteCode);
}

export async function sendGroupInvite(companyId, numberId, data) {
  const number = await requireNumber(companyId, numberId);
  const numbers = (data.numbers ?? []).map((n) => String(n).replace(/\D/g, ''));
  return evolutionApi.sendGroupInvite(number.external_account_id, data.groupJid, numbers, data.description ?? null);
}

export async function findContacts(companyId, numberId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.findContacts(number.external_account_id, data.where ?? {});
}

export async function removeProfilePicture(companyId, numberId) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.removeProfilePicture(number.external_account_id);
}

export async function fetchBusinessProfile(companyId, numberId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.fetchBusinessProfile(number.external_account_id, String(data.number).replace(/\D/g, ''));
}

export async function changeNumber(companyId, numberId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.changeNumber(number.external_account_id, String(data.number).replace(/\D/g, ''));
}

export async function sendLinkPreview(companyId, numberId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.sendLinkPreview(number.external_account_id, { ...data, number: String(data.number).replace(/\D/g, '') });
}

export async function typewriterEffect(companyId, numberId, data) {
  const number = await requireNumber(companyId, numberId);
  return evolutionApi.typewriter(number.external_account_id, { ...data, number: String(data.number).replace(/\D/g, '') });
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
  parseEvolutionMessage,
  isReactionMessage,
  aggregateReactions,
  mergeChatMessages,
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
  extractMedia,
  listLinkedGroups,
  linkGroup,
  updateLinkedGroup,
  unlinkGroup,
  syncLinkedGroups,
  listMessageLogs,
  resolveForwardTarget,
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
  updateProfileStatus,
  getBotConfig,
  updateBotConfig,
  getCatalog,
  shouldBotRespond,
  handleWebhook,
  blockContact,
  requestPairingCode,
  listGroupParticipants,
  sendTemplateMessage,
  sendPtvMessage,
  toggleEphemeralMessage,
  sendBulkMessages,
  sendBase64Message,
  groupInviteInfo,
  sendGroupInvite,
  findContacts,
  removeProfilePicture,
  fetchBusinessProfile,
  changeNumber,
  sendLinkPreview,
  typewriterEffect,
};