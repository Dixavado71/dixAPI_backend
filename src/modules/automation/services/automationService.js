import { NotFoundError, ConflictError, BadRequestError } from '../../../shared/errors/AppError.js';
import * as automationRepo from '../repositories/automationRepository.js';
import * as whatsappRepo from '../../whatsapp/repositories/whatsappRepository.js';
import * as conversationRepo from '../../conversations/repositories/conversationRepository.js';
import * as evolutionApi from '../../../infrastructure/whatsapp/evolutionApiClient.js';

export async function listFlows(companyId, filters) {
  return automationRepo.listFlows(companyId, filters);
}

export async function getFlowById(companyId, id) {
  const flow = await automationRepo.findFlowById(companyId, id);
  if (!flow) throw new NotFoundError('Fluxo não encontrado.');
  return flow;
}

export async function createFlow(companyId, data) {
  const config = { steps: data.config.steps, triggers: data.config.triggers ?? [], defaultStep: data.config.defaultStep ?? data.config.steps[0]?.id };
  return automationRepo.createFlow({
    company_id: companyId,
    name: data.name,
    type: data.type,
    description: data.description ?? null,
    icon_emoji: data.iconEmoji ?? null,
    is_active: data.isActive ?? true,
    config_json: config,
  });
}

export async function updateFlow(companyId, id, data) {
  const existing = await automationRepo.findFlowById(companyId, id);
  if (!existing) throw new NotFoundError('Fluxo não encontrado.');

  const patch = {};
  if (data.name) patch.name = data.name;
  if (data.type) patch.type = data.type;
  if (data.description !== undefined) patch.description = data.description;
  if (data.iconEmoji !== undefined) patch.icon_emoji = data.iconEmoji;
  if (data.isActive !== undefined) patch.is_active = data.isActive;
  if (data.config) {
    patch.config_json = {
      steps: data.config.steps ?? existing.config_json?.steps ?? [],
      triggers: data.config.triggers ?? existing.config_json?.triggers ?? [],
      defaultStep: data.config.defaultStep ?? existing.config_json?.defaultStep ?? existing.config_json?.steps?.[0]?.id,
    };
  }

  await automationRepo.updateFlow(companyId, id, patch);
  return automationRepo.findUpdatedFlow(companyId, id);
}

export async function deleteFlow(companyId, id) {
  const existing = await automationRepo.findFlowById(companyId, id);
  if (!existing) throw new NotFoundError('Fluxo não encontrado.');
  await automationRepo.deleteFlow(companyId, id);
  return { deleted: true };
}

export async function toggleFlow(companyId, id) {
  const existing = await automationRepo.findFlowById(companyId, id);
  if (!existing) throw new NotFoundError('Fluxo não encontrado.');
  await automationRepo.updateFlow(companyId, id, { is_active: !existing.is_active });
  return { isActive: !existing.is_active };
}

/* ===== Quick replies ===== */

export async function listQuickReplies(companyId) {
  return automationRepo.listQuickReplies(companyId);
}

export async function createQuickReply(companyId, userId, data) {
  const duplicates = await automationRepo.listQuickReplies(companyId);
  if (duplicates.some((q) => q.shortcut.toLowerCase() === data.shortcut.toLowerCase())) {
    throw new ConflictError('Atalho já cadastrado.');
  }
  return automationRepo.createQuickReply({
    company_id: companyId,
    shortcut: data.shortcut,
    message_text: data.messageText,
    created_by: userId,
  });
}

export async function updateQuickReply(companyId, id, data) {
  const existing = await automationRepo.findQuickReplyById(companyId, id);
  if (!existing) throw new NotFoundError('Atalho não encontrado.');
  const patch = {};
  if (data.shortcut) patch.shortcut = data.shortcut;
  if (data.messageText) patch.message_text = data.messageText;
  await automationRepo.updateQuickReply(companyId, id, patch);
  return automationRepo.listQuickReplies(companyId).then((list) => list.find((q) => q.id === id));
}

export async function deleteQuickReply(companyId, id) {
  const existing = await automationRepo.findQuickReplyById(companyId, id);
  if (!existing) throw new NotFoundError('Atalho não encontrado.');
  await automationRepo.deleteQuickReply(companyId, id);
  return { deleted: true };
}

export async function useQuickReply(companyId, id) {
  const existing = await automationRepo.findQuickReplyById(companyId, id);
  if (!existing) throw new NotFoundError('Atalho não encontrado.');
  await automationRepo.incrementQuickReplyUsage(id);
  return { shortcut: existing.shortcut, messageText: existing.message_text };
}

/* ===== Flow execution engine ===== */

function normalizePhone(phone) {
  return String(phone).replace('@c.us', '').replace('@s.whatsapp.net', '');
}

function extractMessageText(data) {
  if (data.message?.conversation) return data.message.conversation;
  if (data.message?.extendedTextMessage?.text) return data.message.extendedTextMessage.text;
  if (data.message?.imageMessage?.caption) return data.message.imageMessage.caption;
  return '';
}

async function sendFlowMessage(number, to, text) {
  if (!text) return;
  await evolutionApi.sendText(number.external_account_id, normalizePhone(to), text, 800).catch(() => null);
  await createConversationRecord({ companyId: number.company_id, number, from: to, text, sender: 'bot', messageType: 'text' }).catch(() => null);
}

async function updateContactFlowState(contactId, state) {
  await whatsappRepo.updateContactMetadata(contactId, state);
}

async function createConversationRecord({ companyId, number, from, text, sender, messageType }) {
  const channel = 'whatsapp';
  let conversation = await conversationRepo.findConversationByContact(companyId, channel, from);
  if (!conversation) {
    conversation = await conversationRepo.createConversation({
      company_id: companyId,
      channel,
      contact_name: from,
      contact_phone: from,
      last_message: text,
      last_message_at: new Date(),
      unread_count: sender === 'customer' ? 1 : 0,
      status: sender === 'customer' ? 'open' : 'waiting',
    });
  } else {
    conversation = await conversationRepo.updateConversationLastMessage(conversation.id, text, 0);
  }
  await conversationRepo.createMessage({
    conversation_id: conversation.id,
    sender_type: sender,
    message_type: messageType || 'text',
    content: text || '',
    status: 'delivered',
    sent_at: new Date(),
  });
}

export function normalize(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function matchStepForText(steps, text) {
  const normalized = normalize(text);
  for (const step of steps) {
    if (step.type !== 'question' || !step.options) continue;
    const match = step.options.find((o) => normalize(o.label) === normalized || normalize(o.value) === normalized);
    if (match) return { step, option: match };
  }
  return null;
}

export async function processIncomingMessage({ companyId, number, from, text, contact }) {
  if (!number.is_bot_enabled) return null;

  const flow = await automationRepo.findActiveFlowByType(companyId, 'vendas')
    ?? await automationRepo.findActiveFlowByType(companyId, 'suporte')
    ?? await automationRepo.findActiveFlowByType(companyId, 'marketing');
  if (!flow) return null;

  const config = flow.config_json ?? {};
  const steps = Array.isArray(config.steps) ? config.steps : [];
  if (steps.length === 0) return null;

  const normalizedText = normalize(text);
  const triggers = Array.isArray(config.triggers) ? [...config.triggers].sort((a, b) => normalize(b.keyword).length - normalize(a.keyword).length) : [];
  const currentState = contact?.metadata ?? {};
  const currentStepId = currentState?.flowStep;

  let nextStep = null;

  // 1) Gatilhos têm prioridade
  const matchedTrigger = triggers.find((t) => normalizedText.includes(normalize(t.keyword)));
  if (matchedTrigger) {
    nextStep = steps.find((s) => s.id === matchedTrigger.step) ?? null;
  }

  // 2) Se não houve gatilho, resolve o passo atual
  if (!nextStep && currentStepId) {
    const currentStep = steps.find((s) => s.id === currentStepId);
    if (currentStep?.type === 'question' && currentStep.options) {
      const matched = currentStep.options.find(
        (o) => normalize(o.label) === normalizedText || normalize(o.value) === normalizedText,
      );
      if (matched) {
        nextStep = steps.find((s) => s.id === matched.next) ?? null;
      } else {
        nextStep = currentStep;
        await sendFlowMessage(number, from, 'Desculpe, não entendi. Escolha uma das opções abaixo:');
      }
    } else if (currentStep?.type === 'message') {
      nextStep = steps.find((s) => s.id === currentStep.next) ?? null;
    }
  }

  // 3) Fallback para o passo padrão
  if (!nextStep) {
    nextStep = steps.find((s) => s.id === config.defaultStep) ?? steps[0];
  }

  if (!nextStep) return null;

  await automationRepo.incrementMessagesCount(flow.id);

  if (nextStep.type === 'message') {
    await sendFlowMessage(number, from, nextStep.content);
    await updateContactFlowState(contact.id, { flowId: flow.id, flowStep: nextStep.next ?? null });
  } else if (nextStep.type === 'question') {
    const optionsText = nextStep.options.map((o) => `*${o.label}*`).join('\n');
    await sendFlowMessage(number, from, `${nextStep.content ?? ''}\n\n${optionsText}`);
    await updateContactFlowState(contact.id, { flowId: flow.id, flowStep: nextStep.id });
  } else if (nextStep.type === 'action' && nextStep.action === 'transfer_to_human') {
    await sendFlowMessage(number, from, 'Um atendente vai te responder em instantes. Por favor, aguarde.');
    await updateContactFlowState(contact.id, { flowId: null, flowStep: null, transferredToHuman: true, transferredAt: new Date().toISOString() });
  }

  return { flowId: flow.id, stepId: nextStep.id };
}

export default {
  listFlows,
  getFlowById,
  createFlow,
  updateFlow,
  deleteFlow,
  toggleFlow,
  listQuickReplies,
  createQuickReply,
  updateQuickReply,
  deleteQuickReply,
  useQuickReply,
  processIncomingMessage,
  extractMessageText,
  normalizePhone,
};