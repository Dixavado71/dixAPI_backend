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
  sendMessage,
  sendMedia,
  handleWebhook,
};