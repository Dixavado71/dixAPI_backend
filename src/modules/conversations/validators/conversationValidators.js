import { z } from 'zod';

export const updateConversationStatusSchema = z.object({
  status: z.enum(['open', 'closed', 'waiting']),
}).strict();

export const assignConversationSchema = z.object({
  userId: z.string().uuid('Usuário inválido.'),
}).strict();

export const sendReplySchema = z.object({
  text: z.string().min(1, 'Mensagem não pode estar vazia.').max(4096),
}).strict();

export default { updateConversationStatusSchema, assignConversationSchema, sendReplySchema };