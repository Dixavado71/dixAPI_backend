import { z } from 'zod';

const flowStepSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['message', 'question', 'condition', 'action']),
  content: z.string().max(2048).optional(),
  options: z.array(z.object({
    label: z.string().min(1).max(100),
    value: z.string().min(1).max(100),
    next: z.string().nullable().optional(),
  })).optional(),
  action: z.string().optional(),
  next: z.string().nullable().optional(),
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

export const createQuickReplySchema = z.object({
  shortcut: z.string().min(1, 'Atalho é obrigatório.').max(50),
  messageText: z.string().min(1, 'Mensagem é obrigatória.').max(1024),
}).strict();

export const updateQuickReplySchema = createQuickReplySchema.partial();

export default { createFlowSchema, updateFlowSchema, createQuickReplySchema, updateQuickReplySchema };