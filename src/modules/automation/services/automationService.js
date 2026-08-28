import { NotFoundError, ConflictError, BadRequestError } from '../../../shared/errors/AppError.js';
import { lookup } from 'node:dns/promises';
import * as automationRepo from '../repositories/automationRepository.js';
import * as whatsappRepo from '../../whatsapp/repositories/whatsappRepository.js';
import * as conversationRepo from '../../conversations/repositories/conversationRepository.js';
import * as evolutionApi from '../../../infrastructure/whatsapp/evolutionApiClient.js';
import chatbotCache from '../../../infrastructure/cache/chatbotCache.js';
import { fillTemplate } from './templateEngine.js';
import { evaluateExpression } from './expressionEvaluator.js';
import { extractMessageText as extractMessageTextFromShared } from '../../../shared/whatsapp/extraction.js';
import { logger } from '../../../config/logger.js';

export async function listFlows(companyId, filters) {
  return automationRepo.listFlows(companyId, filters);
}

export function validateFlowConfig(config) {
  const steps = Array.isArray(config?.steps) ? config.steps : [];
  if (steps.length === 0) throw new BadRequestError('O fluxo deve ter pelo menos 1 passo.');
  const ids = new Set(steps.map((s) => s.id).filter(Boolean));
  const dangling = [];

  for (const step of steps) {
    if (step.next && !ids.has(step.next)) dangling.push(`step '${step.id}'.next -> '${step.next}'`);
    if (step.next_false && !ids.has(step.next_false)) dangling.push(`step '${step.id}'.next_false -> '${step.next_false}'`);
    if (step.else && !ids.has(step.else)) dangling.push(`step '${step.id}'.else -> '${step.else}'`);
    if (Array.isArray(step.options)) {
      for (const opt of step.options) {
        if (opt.next && !ids.has(opt.next)) dangling.push(`step '${step.id}'.option '${opt.label}' -> '${opt.next}'`);
      }
    }
  }

  if (config.defaultStep && !ids.has(config.defaultStep)) {
    dangling.push(`defaultStep -> '${config.defaultStep}'`);
  }
  if (Array.isArray(config.triggers)) {
    for (const t of config.triggers) {
      if (t.step && !ids.has(t.step)) dangling.push(`trigger '${t.keyword}' -> '${t.step}'`);
    }
  }
  if (dangling.length > 0) {
    throw new BadRequestError(`Fluxo inválido: referências a passos inexistentes (${dangling.join(', ')}).`);
  }
  return true;
}

export async function getFlowById(companyId, id) {
  const flow = await automationRepo.findFlowById(companyId, id);
  if (!flow) throw new NotFoundError('Fluxo não encontrado.');
  return flow;
}

export async function createFlow(companyId, data) {
  const config = { steps: data.config.steps, triggers: data.config.triggers ?? [], defaultStep: data.config.defaultStep ?? data.config.steps[0]?.id };
  validateFlowConfig(config);
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
    const config = {
      steps: data.config.steps ?? existing.config_json?.steps ?? [],
      triggers: data.config.triggers ?? existing.config_json?.triggers ?? [],
      defaultStep: data.config.defaultStep ?? existing.config_json?.defaultStep ?? existing.config_json?.steps?.[0]?.id,
    };
    validateFlowConfig(config);
    patch.config_json = config;
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

export async function duplicateFlow(companyId, id) {
  const existing = await automationRepo.findFlowById(companyId, id);
  if (!existing) throw new NotFoundError('Fluxo não encontrado.');
  return automationRepo.createFlow({
    company_id: companyId,
    name: `${existing.name} (cópia)`,
    type: existing.type,
    description: existing.description,
    icon_emoji: existing.icon_emoji,
    is_active: false,
    config_json: existing.config_json,
  });
}

export async function testFlow(companyId, id, data) {
  const existing = await automationRepo.findFlowById(companyId, id);
  if (!existing) throw new NotFoundError('Fluxo não encontrado.');
  const steps = existing.config_json?.steps ?? [];
  if (steps.length === 0) return { steps: [], executed: [] };

  const state = { vars: data?.vars ?? {}, flowId: existing.id };
  const executed = [];
  let stepId = data?.stepId ?? existing.config_json?.defaultStep ?? steps[0]?.id;
  const guard = new Set();
  let hops = 0;

  while (stepId && hops < 30) {
    if (guard.has(stepId)) break;
    guard.add(stepId);
    hops += 1;
    const step = steps.find((s) => s.id === stepId);
    if (!step) break;
    executed.push({ id: step.id, type: step.type, content: fillTemplate(step.content ?? '', state.vars) });
    const result = await executeStepLocal({ step, state, vars: state.vars, simulated: true });
    if (result.vars) state.vars = result.vars;
    if (result.clear) break;
    stepId = result.nextStep ?? null;
  }

  return { steps, executed };
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
  return String(phone).replace('@c.us', '').replace('@s.whatsapp.net', '').replace('@lid', '');
}

export function extractMessageText(data) {
  return extractMessageTextFromShared(data?.message ?? data);
}

export function normalize(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

async function sendFlowMessage(number, to, text) {
  if (!text) return;
  await evolutionApi.sendText(number.external_account_id, normalizePhone(to), text, 800).catch(() => null);
  await createConversationRecord({ companyId: number.company_id, number, from: to, text, sender: 'bot', messageType: 'text' }).catch(() => null);
}

async function sendFlowMedia(number, to, media) {
  if (!media?.url) return;
  await evolutionApi.sendMedia(number.external_account_id, normalizePhone(to), media.type || 'image', media.url, media.caption ?? null, 800).catch(() => null);
  await createConversationRecord({ companyId: number.company_id, number, from: to, text: media.caption ?? media.type, sender: 'bot', messageType: media.type || 'image' }).catch(() => null);
}

async function updateContactFlowState(companyId, contactId, state) {
  const contact = await whatsappRepo.findContactById(companyId, contactId);
  const merged = { ...(contact?.metadata ?? {}), ...state };
  await whatsappRepo.updateContactMetadata(contactId, merged);
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveFlow(companyId, number, group, text, priority = ['vendas', 'suporte', 'marketing']) {
  if (group?.remoteJid) {
    const linked = await whatsappRepo.findLinkedGroupByRemoteJid(number.id, group.remoteJid);
    if (linked?.flow_id) {
      const bound = await automationRepo.findFlowById(companyId, linked.flow_id);
      if (bound && bound.is_active) return bound;
    }
  }
  for (const type of priority) {
    const flow = await automationRepo.findActiveFlowByType(companyId, type);
    if (flow) return flow;
  }
  return null;
}

function buildFlowContext({ number, from, text, state, flow, group }) {
  const now = new Date();
  return {
    ...(state?.vars ?? {}),
    nome: state?.vars?.nome ?? null,
    telefone: normalizePhone(from),
    mensagem: text || '',
    media: null,
    flow_name: flow?.name ?? '',
    flow_id: flow?.id ?? '',
    step_id: '',
    data: now.toISOString().slice(0, 10),
    hora: now.toTimeString().slice(0, 8),
    grupo: group?.senderName ?? null,
    grupo_jid: group?.remoteJid ?? null,
  };
}

async function executeStepLocal({ step, state, vars, simulated = false, extra = {} }) {
  let nextStep = step.next ?? null;
  const varsOut = { ...(vars ?? {}) };

  if (step.type === 'variable' && step.variable) {
    if (step.mode === 'input' && extra.text !== undefined) {
      varsOut[step.variable] = extra.text;
      nextStep = step.next ?? null;
    } else if (step.mode === 'value') {
      varsOut[step.variable] = step.value ?? '';
      nextStep = step.next ?? null;
    }
  }

  if (step.type === 'condition') {
    const expression = step.expression ?? step.condition?.expression ?? '';
    const passed = evaluateExpression(expression, { ctx: varsOut });
    nextStep = passed ? (step.next ?? null) : (step.next_false ?? step.else ?? null);
  }

  if (step.type === 'question' && step.options && extra.option) {
    if (extra.option.variable) varsOut[extra.option.variable] = extra.option.value;
    nextStep = extra.option.next ?? step.next ?? null;
  }

  if (step.type === 'action') {
    if (step.action === 'end') return { nextStep: null, vars: varsOut, clear: true };
    if (step.action === 'transfer_to_human') return { nextStep: null, vars: varsOut, clear: true };
  }

  if (step.type === 'end') {
    return { nextStep: null, vars: varsOut, clear: true };
  }

  return { nextStep, vars: varsOut, clear: false };
}

async function isAllowedWebhookUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (host === 'localhost' || host === '0.0.0.0' || host === '::1') return false;
    if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localhost')) return false;
    if (host.startsWith('10.') || host.startsWith('127.') || host.startsWith('169.254.')) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    try {
      const records = await lookup(host, { all: true, verbatim: true });
      for (const r of records) {
        const ip = r.address;
        if (r.family === 4) {
          const p = ip.split('.').map(Number);
          if (p[0] === 10 || p[0] === 127 || (p[0] === 169 && p[1] === 254)
            || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168)) return false;
        } else if (ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80')) {
          return false;
        }
      }
    } catch {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function runWebhook({ step, vars, text, from, flow, group, context }) {
  if (!step.url || !(await isAllowedWebhookUrl(step.url))) return { nextStep: step.next ?? null, vars };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(step.url, {
      method: step.method ?? 'POST',
      headers: { 'Content-Type': 'application/json', ...(step.headers ?? {}) },
      body: JSON.stringify({ ...vars, mensagem: text, from, flowId: flow.id, stepId: step.id, group: group ?? null }),
      signal: controller.signal,
    }).catch(() => null);
    const body = response ? await response.json().catch(() => null) : null;
    const value = step.responseVar ? (body?.[step.responseVar] ?? body) : body;
    if (step.responseVar && value !== undefined) vars[step.responseVar] = value;
    return { nextStep: step.next ?? null, vars };
  } catch {
    return { nextStep: step.next ?? null, vars };
  } finally {
    clearTimeout(timeout);
  }
}

async function executeStep({ companyId, number, from, replyTo, text, contact, flow, step, state, group }) {
  const vars = { ...(state?.vars ?? {}) };
  const context = buildFlowContext({ number, from, text, state: { vars }, flow, group });
  let nextStep = step.next ?? null;
  let clear = false;
  const target = replyTo ?? from;

  const content = () => fillTemplate(step.content ?? '', { ...context, ...vars });

  if (step.type === 'variable') {
    if (step.mode === 'input' && text) vars[step.variable] = text;
    if (step.mode === 'value') vars[step.variable] = step.value ?? '';
    if (step.variable) nextStep = step.next ?? null;
    else nextStep = step.next ?? null;
  }

  if (step.type === 'message') {
    await sendFlowMessage(number, target, content());
    nextStep = step.next ?? null;
  }

  if (step.type === 'media') {
    const media = step.media ?? {};
    if (media.url) await sendFlowMedia(number, target, media);
    nextStep = step.next ?? null;
  }

  if (step.type === 'question') {
    const optionsText = (step.options ?? []).map((o) => `*${o.label}*`).join('\n');
    await sendFlowMessage(number, target, `${content()}\n\n${optionsText}`);
    nextStep = step.id;
  }

  if (step.type === 'condition') {
    const expression = step.expression ?? step.condition?.expression ?? '';
    const passed = evaluateExpression(expression, { ctx: vars });
    nextStep = passed ? (step.next ?? null) : (step.next_false ?? step.else ?? null);
  }

  if (step.type === 'delay') {
    const ms = Math.min(Math.max(Number(step.delayMs) || 1000, 0), 60000);
    await sleep(ms);
    nextStep = step.next ?? null;
  }

  if (step.type === 'forward') {
    const target = step.target ? String(step.target).replace(/\D/g, '') : null;
    if (target) {
      const fwdText = fillTemplate(step.content || '{mensagem}', { ...context, ...vars, mensagem: text || '' });
      await evolutionApi.sendText(number.external_account_id, target, fwdText, 500).catch(() => null);
    }
    nextStep = step.next ?? null;
  }

  if (step.type === 'group') {
    const targetJid = step.group?.remoteJid ?? step.targetJid;
    if (targetJid) {
      await evolutionApi.sendText(number.external_account_id, targetJid, content(), 500).catch(() => null);
    }
    nextStep = step.next ?? null;
  }

  if (step.type === 'webhook') {
    const result = await runWebhook({ step, vars, text, from, flow, group, context });
    nextStep = result.nextStep;
  }

  if (step.type === 'action') {
    if (step.action === 'transfer_to_human') {
      await sendFlowMessage(number, target, step.content || 'Um atendente vai te responder em instantes. Por favor, aguarde.');
      clear = true;
      const conv = await conversationRepo.findConversationByContact(companyId, 'whatsapp', from);
      if (conv) await conversationRepo.updateConversation(conv.id, { status: 'waiting' }).catch(() => null);
      const { notifyAttendants } = await import('../../notifications/services/notificationService.js');
      await notifyAttendants({
        companyId,
        title: 'Cliente pediu atendente',
        message: `${from} solicitou atendimento humano: "${text}"`,
        type: 'message',
        relatedEntityType: 'conversation',
        relatedEntityId: conv?.id ?? null,
      }).catch(() => null);
      nextStep = null;
    } else if (step.action === 'alert') {
      const { notifyAttendants } = await import('../../notifications/services/notificationService.js');
      await notifyAttendants({
        companyId,
        title: step.title || 'Alerta do fluxo',
        message: fillTemplate(step.content ?? '', { ...context, ...vars, mensagem: text || '' }),
        type: step.notificationType ?? 'automation',
        relatedEntityType: 'flow',
        relatedEntityId: flow.id,
      }).catch(() => null);
      nextStep = step.next ?? null;
    } else if (step.action === 'webhook') {
      const result = await runWebhook({ step, vars, text, from, flow, group, context });
      nextStep = result.nextStep;
    } else if (step.action === 'end') {
      clear = true;
      nextStep = null;
    } else {
      nextStep = step.next ?? null;
    }
  }

  if (step.type === 'flow') {
    const target = step.targetFlow ?? step.flowId;
    if (target) {
      const targetFlow = await automationRepo.findFlowById(companyId, target).catch(() => null)
        ?? await automationRepo.findActiveFlowByType(companyId, target);
      if (targetFlow) {
        nextStep = targetFlow.config_json?.defaultStep ?? targetFlow.config_json?.steps?.[0]?.id ?? null;
        if (nextStep) {
          const mergedState = { ...state, flowId: targetFlow.id };
          return { nextStep, vars, clear, switchFlow: targetFlow.id };
        }
      }
    }
    nextStep = step.next ?? null;
  }

  if (step.type === 'end') {
    clear = true;
    nextStep = null;
  }

  return { nextStep, vars, clear, switchFlow: null };
}

export async function processIncomingMessage({ companyId, number, from, text, contact, group }) {
  if (!number.is_bot_enabled) return null;

  const resolvedContact = contact ?? await whatsappRepo.findContactByPhone(companyId, number.id, from);
  const cachedState = await chatbotCache.getFlowState(companyId, from);
  const dbState = resolvedContact?.metadata ?? {};
  const currentState = cachedState ?? dbState;
  const currentStepId = currentState?.flowStep;
  const persistedFlowId = currentState?.flowId ?? null;
  const cacheRead = !!cachedState;

  let flow = null;
  if (persistedFlowId) {
    const persistedFlow = await automationRepo.findFlowById(companyId, persistedFlowId).catch(() => null);
    if (persistedFlow?.is_active && Array.isArray(persistedFlow.config_json?.steps) && persistedFlow.config_json.steps.length > 0) {
      flow = persistedFlow;
    }
  }
  if (!flow) {
    const botConfig = (await whatsappRepo.getBotConfig(companyId).catch(() => ({}))) ?? {};
    const priority = Array.isArray(botConfig.flowPriority) && botConfig.flowPriority.length > 0 ? botConfig.flowPriority : null;
    flow = await resolveFlow(companyId, number, group, text, priority ?? ['vendas', 'suporte', 'marketing']);
  }

  if (!flow) {
    logger.warn({ companyId, from, text }, 'bot: nenhum fluxo ativo encontrado (vendas/suporte/marketing)');
    return null;
  }

  const config = flow.config_json ?? {};
  const steps = Array.isArray(config.steps) ? config.steps : [];
  if (steps.length === 0) {
    logger.warn({ companyId, from, flowId: flow.id }, 'bot: fluxo sem steps');
    return null;
  }

  const normalizedText = normalize(text);
  const triggers = Array.isArray(config.triggers) ? [...config.triggers].sort((a, b) => normalize(b.keyword).length - normalize(a.keyword).length) : [];

  let nextStep = null;

  const matchedTrigger = triggers.find((t) => normalizedText.includes(normalize(t.keyword)));
  if (matchedTrigger) {
    nextStep = steps.find((s) => s.id === matchedTrigger.step) ?? null;
    if (nextStep) {
      logger.info({ companyId, from, text, keyword: matchedTrigger.keyword, stepId: nextStep.id, flowId: flow.id }, 'bot: trigger matched');
    }
  }

  if (!nextStep && currentStepId) {
    const currentStep = steps.find((s) => s.id === currentStepId);
    if (currentStep?.type === 'question' && currentStep.options) {
      const matched = currentStep.options.find(
        (o) => normalize(o.label) === normalizedText || normalize(o.value) === normalizedText,
      );
      if (matched) {
        nextStep = steps.find((s) => s.id === matched.next) ?? null;
        if (matched.variable) {
          const base = { ...(currentState.vars ?? {}), [matched.variable]: matched.value };
          currentState.vars = base;
        }
      } else {
        const attempts = ((currentState.vars?.questionAttempts) ?? 0) + 1;
        currentState.vars = { ...(currentState.vars ?? {}), questionAttempts: attempts };
        const replyTo = group?.remoteJid ?? from;
        if (attempts >= 3) {
          await sendFlowMessage(number, replyTo, 'Não consegui entender. Vou transferir para um atendente.');
          if (resolvedContact?.id) await updateContactFlowState(companyId, resolvedContact.id, { flowId: null, flowStep: null, vars: currentState.vars ?? {} });
          await chatbotCache.clearFlowState(companyId, from);
          const { notifyAttendants } = await import('../../notifications/services/notificationService.js');
          await notifyAttendants({ companyId, title: 'Cliente sem resposta do bot', message: `${from} não entendeu as opções do fluxo: "${text}"`, type: 'message' }).catch(() => null);
          return { flowId: flow.id, stepId: currentStep.id, nextStepId: null, cacheRead, cleared: true };
        }
        nextStep = currentStep;
        await sendFlowMessage(number, replyTo, 'Desculpe, não entendi. Escolha uma das opções abaixo:');
      }
    } else {
      nextStep = steps.find((s) => s.id === currentStep.next) ?? null;
    }
  }

  if (!nextStep) {
    nextStep = steps.find((s) => s.id === config.defaultStep) ?? steps[0];
  }

  if (!nextStep) return null;

  await automationRepo.incrementMessagesCount(flow.id);

  const state = { flowId: flow.id, flowStep: currentStepId, vars: currentState?.vars ?? {} };
  const replyTo = group?.remoteJid ?? from;
  let result = await executeStep({ companyId, number, from, replyTo, text, contact: resolvedContact, flow, step: nextStep, state, group });

  let finalFlowId = flow.id;
  if (result.switchFlow) finalFlowId = result.switchFlow;

  let hops = 0;
  while (result.nextStep && !result.clear && !result.switchFlow && hops < 10) {
    const chainStep = steps.find((s) => s.id === result.nextStep);
    if (!chainStep) break;
    const needsInput = chainStep.type === 'question' || (chainStep.type === 'variable' && chainStep.mode === 'input');
    if (needsInput) break;
    if (chainStep.type === 'message' || chainStep.type === 'media' || chainStep.type === 'delay') await sleep(600);
    const chainState = { flowId: flow.id, flowStep: result.nextStep, vars: result.vars ?? state.vars };
    result = await executeStep({ companyId, number, from, replyTo, text, contact: resolvedContact, flow, step: chainStep, state: chainState, group });
    hops += 1;
    if (result.switchFlow) { finalFlowId = result.switchFlow; break; }
    if (result.clear) break;
  }

  if (result.clear) {
    if (resolvedContact?.id) await updateContactFlowState(companyId, resolvedContact.id, { flowId: null, flowStep: null, vars: result.vars ?? {} });
    await chatbotCache.clearFlowState(companyId, from);
  } else {
    const nextState = { flowId: finalFlowId, flowStep: result.nextStep ?? null, vars: result.vars ?? state.vars };
    if (resolvedContact?.id) await updateContactFlowState(companyId, resolvedContact.id, nextState);
    await chatbotCache.setFlowState(companyId, from, nextState);
  }

  return { flowId: flow.id, stepId: nextStep.id, nextStepId: result.nextStep ?? null, cacheRead };
}

export default {
  listFlows,
  getFlowById,
  createFlow,
  updateFlow,
  deleteFlow,
  toggleFlow,
  duplicateFlow,
  testFlow,
  validateFlowConfig,
  listQuickReplies,
  createQuickReply,
  updateQuickReply,
  deleteQuickReply,
  useQuickReply,
  processIncomingMessage,
  extractMessageText,
  normalizePhone,
  evaluateExpression,
};
