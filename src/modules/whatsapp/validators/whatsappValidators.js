import { z } from 'zod';

export const connectNumberSchema = z.object({
  phoneNumber: z.string().regex(/^\d{10,15}$/, 'Número deve ter entre 10 e 15 dígitos.'),
  displayName: z.string().min(2).max(50).optional(),
}).strict();

export const sendMessageSchema = z.object({
  to: z.string().regex(/^\d{10,15}$/, 'Número de destino inválido.'),
  text: z.string().min(1, 'Mensagem não pode estar vazia.').max(4096),
  delay: z.number().int().min(0).max(10000).optional(),
}).strict();

export const sendMediaSchema = z.object({
  to: z.string().regex(/^\d{10,15}$/, 'Número de destino inválido.'),
  mediaType: z.enum(['image', 'document', 'video', 'audio']),
  mediaUrl: z.string().url('URL da mídia inválida.'),
  caption: z.string().max(1024).optional(),
  delay: z.number().int().min(0).max(10000).optional(),
}).strict();

export default { connectNumberSchema, sendMessageSchema, sendMediaSchema };