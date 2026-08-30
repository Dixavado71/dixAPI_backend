import { NotFoundError, ConflictError, BadRequestError } from '../../../shared/errors/AppError.js';
import { lookup } from 'node:dns/promises';
import crypto from 'node:crypto';
import * as automationRepo from '../repositories/automationRepository.js';
import * as whatsappRepo from '../../whatsapp/repositories/whatsappRepository.js';
import * as conversationRepo from '../../conversations/repositories/conversationRepository.js';
import * as evolutionApi from '../../../infrastructure/whatsapp/evolutionApiClient.js';
import chatbotCache from '../cache/chatbotCache.js';
import { fillTemplate } from './templateEngine.js';
import { evaluateExpression } from './expressionEvaluator.js';
import { extractMessageText as extractMessageTextFromShared } from '../../../shared/whatsapp/extraction.js';
import { normalizePhone, canonicalPhone } from '../../../shared/whatsapp/phone.js';
import { syncConversation } from '../../../shared/whatsapp/conversation.js';
import { findOrCreateCustomer } from '../../../shared/whatsapp/customer.js';
import { createOrder } from '../../orders/services/orderService.js';
import { notifyAttendantsAsync } from '../../notifications/services/notificationService.js';
import * as productionService from '../../production/services/productionService.js';
import { logger } from '../../../config/logger.js';
import {
  normalize as flowNormalize,
  matchTrigger,
  looksLikeProtocol,
  resolveQuestionOption,
  classifyCartSummaryReply,
  classifyProductReply,
  parseQuantity,
  isResetKeyword,
  findResumeStep,
  resolveFallbackStep,
} from './flowDecisions.js';

function mapFlow(flow) {
  if (!flow) return flow;
  return {
    id: flow.id,
    companyId: flow.company_id,
    name: flow.name,
    type: flow.type,
    description: flow.description,
    iconEmoji: flow.icon_emoji,
    messagesCount: flow.messages_count,
    totalConversions: flow.total_conversions,
    conversionRate: flow.conversion_rate,
    growthPercentage: flow.growth_percentage,
    isActive: flow.is_active,
    configJson: flow.config_json,
    createdAt: flow.created_at,
    updatedAt: flow.updated_at,
  };
}

function mapQuickReply(reply) {
  if (!reply) return reply;
  return {
    id: reply.id,
    companyId: reply.company_id,
    shortcut: reply.shortcut,
    messageText: reply.message_text,
    createdBy: reply.created_by,
    usageCount: reply.usage_count,
    createdAt: reply.created_at,
    updatedAt: reply.updated_at,
  };
}

export async function listFlows(companyId, filters) {
  const flows = await automationRepo.listFlows(companyId, filters);
  return Array.isArray(flows) ? flows.map(mapFlow) : flows;
}

export function validateFlowConfig(config) {
  const steps = Array.isArray(config?.steps) ? config.steps : [];
  if (steps.length === 0) throw new BadRequestError('O fluxo deve ter pelo menos 1 passo.');
  const ids = new Set(steps.map((s) => s.id).filter(Boolean));
  const dangling = [];

  for (const step of steps) {
    if (step.next && !ids.has(step.next)) dangling.push(`step '${step.id}'.next -> '${step.next}'`);
    if (step.next_false && !ids.has(step.next_false)) dangling.push(`step '${step.id}'.next_false -> '${step.next_false}'`);
    if (step.next_sim && !ids.has(step.next_sim)) dangling.push(`step '${step.id}'.next_sim -> '${step.next_sim}'`);
    if (step.next_nao && !ids.has(step.next_nao)) dangling.push(`step '${step.id}'.next_nao -> '${step.next_nao}'`);
    if (step.next_empty && !ids.has(step.next_empty)) dangling.push(`step '${step.id}'.next_empty -> '${step.next_empty}'`);
    if (step.else && !ids.has(step.else)) dangling.push(`step '${step.id}'.else -> '${step.else}'`);
    if (step.type === 'question' && (!Array.isArray(step.options) || step.options.length === 0)) {
      throw new BadRequestError(`Step '${step.id}': pergunta precisa de pelo menos 1 opção.`);
    }
    if (step.type === 'product' && !step.productId && step.productSource !== 'featured' && step.productSource !== 'catalog') {
      throw new BadRequestError(`Step '${step.id}': produto precisa de um produto ou origem (destaque/catálogo).`);
    }
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

  // Aviso de ciclos potencialmente infinitos entre passos sem espera de input.
  const warns = [];
  const waitsForInput = (s) => s.type === 'question'
    || (s.type === 'variable' && s.mode === 'input')
    || (s.type === 'action' && (s.action === 'cart_summary' || s.action === 'cart_checkout'))
    || s.type === 'product';
  for (const step of steps) {
    if (waitsForInput(step)) continue;
    const target = step.next ?? step.next_false ?? step.next_sim ?? step.next_nao ?? step.next_empty;
    if (target && target !== step.id && ids.has(target)) {
      const targetStep = steps.find((s) => s.id === target);
      if (targetStep && !waitsForInput(targetStep) && targetStep.next === step.id) {
        warns.push(`possível ciclo entre passos '${step.id}' e '${target}' sem entrada do cliente`);
      }
    }
  }
  if (config.max_hops && Number(config.max_hops) < 1) {
    warns.push('max_hops deve ser >= 1; aplicado o padrão de 10');
  }

  if (dangling.length > 0) {
    throw new BadRequestError(`Fluxo inválido: referências a passos inexistentes (${dangling.join(', ')}).`);
  }
  return warns.length > 0 ? { valid: true, warnings: warns } : true;
}

export async function getFlowById(companyId, id) {
  const flow = await automationRepo.findFlowById(companyId, id);
  if (!flow) throw new NotFoundError('Fluxo não encontrado.');
  return mapFlow(flow);
}

export async function createFlow(companyId, data) {
  const config = { steps: data.config.steps, triggers: data.config.triggers ?? [], defaultStep: data.config.defaultStep ?? data.config.steps[0]?.id };
  validateFlowConfig(config);
  const flow = await automationRepo.createFlow({
    company_id: companyId,
    name: data.name,
    type: data.type,
    description: data.description ?? null,
    icon_emoji: data.iconEmoji ?? null,
    is_active: data.isActive ?? true,
    config_json: config,
  });
  return mapFlow(flow);
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
  const updated = await automationRepo.findUpdatedFlow(companyId, id);
  return mapFlow(updated);
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
  const config = existing.config_json ?? { steps: [], triggers: [], defaultStep: null };
  const steps = Array.isArray(config.steps) ? config.steps : [];

  // Remapeia os IDs dos passos para evitar colisões de referência na cópia.
  const idMap = new Map();
  const remappedSteps = steps.map((s) => {
    const newId = `${s.id}-copy`;
    idMap.set(s.id, newId);
    return { ...s, id: newId };
  });
  const mapRef = (ref) => (ref && idMap.has(ref) ? idMap.get(ref) : ref);
  for (const step of remappedSteps) {
    step.next = mapRef(step.next);
    step.next_false = mapRef(step.next_false);
    step.next_sim = mapRef(step.next_sim);
    step.next_nao = mapRef(step.next_nao);
    step.next_empty = mapRef(step.next_empty);
    step.else = mapRef(step.else);
    if (Array.isArray(step.options)) {
      step.options = step.options.map((o) => ({ ...o, next: mapRef(o.next) }));
    }
    if (Array.isArray(step.routes)) {
      step.routes = step.routes.map((r) => ({ ...r, next: mapRef(r.next) }));
    }
  }
  const triggers = Array.isArray(config.triggers)
    ? config.triggers.map((t) => ({ ...t, step: mapRef(t.step) }))
    : config.triggers;

  return automationRepo.createFlow({
    company_id: companyId,
    name: `${existing.name} (cópia)`,
    type: existing.type,
    description: existing.description,
    icon_emoji: existing.icon_emoji,
    is_active: false,
    config_json: {
      steps: remappedSteps,
      triggers,
      defaultStep: mapRef(config.defaultStep),
      ...(config.max_hops ? { max_hops: config.max_hops } : {}),
    },
  });
}

export async function exportFlow(companyId, id) {
  const flow = await automationRepo.findFlowById(companyId, id);
  if (!flow) throw new NotFoundError('Fluxo não encontrado.');
  return {
    name: flow.name,
    type: flow.type,
    description: flow.description,
    iconEmoji: flow.icon_emoji,
    isActive: flow.is_active,
    config: flow.config_json ?? { steps: [], triggers: [], defaultStep: null },
  };
}

export async function importFlow(companyId, data) {
  const config = {
    steps: data.config?.steps ?? [],
    triggers: data.config?.triggers ?? [],
    defaultStep: data.config?.defaultStep ?? data.config?.steps?.[0]?.id,
  };
  validateFlowConfig(config);
  const flow = await automationRepo.createFlow({
    company_id: companyId,
    name: data.name,
    type: data.type,
    description: data.description ?? null,
    icon_emoji: data.iconEmoji ?? null,
    is_active: data.isActive ?? true,
    config_json: config,
  });
  return mapFlow(flow);
}

export async function testFlow(companyId, id, data) {
  const existing = await automationRepo.findFlowById(companyId, id);
  if (!existing) throw new NotFoundError('Fluxo não encontrado.');
  const rootSteps = existing.config_json?.steps ?? [];
  if (rootSteps.length === 0) return { steps: [], executed: [] };

  const state = { vars: data?.vars ?? {}, flowId: existing.id };
  const executed = [];
  let stepId = data?.stepId ?? null;
  if (!stepId) {
    // Aplica o match de triggers (como no bot real) quando stepId não é fornecido.
    const triggers = Array.isArray(existing.config_json?.triggers) ? existing.config_json.triggers : [];
    const matchedTrigger = matchTrigger(triggers, state.vars?.mensagem ?? '');
    if (matchedTrigger) {
      stepId = matchedTrigger.step;
    } else {
      stepId = existing.config_json?.defaultStep ?? rootSteps[0]?.id;
    }
  }
  let currentFlowId = existing.id;
  let currentSteps = rootSteps;
  const visitedEdges = new Set();
  let hops = 0;
  const maxHops = Math.min(Math.max(Number(data?.maxHops) || 30, 1), 200);
  const inputs = Array.isArray(data?.input) ? data.input : [];
  let inputIndex = 0;
  const loopDetected = [];

  const waitsForInput = (step) =>
    step.type === 'question'
    || (step.type === 'variable' && step.mode === 'input')
    || (step.type === 'action' && step.action === 'cart_summary')
    || step.type === 'product'
    || (step.type === 'action' && step.action === 'cart_checkout');

  const pushStep = (step, flowId) => {
    executed.push({
      id: step.id,
      type: step.type,
      content: fillTemplate(step.content ?? '', state.vars),
      flowId,
    });
  };

  while (stepId && hops < maxHops) {
    hops += 1;
    const step = currentSteps.find((s) => s.id === stepId);
    if (!step) break;
    pushStep(step, currentFlowId);

    const inputText = inputIndex < inputs.length ? inputs[inputIndex] : undefined;
    const result = await executeStepLocal({ step, state, vars: state.vars, simulated: true, extra: { text: inputText, interactive: inputs.length > 0 } });
    if (result.vars) state.vars = result.vars;
    if (result.switchFlow && result.switchFlow !== currentFlowId) {
      const targetFlow = await automationRepo.findFlowById(companyId, result.switchFlow).catch(() => null);
      if (targetFlow?.config_json?.steps?.length) {
        executed.push({ id: result.switchFlow, type: '__subflow__', content: `→ fluxo: ${targetFlow.name}`, flowId: currentFlowId });
        currentFlowId = result.switchFlow;
        currentSteps = targetFlow.config_json.steps;
        state.flowId = currentFlowId;
        visitedEdges.clear();
        stepId = targetFlow.config_json.defaultStep ?? targetFlow.config_json.steps[0]?.id;
        continue;
      }
      break;
    }
    if (result.clear) break;

    const next = result.nextStep ?? null;
    const interactive = inputs.length > 0;
    const waiting = interactive && waitsForInput(step);
    if (waiting) {
      if (inputIndex < inputs.length) {
        inputIndex += 1; // consome a resposta do cliente e continua
      } else {
        break; // sem mais entradas: encerra a simulação
      }
    }

    // Ciclo real: passo que não espera input repetindo a mesma transição
    if (!waiting && next) {
      const edgeKey = `${currentFlowId}:${stepId}->${next}`;
      if (visitedEdges.has(edgeKey)) {
        loopDetected.push(stepId);
        break;
      }
      visitedEdges.add(edgeKey);
    }
    stepId = next;
  }

  if (hops >= maxHops) loopDetected.push('max_hops');
  return { steps: rootSteps, executed, loopDetected };
}

/* ===== Quick replies ===== */

export async function listQuickReplies(companyId) {
  const replies = await automationRepo.listQuickReplies(companyId);
  return Array.isArray(replies) ? replies.map(mapQuickReply) : replies;
}

export async function findQuickReplyById(companyId, id) {
  const reply = await automationRepo.findQuickReplyById(companyId, id);
  return mapQuickReply(reply);
}

export async function createQuickReply(companyId, userId, data) {
  const duplicates = await automationRepo.listQuickReplies(companyId);
  if (duplicates.some((q) => q.shortcut.toLowerCase() === data.shortcut.toLowerCase())) {
    throw new ConflictError('Atalho já cadastrado.');
  }
  const reply = await automationRepo.createQuickReply({
    company_id: companyId,
    shortcut: data.shortcut,
    message_text: data.messageText,
    created_by: userId,
  });
  return mapQuickReply(reply);
}

export async function updateQuickReply(companyId, id, data) {
  const existing = await automationRepo.findQuickReplyById(companyId, id);
  if (!existing) throw new NotFoundError('Atalho não encontrado.');
  const patch = {};
  if (data.shortcut) patch.shortcut = data.shortcut;
  if (data.messageText) patch.message_text = data.messageText;
  await automationRepo.updateQuickReply(companyId, id, patch);
  const updated = await automationRepo.listQuickReplies(companyId).then((list) => list.find((q) => q.id === id));
  return mapQuickReply(updated);
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

export function extractMessageText(data) {
  return extractMessageTextFromShared(data?.message ?? data);
}

export function normalize(text) {
  return flowNormalize(text);
}

async function sendFlowMessage(number, to, text) {
  if (!text) return;
  try {
    const res = await evolutionApi.sendText(number.external_account_id, normalizePhone(to), text, 0);
    logger.info({ to, text: String(text).slice(0, 40), status: res?.status, keyId: res?.key?.id }, 'bot: resposta enviada para Evolution');
  } catch (err) {
    logger.error({ err: err.message, to, text }, 'bot: falha ao enviar resposta');
  }
  await syncConversation({ companyId: number.company_id, from: to, content: text, sender: 'bot', messageType: 'text' }).catch(() => null);
}

async function sendFlowMedia(number, to, media) {
  if (!media?.url) return;
  try {
    await evolutionApi.sendMedia(number.external_account_id, normalizePhone(to), media.type || 'image', media.url, media.caption ?? null, 0);
  } catch (err) {
    logger.error({ err: err.message, to, type: media.type }, 'bot: falha ao enviar mídia');
  }
  await syncConversation({ companyId: number.company_id, from: to, content: media.caption ?? media.type, sender: 'bot', messageType: media.type || 'image' }).catch(() => null);
}

async function sendFlowButtons(number, to, { title, description, buttons, footer = '', delay = 500 }) {
  if (!buttons || buttons.length === 0) { await sendFlowMessage(number, to, [title, description].filter(Boolean).join('\n\n')); return; }
  try {
    const mapped = buttons.map((b) => ({ type: 'reply', title: b, id: `btn_${Date.now()}_${b}` }));
    await evolutionApi.sendButtons(number.external_account_id, to, title ?? '', description ?? '', mapped, footer, delay);
  } catch (err) {
    logger.error({ err: err.message, to, title }, 'bot: falha ao enviar botoes');
    const fallback = [title, description, '', buttons.map((b) => `*${b}*`).join('\n')].filter(Boolean).join('\n');
    if (footer) await sendFlowMessage(number, to, `${fallback}\n\n${footer}`);
    else await sendFlowMessage(number, to, fallback);
  }
}

async function sendFlowProductCard(number, to, product, opts = {}) {
  const name = product.name || 'Produto';
  const price = `R$ ${Number(product.price).toFixed(2).replace('.', ',')}`;
  const desc = product.description ? `\n\n${product.description}` : '';
  const caption = `*${name}*${desc}`;
  const stockInfo = product.stock > 0 ? `Disponivel: ${product.stock} un.` : 'Indisponivel';
  const buttons = opts.buttons ?? ['SIM', 'NAO'];
  const footer = opts.footer ?? price;
  const title = opts.title ?? `Deseja ${opts.verb ?? 'adicionar'}?`;

  if (product.image_url) {
    try {
      await evolutionApi.sendMedia(number.external_account_id, to, 'image', product.image_url, caption, 300);
      await sleep(400);
    } catch {
      await sendFlowMessage(number, to, caption);
    }
  } else {
    await sendFlowMessage(number, to, caption);
  }
  await sleep(300);
  await sendFlowButtons(number, to, { title, description: stockInfo, buttons, footer });
}

async function resolveProductStep(companyId, step, vars) {
  if (step.productId) {
    const product = await whatsappRepo.findProductByCompany(companyId, step.productId).catch(() => null);
    if (product && product.status !== 'inactive') return product;
  }
  if (step.productSource === 'catalog') {
    const queue = vars?.catalogQueue;
    if (!Array.isArray(queue) || queue.length === 0) return null;
    const nextId = queue.shift();
    vars.catalogQueue = queue;
    const product = await whatsappRepo.findProductByCompany(companyId, nextId).catch(() => null);
    if (product && product.status !== 'inactive') return product;
    return null;
  }
  const [featured] = await whatsappRepo.listActiveProducts(companyId, 1);
  return featured ?? null;
}

function formatCartSummary(cart) {
  if (!Array.isArray(cart) || cart.length === 0) return '\u{1F6AB} *Seu carrinho esta vazio!*\n\nAdicione produtos pelo catalogo ou solicite um orcamento.';
  const lines = cart.map((i) => {
    const lineTotal = (Number(i.price) * i.quantity).toFixed(2).replace('.', ',');
    return `\u2022 ${i.quantity}x *${i.name}* \u2014 R$ ${lineTotal}`;
  });
  const total = cart.reduce((a, i) => a + Number(i.price) * i.quantity, 0);
  return `${lines.join('\n')}\n\n*Total: R$ ${total.toFixed(2).replace('.', ',')}*`;
}

async function checkoutCartStep({ companyId, number, from, vars, step, contact }) {
  const cart = Array.isArray(vars?.cart) ? vars.cart : [];
  if (cart.length === 0) return null;
  const phone = normalizePhone(from);
  const customer = await findOrCreateCustomer({
    companyId,
    whatsappNumberId: number.id,
    phone,
    preferredName: vars?.nome || null,
  });
  vars.customerId = customer.id;
  const items = cart.map((i) => ({ productId: i.productId, quantity: i.quantity }));

  const shippingAddress = vars?.zm_endereco_entrega || vars?.endereco_padrao || null;

  const notes = [
    vars?.cesta_tipo ? `Cesta: ${vars.cesta_tipo}` : null,
    vars?.cesta_qtd ? `Quantidade: ${vars.cesta_qtd}` : null,
    vars?.cesta_presente ? `Presente: ${vars.cesta_presente}` : null,
    vars?.cesta_endereco_presente ? `Endereço do presente: ${vars.cesta_endereco_presente}` : null,
    vars?.cesta_cartao ? `Cartão personalizado: ${vars.cesta_cartao}` : null,
    vars?.cesta_embalagem ? `Embalagem: ${vars.cesta_embalagem}` : null,
    vars?.cesta_entrega ? `Agendamento de entrega: ${vars.cesta_entrega}` : null,
    vars?.cesta_brinde ? `Brinde: ${vars.cesta_brinde}` : null,
    vars?.cesta_cupom ? `Cupom: ${vars.cesta_cupom}` : null,
    vars?.zm_endereco_entrega ? `Endereço de entrega: ${vars.zm_endereco_entrega}` : null,
    vars?.orcamento_tipo ? `Móvel: ${vars.orcamento_tipo}` : null,
    vars?.orcamento_medidas ? `Medidas: ${vars.orcamento_medidas}` : null,
    vars?.orcamento_material ? `Material: ${vars.orcamento_material}` : null,
    vars?.orcamento_acabamento ? `Acabamento: ${vars.orcamento_acabamento}` : null,
    vars?.orcamento_quantidade ? `Quantidade: ${vars.orcamento_quantidade}` : null,
    vars?.protocolo_input || vars?.protocol ? `Protocolo: ${vars.protocolo_input || vars.protocol}` : null,
  ].filter(Boolean).join('\n');

  const couponCode = vars?.cesta_cupom || vars?.cupom || null;
  const order = await createOrder(companyId, customer.id, step.paymentMethod ?? 'pix', items, couponCode, shippingAddress, notes || null);

  if (vars?.zm_endereco_entrega) {
    try {
      const contactRecord = await whatsappRepo.findContactByPhone(companyId, number.id, from);
      if (contactRecord) {
        const meta = { ...(contactRecord.metadata ?? {}), default_address: vars.zm_endereco_entrega };
        await whatsappRepo.updateContactMetadata(contactRecord.id, meta);
      }
    } catch (err) {
      logger.error({ err: err.message, companyId, from }, 'checkout: erro ao salvar endereco padrao');
    }
  }

  return order;
}

async function updateContactFlowState(companyId, contactId, state) {
  const contact = await whatsappRepo.findContactById(companyId, contactId);
  const merged = { ...(contact?.metadata ?? {}), ...state };
  await whatsappRepo.updateContactMetadata(contactId, merged);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function logFlowAction({ companyId, number, from, step, flow }) {
  if (!number?.id) return;
  const event = step.action === 'alert' ? 'alert' : 'flow_action';
  await whatsappRepo.createMessageLog({
    company_id: companyId,
    whatsapp_number_id: number.id,
    event,
    direction: 'outbound',
    message_type: 'text',
    content: step.action || step.type,
    recipient: from,
    remote_jid: `${from}@s.whatsapp.net`,
    status: 'sent',
  }).catch(() => null);
}

async function resolveFlow(companyId, number, group, text, priority = ['vendas', 'suporte', 'marketing']) {
  if (group?.remoteJid) {
    const linked = await whatsappRepo.findLinkedGroupByRemoteJid(number.id, group.remoteJid);
    if (linked?.flow_id) {
      const bound = await automationRepo.findFlowById(companyId, linked.flow_id);
      if (bound && bound.is_active) return bound;
    }
  }
  if (number?.flow_id) {
    const bound = await automationRepo.findFlowById(companyId, number.flow_id);
    if (bound && bound.is_active) return bound;
  }
  for (const type of priority) {
    const flow = await automationRepo.findActiveFlowByType(companyId, type);
    if (flow) return flow;
  }
  return null;
}

async function buildFlowContext({ number, from, text, state, flow, group, media, step, contact }) {
  const now = new Date();
  let isCliente = contact?.customer_id ? true : false;
  if (!isCliente) {
    try {
      const customer = await whatsappRepo.findCustomerByPhone(number.company_id, normalizePhone(from)).catch(() => null);
      isCliente = !!customer;
    } catch { /* ignore */ }
  }
  const enderecoPadrao = contact?.metadata?.default_address ?? null;
  const cart = Array.isArray(state?.vars?.cart) ? state.vars.cart : [];
  const cartTotal = cart.reduce((a, i) => a + Number(i.price ?? 0) * Number(i.quantity ?? 0), 0);
  return {
    ...(state?.vars ?? {}),
    cliente: isCliente,
    endereco_padrao: enderecoPadrao,
    nome: state?.vars?.nome ?? contact?.name ?? null,
    telefone: normalizePhone(from),
    mensagem: text || '',
    media: media?.url ?? null,
    media_type: media?.type ?? null,
    media_caption: media?.caption ?? null,
    flow_name: flow?.name ?? '',
    flow_id: flow?.id ?? '',
    step_id: step?.id ?? '',
    data: now.toISOString().slice(0, 10),
    hora: now.toTimeString().slice(0, 8),
    grupo: group?.senderName ?? null,
    grupo_jid: group?.remoteJid ?? null,
    cart_length: cart.length,
    cart_total: cartTotal,
  };
}

async function executeStepLocal({ step, state, vars, simulated = false, extra = {} }) {
  let nextStep = step.next ?? null;
  let clear = false;
  let switchFlow = null;
  const varsOut = { ...(vars ?? {}) };
  const text = extra.text;
  const interactive = extra.interactive === true;

  if (step.type === 'variable' && step.variable) {
    if (step.mode === 'input') {
      if (text !== undefined) {
        varsOut[step.variable] = text;
        nextStep = step.next ?? null;
      } else if (varsOut[step.variable] !== undefined) {
        nextStep = step.next ?? null;
      } else {
        nextStep = interactive ? step.id : (step.next ?? null);
      }
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

  if (step.type === 'question' && step.options) {
    const matched = text !== undefined ? resolveQuestionOption(step, text) : extra.option ?? null;
    if (matched) {
      if (matched.variable) varsOut[matched.variable] = matched.value;
      nextStep = matched.next ?? step.next ?? null;
    } else if (interactive) {
      // Resposta livre: se o step define freeTextVariable, captura e segue;
      // senão permanece para re-perguntar.
      if (step.freeTextVariable && text !== undefined) {
        varsOut[step.freeTextVariable] = text;
        nextStep = step.next ?? null;
      } else {
        nextStep = step.id;
      }
    } else {
      nextStep = step.next ?? null;
    }
  }

  if (step.type === 'product') {
    const option = extra.option ?? (text !== undefined ? classifyProductReply(text) : null);
    if (option === 'sim') nextStep = step.next_sim ?? step.next ?? null;
    else if (option === 'nao') nextStep = step.next_nao ?? step.next ?? null;
    else if (option === 'empty') nextStep = step.next_empty ?? step.next_nao ?? step.next ?? null;
    else nextStep = interactive ? step.id : (step.next_sim ?? step.next ?? null); // interativo: aguarda SIM/NÃO
  }

  if (step.type === 'message' || step.type === 'media' || step.type === 'delay' || step.type === 'forward' || step.type === 'group') {
    nextStep = step.next ?? null;
  }

  if (step.type === 'catalog') {
    nextStep = step.next ?? null;
  }

  if (step.type === 'webhook') {
    nextStep = step.next ?? null;
  }

  if (step.type === 'router' && step.routes) {
    const expression = step.expression ?? '';
    let chosen = null;
    if (expression) {
      const value = evaluateExpression(expression, { ctx: varsOut });
      const key = typeof value === 'string' ? value : String(value);
      chosen = step.routes.find((r) => r.value === key) ?? null;
    }
    nextStep = chosen?.next ?? step.next ?? null;
  }

  if (step.type === 'ia' || step.type === 'database' || step.type === 'email') {
    nextStep = step.next ?? null;
  }

  if (step.type === 'flow') {
    const targetFlowId = step.targetFlow ?? step.flowId;
    if (targetFlowId) switchFlow = targetFlowId;
    else nextStep = step.next ?? null;
  }

  if (step.type === 'action') {
    if (step.action === 'end') return { nextStep: null, vars: varsOut, clear: true, switchFlow: null };
    if (step.action === 'transfer_to_human') return { nextStep: null, vars: varsOut, clear: true, switchFlow: null };
    if (step.action === 'cart_summary') {
      const cart = Array.isArray(varsOut.cart) ? varsOut.cart : [];
      if (cart.length === 0) {
        nextStep = step.next_nao ?? step.next ?? null;
      } else {
        const reply = classifyCartSummaryReply(text ?? '');
        if (reply === 'finish') nextStep = step.next ?? null;
        else if (reply === 'continue') nextStep = step.next_nao ?? null;
        else nextStep = step.id; // aguarda decisão
      }
    } else if (step.action === 'cart_checkout') {
      const cart = Array.isArray(varsOut.cart) ? varsOut.cart : [];
      if (cart.length === 0) {
        nextStep = step.next_nao ?? null; // carrinho vazio: volta ao catálogo
      } else {
        nextStep = step.next ?? null;
      }
    } else if (step.action === 'cart_clear') {
      varsOut.cart = [];
      nextStep = step.next ?? null;
    } else if (step.action === 'init_catalog_loop') {
      nextStep = step.next_nao ?? step.next ?? null;
    } else if (step.action === 'start_atendimento') {
      if (!varsOut.protocol) {
        const dataStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
        varsOut.protocol = `MK-${dataStr}-${rand}`;
      }
      nextStep = step.next ?? null;
    } else if (step.action === 'inform_protocolo_existente') {
      nextStep = step.next ?? null;
    } else if (step.action === 'resume_by_protocol') {
      const protocolInput = String(varsOut?.protocolo_input || text || '').trim().toUpperCase();
      if (!protocolInput) nextStep = step.next_nao ?? step.next ?? null;
      else nextStep = step.next ?? step.next_nao ?? null;
    } else if (step.action === 'alert') {
      nextStep = step.next ?? null;
    } else if (step.action === 'create_custom_order' || step.action === 'schedule_production') {
      nextStep = step.next ?? null;
    } else {
      nextStep = step.next ?? null;
    }
  }

  if (step.type === 'end') {
    return { nextStep: null, vars: varsOut, clear: true, switchFlow: null };
  }

  return { nextStep, vars: varsOut, clear, switchFlow };
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

async function executeStep({ companyId, number, from, replyTo, text, contact, flow, step, state, group, media }) {
  const vars = { ...(state?.vars ?? {}) };
  const context = await buildFlowContext({ number, from, text, state: { vars }, flow, group, media, step, contact });
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

  if (step.type === 'catalog') {
    const products = await whatsappRepo.listActiveProducts(companyId, step.limit ?? 10);
    if (products.length === 0) {
      await sendFlowMessage(number, target, 'No momento n\u00e3o temos produtos dispon\u00edveis no cat\u00e1logo.');
    } else if (step.style === 'cards') {
      await sendFlowMessage(number, target, content());
      await sleep(400);
      for (const p of products) {
        await sendFlowProductCard(number, target, p, { title: `Quer o *${p.name}*?`, verb: 'adicionar', buttons: ['SIM', 'NAO'] });
        await sleep(350);
      }
    } else {
      const lines = products.map((p) => {
        const price = Number(p.price).toFixed(2).replace('.', ',');
        return `\u2022 *${p.name}* \u2014 R$ ${price}\n   ${p.description ?? ''}`.trim();
      });
      await sendFlowMessage(number, target, `${content()}\n\n${lines.join('\n')}`);
    }
    nextStep = step.next ?? null;
  }

  if (step.type === 'product') {
    const product = await resolveProductStep(companyId, step, vars);
    if (!product) {
      if (step.productSource === 'catalog') {
        await sendFlowMessage(number, target, '\u{1F4E6} *Catalogo finalizado!*\n\nVoce ja viu todos os produtos disponiveis no momento.');
        nextStep = step.next_empty ?? step.next_nao ?? step.next ?? null;
      } else {
        await sendFlowMessage(number, target, 'Produto indispon\u00edvel no momento.');
        nextStep = step.next_nao ?? step.next ?? null;
      }
    } else {
      vars.productPending = product.id;
      await sendFlowProductCard(number, target, product, {
        title: `Deseja adicionar *${product.name}* ao carrinho?`,
        verb: 'adicionar',
        buttons: ['SIM', 'NAO'],
      });
      nextStep = step.id;
    }
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
    await logFlowAction({ companyId, number, from, step, flow });
    if (step.action === 'transfer_to_human') {
      const bc = (await whatsappRepo.getBotConfig(companyId).catch(() => ({}))) ?? {};
      const cart = (vars?.cart ?? []).length > 0 ? formatCartSummary(vars.cart) : '';
      const msg = [step.content || bc.transferMessage || 'Um atendente vai te responder em instantes.', cart].filter(Boolean).join('\n\n');
      await sendFlowMessage(number, target, msg);
      clear = true;
      const conv = await conversationRepo.findConversationByContact(companyId, 'whatsapp', from);
      if (conv) await conversationRepo.updateConversation(conv.id, { status: 'waiting' }).catch(() => null);
      notifyAttendantsAsync({
        companyId,
        title: cart ? 'Cliente finalizou pedido' : 'Cliente pediu atendente',
        message: `${from}: "${text}"${cart ? `\n\n${cart}` : ''}`,
        type: 'message',
        relatedEntityType: 'conversation',
        relatedEntityId: conv?.id ?? null,
      });
      const atendentePhone = String(bc?.atendentePhone || bc?.ownerPhone || bc?.forwardTo || '').replace(/\D/g, '');
      if (atendentePhone && atendentePhone !== String(from).replace(/\D/g, '')) {
        const signal = [
          `\u{1F464} *Pedido de atendimento humano*`,
          `Cliente: ${from}${cart ? `\n\n${cart}` : ''}${text ? `\nMensagem: "${text}"` : ''}`,
        ].join('\n');
        await evolutionApi.sendText(number.external_account_id, atendentePhone, signal, 300).catch((err) => {
          logger.error({ err: err.message, companyId, from, atendentePhone }, 'transfer_to_human: falha ao sinalizar atendente no WhatsApp');
        });
      }
      nextStep = null;
    } else if (step.action === 'cart_summary') {
      const cart = vars?.cart ?? [];
      if (cart.length === 0) {
        await sendFlowMessage(number, target, '\u{1F6AB} *Seu carrinho esta vazio!*\n\nAdicione produtos pelo catalogo ou solicite um orcamento.');
        nextStep = step.next_nao ?? step.next ?? null;
      } else {
        const summary = formatCartSummary(cart);
        const total = cart.reduce((a, i) => a + Number(i.price) * i.quantity, 0);
        const totalStr = `R$ ${total.toFixed(2).replace('.', ',')}`;
        await sendFlowMessage(number, target, `${content() || 'Resumo do carrinho:'}\n\n${summary}\n\n*Total: ${totalStr}*`);
        await sleep(300);
        await sendFlowButtons(number, target, { title: 'O que deseja fazer?', description: null, buttons: ['Finalizar pedido', 'Continuar comprando'], footer: totalStr });
        vars.cartSummaryPending = true;
        nextStep = step.id;
      }
    } else if (step.action === 'cart_checkout') {
      const cartCount = Array.isArray(vars?.cart) ? vars.cart.length : 0;
      if (cartCount === 0) {
        await sendFlowMessage(number, target, '\u{1F6AB} *Seu carrinho esta vazio!*\n\nNao ha itens para finalizar. Adicione produtos pelo catalogo.');
        nextStep = step.next_nao ?? step.next ?? null;
        clear = false;
      } else {
        try {
        const order = await checkoutCartStep({ companyId, number, from, vars, step, contact });
        if (order) {
          const totalStr = `R$ ${Number(order.total).toFixed(2).replace('.', ',')}`;
          await sendFlowMessage(number, target, `\u{1F4E6} *Pedido ${order.order_number} criado com sucesso!*\n\nTotal: *${totalStr}*\n\nUm atendente vai enviar o PIX para pagamento em instantes.`);
          const conv = await conversationRepo.findConversationByContact(companyId, 'whatsapp', from);
          if (conv) await conversationRepo.updateConversation(conv.id, { status: 'waiting' }).catch(() => null);

          const cartSummary = formatCartSummary(vars?.cart ?? []);
          notifyAttendantsAsync({
            companyId,
            title: `Novo pedido: ${order.order_number}`,
            message: `${from} finalizou o pedido no WhatsApp.\n\nPedido: ${order.order_number}\nTotal: ${totalStr}\n\n${cartSummary}${vars?.orcamento_tipo ? `\n\nOrçamento: ${vars.orcamento_tipo} ${vars.orcamento_medidas || ''} ${vars.orcamento_material || ''} ${vars.orcamento_acabamento || ''}` : ''}`,
            type: 'order',
            relatedEntityType: 'order',
            relatedEntityId: order.id,
          });
          vars.cart = [];
          vars.cartSummaryPending = false;
          vars.last_order_id = order.id;
          if (step.next) {
            nextStep = step.next;
            clear = false;
          } else {
            nextStep = null;
            clear = true;
          }
        } else {
          await sendFlowMessage(number, target, 'Nao foi possivel criar o pedido. Tente novamente ou fale com um atendente.');
          clear = true;
          const conv = await conversationRepo.findConversationByContact(companyId, 'whatsapp', from);
          if (conv) await conversationRepo.updateConversation(conv.id, { status: 'waiting' }).catch(() => null);
          nextStep = null;
        }
        } catch (err) {
          logger.error({ err: err.message, companyId, from }, 'cart_checkout: erro ao criar pedido');
          await sendFlowMessage(number, target, '\u{274C} *Erro ao criar pedido.* Um atendente vai ajudar.');
          clear = true;
          nextStep = null;
        }
      }
    } else if (step.action === 'cart_clear') {
      vars.cart = [];
      vars.cartSummaryPending = false;
      await sendFlowMessage(number, target, step.content || 'Carrinho limpo.');
      nextStep = step.next ?? null;
    } else if (step.action === 'init_catalog_loop') {
      const products = await whatsappRepo.listActiveProducts(companyId, step.limit ?? 50);
      const queue = products.map((p) => p.id);
      if (queue.length === 0) {
        await sendFlowMessage(number, target, '\u{1F6AB} *Nenhum produto disponivel no momento.*\n\nTente novamente mais tarde ou fale com um atendente.');
        nextStep = step.next_nao ?? step.next ?? null;
      } else {
        vars.catalogQueue = queue;
        await sendFlowMessage(number, target, step.content || 'Vamos mostrar os produtos um a um.');
        nextStep = step.next ?? null;
      }
    } else if (step.action === 'start_atendimento') {
      let protocol = null;
      let existingConv = null;
      try {
        existingConv = await conversationRepo.findConversationByContact(companyId, 'whatsapp', from);
        protocol = existingConv?.protocol ?? null;
      } catch { /* ignore */ }
      if (!protocol) {
        const dataStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
        protocol = `MK-${dataStr}-${rand}`;
      }
      vars.protocol = protocol;
      try {
        if (existingConv) {
          await conversationRepo.updateConversation(existingConv.id, { protocol, flow_snapshot: { flowId: flow.id, flowStep: null, vars: {} } });
        }
      } catch (err) {
        logger.error({ err: err.message, companyId, from }, 'start_atendimento: erro ao salvar protocolo');
      }
      if (!vars?.protocolo_mostrado) {
        await sendFlowMessage(number, target, fillTemplate(step.content || `Seu protocolo de atendimento: *${protocol}*. Guarde para retomar depois.`, { ...context, ...vars, protocol }));
        vars.protocolo_mostrado = true;
      }
      nextStep = step.next ?? null;
    } else if (step.action === 'inform_protocolo_existente') {
      let protocol = null;
      try {
        const conv = await conversationRepo.findConversationByContact(companyId, 'whatsapp', from);
        protocol = conv?.protocol ?? null;
      } catch { /* ignore */ }
      if (protocol && !vars?.protocolo_mostrado) {
        vars.protocol = protocol;
        await sendFlowMessage(number, target, fillTemplate(step.content || `\u{1F4CB} Voce ja possui um protocolo de atendimento: *${protocol}*. \n\nGuarde para retomar a qualquer momento.`, { ...context, ...vars, protocol }));
        vars.protocolo_mostrado = true;
      }
      nextStep = step.next ?? null;
    } else if (step.action === 'resume_by_protocol') {
      const protocolInput = String(vars?.protocolo_input || text || '').trim().toUpperCase();
      const resumeTarget = steps.find((s) => s.id === step.next) ?? step;
      const resumeFallback = step.next_nao ?? step.next ?? null;
      if (!protocolInput) {
        await sendFlowMessage(number, target, '\u{1F522} *Digite o numero do protocolo* para retomar seu atendimento anterior.');
        nextStep = resumeFallback;
      } else {
        try {
          const conv = await conversationRepo.findByProtocol(companyId, protocolInput);
          if (conv?.flow_snapshot && conv.flow_snapshot.flowStep) {
            const snapshot = conv.flow_snapshot;
            const snapshotVars = { ...(snapshot.vars ?? {}), protocol: conv.protocol, protocolo_input: protocolInput };
            Object.assign(vars, snapshotVars);
            vars.customerId = vars.customerId ?? null;

            const targetFlow = snapshot.flowId && snapshot.flowId !== flow.id
              ? await automationRepo.findFlowById(companyId, snapshot.flowId).catch(() => null)
              : flow;
            const targetSteps = targetFlow?.config_json?.steps ?? [];
            const snapshotStep = targetSteps.find((s) => s.id === snapshot.flowStep);

            if (targetFlow && snapshotStep) {
              let segmento = 'atendimento anterior';
              if (Array.isArray(vars.cart) && vars.cart.length > 0) segmento = 'carrinho';
              else if (vars?.orcamento_tipo) segmento = 'orçamento';
              else if (vars?.productPending) segmento = 'catálogo';
              await sendFlowMessage(number, target, `\u{1F4CB} *Atendimento retomado!*\n\nProtocolo: *${protocolInput}*\nVocê estava no *${segmento}*. Continuando de onde parou.`);
              if (snapshot.flowId && snapshot.flowId !== flow.id) {
                return { nextStep: snapshot.flowStep, vars, clear: false, switchFlow: snapshot.flowId };
              }
              nextStep = snapshot.flowStep;
            } else {
              await sendFlowMessage(number, target, `\u{1F4CB} *Atendimento ${protocolInput} retomado!*\n\nSelecione uma op\u00e7\u00e3o: *Catalogo*, *Protocolo* ou *Atendente*.`);
              nextStep = resumeTarget.next ?? step.next ?? null;
            }
          } else {
            await sendFlowMessage(number, target, '\u{274C} *Protocolo n\u00e3o encontrado*\n\nO protocolo informado n\u00e3o existe ou o atendimento j\u00e1 foi encerrado. Vamos iniciar um novo atendimento.');
            nextStep = resumeFallback;
          }
        } catch (err) {
          logger.error({ err: err.message, companyId, from, protocolInput }, 'resume_by_protocol: erro');
          await sendFlowMessage(number, target, '\u{26A0}\u{FE0F} *Erro ao buscar protocolo.* Tente novamente.');
          nextStep = resumeFallback;
        }
      }
    } else if (step.action === 'create_custom_order') {
      const phone = normalizePhone(from);
      const customer = await findOrCreateCustomer({ companyId, whatsappNumberId: number.id, phone, preferredName: vars?.nome || null });
      let product = await whatsappRepo.findProductByCompany(companyId, step.productId).catch(() => null);
      if (!product) {
        product = await whatsappRepo.findProductByName(companyId, 'Móvel Sob Medida').catch(() => null)
          ?? (await whatsappRepo.listActiveProducts(companyId, 1))[0] ?? null;
      }
      if (!product) {
        await sendFlowMessage(number, target, '\u{26A0}\u{FE0F} *Nao foi possivel registrar o orcamento.* Nenhum produto de base cadastrado. Fale com um atendente.');
        nextStep = step.next_nao ?? step.next ?? null;
      } else {
        const qty = Number(vars?.orcamento_quantidade) || 1;
        const tipo = vars?.orcamento_tipo || 'Móvel sob medida';
        const specs = {
          tipo, medidas: vars?.orcamento_medidas || '', material: vars?.orcamento_material || '',
          acabamento: vars?.orcamento_acabamento || '', quantidade: qty,
          endereco: vars?.zm_endereco_entrega || vars?.endereco_padrao || 'Retirada no local',
        };
        const cart = Array.isArray(vars.cart) ? vars.cart : [];
        const customName = `${tipo} (${specs.medidas})`;
        const existing = cart.find((i) => i.specs?.tipo === specs.tipo && i.specs?.medidas === specs.medidas);
        if (existing) existing.quantity += qty;
        else cart.push({ productId: product.id, name: customName, price: Number(product.price), quantity: qty, image_url: product.image_url ?? null, specs });
        vars.cart = cart;
        vars.orcamento_custom = true;
        const desc = `\u{1F37D} *Móvel:* ${tipo}\n\u{1F4D0} *Medidas:* ${specs.medidas}\n\u{1FAB5} *Material:* ${specs.material}\n\u{1F3A8} *Acabamento:* ${specs.acabamento}\n\u{1F522} *Qtd:* ${qty}`;
        await sendFlowMessage(number, target, `\u{1F4E6} *${customName}* adicionado ao carrinho!\n\n${desc}`);
        notifyAttendantsAsync({
          companyId,
          title: `Novo orçamento sob medida: ${tipo}`,
          message: `${from} solicitou orçamento.\n\n${desc}\n\nEndereço: ${specs.endereco}`,
          type: 'order',
        });
        nextStep = step.next ?? null;
      }
    } else if (step.action === 'schedule_production') {
      const orderId = vars?.last_order_id;
      if (!orderId) {
        await sendFlowMessage(number, target, '\u{26A0}\u{FE0F} *Nenhum pedido encontrado* para agendar produ\u00e7\u00e3o.');
        nextStep = step.next_nao ?? step.next ?? null;
      } else {
        try {
          const result = await productionService.scheduleOrder(companyId, orderId);
          await sendFlowMessage(number, target, `\u{1F4C5} *Produ\u00e7\u00e3o agendada!*\n\n\u{1F4C5} In\u00edcio: *${productionService.formatDateBR(result.start)}*\n\u{2705} Conclus\u00e3o: *${productionService.formatDateBR(result.completion)}*\n\u{1F69A} Previs\u00e3o entrega: *${productionService.formatDateBR(result.eta)}*`);
          await productionService.sendWorkflowReportToOwner(companyId, number);
          nextStep = step.next ?? null;
        } catch (err) {
          logger.error({ err: err.message, companyId, orderId }, 'schedule_production: erro');
          await sendFlowMessage(number, target, '\u{274C} *Erro ao agendar produ\u00e7\u00e3o.*\n\nUm atendente vai ajudar voc\u00ea.');
          nextStep = step.next_nao ?? step.next ?? null;
        }
      }
    } else if (step.action === 'alert') {
      notifyAttendantsAsync({
        companyId,
        title: step.title || 'Alerta do fluxo',
        message: fillTemplate(step.content ?? '', { ...context, ...vars, mensagem: text || '' }),
        type: step.notificationType ?? 'automation',
        relatedEntityType: 'flow',
        relatedEntityId: flow.id,
      });
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

export async function processIncomingMessage({ companyId, number, from, text, contact, group, media }) {
  if (!number.is_bot_enabled) return null;

  const botCfg = (await whatsappRepo.getBotConfig(companyId).catch(() => ({}))) ?? {};
  if (botCfg?.dev_mode) {
    const sender = canonicalPhone(from);
    const ownNumber = canonicalPhone(number?.phone_number);
    const whitelist = (botCfg.dev_whitelist ?? []).map(canonicalPhone).filter(Boolean);
    if (!(sender && (sender === ownNumber || whitelist.includes(sender)))) {
      logger.info({ companyId, from, reason: 'dev_mode_denied' }, 'bot: modo dev/teste ativo - mensagem ignorada');
      return null;
    }
  }

  const resolvedContact = contact ?? await whatsappRepo.findContactByPhone(companyId, number.id, from);
  const cachedState = await chatbotCache.getFlowState(companyId, from);
  const dbState = resolvedContact?.metadata ?? {};
  let currentState = cachedState ?? dbState;
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
    const priority = Array.isArray(botCfg.flowPriority) && botCfg.flowPriority.length > 0 ? botCfg.flowPriority : null;
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
  if (isResetKeyword(text)) {
    currentState = {};
    if (resolvedContact?.id) await updateContactFlowState(companyId, resolvedContact.id, { flowId: null, flowStep: null, vars: {} });
    await chatbotCache.clearFlowState(companyId, from);
    logger.info({ companyId, from }, 'bot: sessão reiniciada');
  }

  let nextStep = null;

  const matchedTrigger = matchTrigger(config.triggers, text);
  if (matchedTrigger) {
    nextStep = steps.find((s) => s.id === matchedTrigger.step) ?? null;
    if (nextStep) {
      logger.info({ companyId, from, text, keyword: matchedTrigger.keyword, stepId: nextStep.id, flowId: flow.id }, 'bot: trigger matched');
    }
  }

  const resumeStep = findResumeStep(steps);
  const protocolText = String(text || '').trim().toUpperCase();
  const protocolPrefix = config.protocol_prefix ?? botCfg?.protocolPrefix ?? null;
  if (!nextStep && resumeStep && looksLikeProtocol(text, { prefix: protocolPrefix })) {
    currentState = { ...(currentState ?? {}), vars: { ...(currentState?.vars ?? {}), protocolo_input: protocolText } };
    nextStep = resumeStep;
    logger.info({ companyId, from, text }, 'bot: protocolo detectado - retomando atendimento');
  }

  if (!nextStep && currentStepId) {
    const currentStep = steps.find((s) => s.id === currentStepId);
    const replyTo = group?.remoteJid ?? from;

    if (currentStep?.type === 'product') {
      const vars = { ...(currentState.vars ?? {}) };
      if (vars.pendingQtyProduct) {
        const qty = parseQuantity(normalizedText);
        if (qty !== null) {
          const product = await whatsappRepo.findProductByCompany(companyId, vars.pendingQtyProduct).catch(() => null);
          if (product) {
            const cart = Array.isArray(vars.cart) ? vars.cart : [];
            const existing = cart.find((i) => i.productId === product.id);
            if (existing) existing.quantity += qty;
            else cart.push({ productId: product.id, name: product.name, price: Number(product.price), quantity: qty, image_url: product.image_url });
            vars.cart = cart;
            const total = (Number(product.price) * qty).toFixed(2).replace('.', ',');
            await sendFlowMessage(number, replyTo, `Adicionado: ${qty}x *${product.name}* \u2014 R$ ${total}`);
            vars.pendingQtyProduct = null;
            vars.productPending = null;
            currentState.vars = vars;
            nextStep = steps.find((s) => s.id === currentStep.next_sim) ?? null;
          } else {
            vars.pendingQtyProduct = null;
            vars.productPending = null;
            currentState.vars = vars;
            nextStep = steps.find((s) => s.id === currentStep.next_nao) ?? null;
          }
        } else {
          await sendFlowMessage(number, replyTo, 'Quantidade inv\u00e1lida. Digite um n\u00famero (ex.: 2).');
          nextStep = currentStep;
        }
      } else {
        const productReply = classifyProductReply(normalizedText);
        const isSim = productReply === 'sim';
        const isNao = productReply === 'nao';
        const product = vars.productPending ? await whatsappRepo.findProductByCompany(companyId, vars.productPending).catch(() => null) : null;
        if (isSim && product) {
          if (currentStep.askQuantity !== false) {
            vars.pendingQtyProduct = product.id;
            await sendFlowMessage(number, replyTo, `Quantas unidades de *${product.name}*? (digite um n\u00famero)`);
            currentState.vars = vars;
            nextStep = currentStep;
          } else {
            const cart = Array.isArray(vars.cart) ? vars.cart : [];
            cart.push({ productId: product.id, name: product.name, price: Number(product.price), quantity: 1, image_url: product.image_url });
            vars.cart = cart;
            await sendFlowMessage(number, replyTo, `Adicionado: 1x *${product.name}*`);
            vars.productPending = null;
            currentState.vars = vars;
            nextStep = steps.find((s) => s.id === currentStep.next_sim) ?? null;
          }
        } else if (isNao) {
          vars.productPending = null;
          vars.pendingQtyProduct = null;
          currentState.vars = vars;
          nextStep = steps.find((s) => s.id === currentStep.next_nao) ?? null;
        } else {
          if (product) {
            await sendFlowProductCard(number, replyTo, product, {
              title: `Deseja adicionar *${product.name}* ao carrinho?`,
              verb: 'adicionar',
              buttons: ['SIM', 'NAO'],
            });
          }
          nextStep = currentStep;
        }
      }
    } else if (currentStep?.type === 'action' && currentStep.action === 'cart_summary') {
      const vars = { ...(currentState.vars ?? {}) };
      const cartReply = classifyCartSummaryReply(normalizedText);
      if (cartReply === 'finish') {
        vars.cartSummaryPending = false;
        currentState.vars = vars;
        nextStep = steps.find((s) => s.id === currentStep.next) ?? null;
      } else if (cartReply === 'continue') {
        vars.cartSummaryPending = false;
        currentState.vars = vars;
        nextStep = steps.find((s) => s.id === currentStep.next_nao) ?? null;
      } else {
        nextStep = currentStep;
        await sendFlowButtons(number, replyTo, { title: 'O que deseja fazer?', description: null, buttons: ['Finalizar pedido', 'Continuar comprando'] });
      }
    } else if (currentStep?.type === 'question' && currentStep.options) {
      const matched = resolveQuestionOption(currentStep, normalizedText);
      if (matched) {
        nextStep = steps.find((s) => s.id === matched.next) ?? null;
        if (matched.variable) {
          const base = { ...(currentState.vars ?? {}), [matched.variable]: matched.value };
          currentState.vars = base;
        }
      } else if (currentStep.freeTextVariable) {
        // Captura resposta livre (ex.: endereço, nome) sem re-perguntar.
        const base = { ...(currentState.vars ?? {}), [currentStep.freeTextVariable]: text };
        currentState.vars = base;
        nextStep = steps.find((s) => s.id === currentStep.next) ?? null;
      } else {
        const attempts = ((currentState.vars?.questionAttempts) ?? 0) + 1;
        currentState.vars = { ...(currentState.vars ?? {}), questionAttempts: attempts };
        const replyTo = group?.remoteJid ?? from;
        const maxAttempts = botCfg?.maxAttempts ?? 3;
        const transferMsg = botCfg?.transferMessage || 'Não consegui entender. Vou transferir para um atendente.';
        const fallbackMsg = botCfg?.fallbackMessage || 'Desculpe, não entendi. Escolha uma das opções abaixo:';
        if (attempts >= maxAttempts) {
          await sendFlowMessage(number, replyTo, transferMsg);
          if (resolvedContact?.id) await updateContactFlowState(companyId, resolvedContact.id, { flowId: null, flowStep: null, vars: currentState.vars ?? {} });
          await chatbotCache.clearFlowState(companyId, from);
          
          notifyAttendantsAsync({ companyId, title: 'Cliente sem resposta do bot', message: `${from} não entendeu as opções do fluxo: "${text}"`, type: 'message' });
          return { flowId: flow.id, stepId: currentStep.id, nextStepId: null, cacheRead, cleared: true };
        }
        nextStep = currentStep;
        await sendFlowMessage(number, replyTo, fallbackMsg);
      }
    } else {
      nextStep = steps.find((s) => s.id === currentStep.next) ?? null;
    }
  }

  if (!nextStep) {
    nextStep = resolveFallbackStep(steps, config.defaultStep);
  }

  if (!nextStep) return null;

  await automationRepo.incrementMessagesCount(flow.id);

  const state = { flowId: flow.id, flowStep: currentStepId, vars: currentState?.vars ?? {} };
  const replyTo = group?.remoteJid ?? from;
  let result = await executeStep({ companyId, number, from, replyTo, text, contact: resolvedContact, flow, step: nextStep, state, group, media });

  let finalFlowId = flow.id;
  if (result.switchFlow) finalFlowId = result.switchFlow;

  const chainMaxHops = Math.min(Math.max(Number(config.max_hops) || 10, 1), 50);
  let hops = 0;
  while (result.nextStep && !result.clear && !result.switchFlow && hops < chainMaxHops) {
    const chainStep = steps.find((s) => s.id === result.nextStep);
    if (!chainStep) break;
    const needsInput = chainStep.type === 'question'
      || (chainStep.type === 'variable' && chainStep.mode === 'input')
      || (chainStep.type === 'action' && chainStep.action === 'cart_summary');
    if (needsInput) break;
    if (chainStep.type === 'message' || chainStep.type === 'media' || chainStep.type === 'delay') await sleep(600);
    const chainState = { flowId: flow.id, flowStep: result.nextStep, vars: result.vars ?? state.vars };
    result = await executeStep({ companyId, number, from, replyTo, text, contact: resolvedContact, flow, step: chainStep, state: chainState, group, media });
    hops += 1;
    if (result.switchFlow) { finalFlowId = result.switchFlow; break; }
    if (result.clear) break;
    if (chainStep.type === 'product') break;
  }

  if (result.clear) {
    if (resolvedContact?.id) await updateContactFlowState(companyId, resolvedContact.id, { flowId: null, flowStep: null, vars: result.vars ?? {} });
    await chatbotCache.clearFlowState(companyId, from);
  } else {
    const nextState = { flowId: finalFlowId, flowStep: result.nextStep ?? null, vars: result.vars ?? state.vars };
    if (resolvedContact?.id) await updateContactFlowState(companyId, resolvedContact.id, nextState);
    await chatbotCache.setFlowState(companyId, from, nextState);
  }

  try {
    const activeProtocol = (result.vars ?? state.vars)?.protocol;
    const currentConv = await conversationRepo.findConversationByContact(companyId, 'whatsapp', from).catch(() => null);
    const targetConv = activeProtocol
      ? (await conversationRepo.findByProtocol(companyId, String(activeProtocol)).catch(() => null) ?? currentConv)
      : currentConv;
    if (targetConv?.protocol) {
      const snap = { flowId: finalFlowId, flowStep: result.nextStep ?? null, vars: (result.vars ?? state.vars) };
      await conversationRepo.updateConversation(targetConv.id, { flow_snapshot: snap }).catch(() => null);
    } else if (currentConv && !activeProtocol) {
      await conversationRepo.updateConversation(currentConv.id, { flow_snapshot: null }).catch(() => null);
    }
  } catch { /* ignore */ }

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
  findQuickReplyById,
  createQuickReply,
  updateQuickReply,
  deleteQuickReply,
  useQuickReply,
  processIncomingMessage,
  extractMessageText,
  normalizePhone,
  evaluateExpression,
};
