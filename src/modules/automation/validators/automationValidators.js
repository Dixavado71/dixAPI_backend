import { z } from 'zod';

const optionSchema = z.object({
  label: z.string().min(1).max(100),
  value: z.string().min(1).max(100),
  next: z.string().nullable().optional(),
  variable: z.string().min(1).max(50).optional(),
});

const flowStepSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['message', 'question', 'condition', 'action', 'media', 'forward', 'delay', 'webhook', 'variable', 'group', 'flow', 'catalog', 'product', 'end']),
  content: z.string().max(2048).optional(),
  next: z.string().nullable().optional(),
  next_false: z.string().nullable().optional(),
  next_sim: z.string().nullable().optional(),
  next_nao: z.string().nullable().optional(),
  next_empty: z.string().nullable().optional(),
  else: z.string().nullable().optional(),
  options: z.array(optionSchema).optional(),
  action: z.string().optional(),
  expression: z.string().max(500).optional(),
  condition: z.object({
    expression: z.string().max(500).optional(),
  }).optional(),
  media: z.object({
    type: z.enum(['image', 'document', 'video', 'audio', 'sticker']).optional(),
    url: z.string().url('URL da mídia inválida.').optional(),
    caption: z.string().max(1024).optional(),
  }).optional(),
  limit: z.number().int().min(1).max(50).optional(),
  delayMs: z.number().int().min(0).max(60000).optional(),
  target: z.string().max(40).optional(),
  targetJid: z.string().max(100).optional(),
  group: z.object({
    remoteJid: z.string().max(100).optional(),
  }).optional(),
  variable: z.string().min(1).max(50).optional(),
  mode: z.enum(['input', 'value']).optional(),
  value: z.string().max(500).optional(),
  targetFlow: z.string().max(100).optional(),
  flowId: z.string().max(100).optional(),
  url: z.string().url('URL inválida.').optional(),
  method: z.enum(['POST', 'GET', 'PUT', 'PATCH']).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  responseVar: z.string().max(50).optional(),
  title: z.string().max(255).optional(),
  notificationType: z.string().max(30).optional(),
  style: z.enum(['text', 'cards']).optional(),
  productId: z.string().uuid('Produto inválido.').optional(),
  productSource: z.enum(['featured', 'catalog']).optional(),
  askQuantity: z.boolean().optional(),
  paymentMethod: z.string().max(30).optional(),
});

const flowTriggerSchema = z.object({
  keyword: z.string().min(1).max(100),
  step: z.string().min(1),
});

export const createFlowSchema = z.object({
  name: z.string().min(2, 'Nome do fluxo deve ter pelo menos 2 caracteres.').max(100),
  type: z.enum(['vendas', 'suporte', 'marketing']),
  description: z.string().max(500).optional(),
  iconEmoji: z.string().max(10).optional(),
  isActive: z.boolean().optional(),
  config: z.object({
    steps: z.array(flowStepSchema).min(1, 'O fluxo deve ter pelo menos 1 passo.'),
    triggers: z.array(flowTriggerSchema).optional(),
    defaultStep: z.string().optional(),
  }),
}).strict();

export const updateFlowSchema = createFlowSchema.partial();

export const importFlowSchema = createFlowSchema;

export const testFlowSchema = z.object({
  vars: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  stepId: z.string().optional(),
}).strict();

export const createQuickReplySchema = z.object({
  shortcut: z.string().min(1, 'Atalho é obrigatório.').max(50),
  messageText: z.string().min(1, 'Mensagem é obrigatória.').max(1024),
}).strict();

export const updateQuickReplySchema = createQuickReplySchema.partial();

export default { createFlowSchema, updateFlowSchema, testFlowSchema, createQuickReplySchema, updateQuickReplySchema };
