import { z } from 'zod';

export const triggerSchema = z.object({
  event: z.string().min(1, 'Evento é obrigatório').max(100),
  channel: z.enum(['app', 'wpp', 'both']).optional(),
  recipientRule: z.record(z.unknown()).nullable().optional(),
  template: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
}).strict();

export const triggerUpdateSchema = triggerSchema.partial();