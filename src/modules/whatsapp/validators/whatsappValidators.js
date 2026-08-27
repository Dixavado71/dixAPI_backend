import { z } from 'zod';

export const connectNumberSchema = z.object({
  phoneNumber: z.string().regex(/^\d{10,15}$/, 'Número deve ter entre 10 e 15 dígitos.'),
  displayName: z.string().min(2).max(50).optional(),
}).strict();

export const sendMessageSchema = z.object({
  to: z.string().min(10, 'Destino inválido.').max(40, 'Destino inválido.'),
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

export const sendAudioSchema = z.object({
  to: z.string().regex(/^\d{10,15}$/, 'Número de destino inválido.'),
  audioUrl: z.string().url('URL do áudio inválida.'),
  delay: z.number().int().min(0).max(10000).optional(),
}).strict();

export const sendDocumentSchema = z.object({
  to: z.string().regex(/^\d{10,15}$/, 'Número de destino inválido.'),
  documentUrl: z.string().url('URL do documento inválida.'),
  caption: z.string().max(1024).optional(),
  fileName: z.string().max(255).optional(),
  delay: z.number().int().min(0).max(10000).optional(),
}).strict();

export const sendVideoSchema = z.object({
  to: z.string().regex(/^\d{10,15}$/, 'Número de destino inválido.'),
  videoUrl: z.string().url('URL do vídeo inválida.'),
  caption: z.string().max(1024).optional(),
  delay: z.number().int().min(0).max(10000).optional(),
}).strict();

export const sendStickerSchema = z.object({
  to: z.string().regex(/^\d{10,15}$/, 'Número de destino inválido.'),
  stickerUrl: z.string().url('URL do sticker inválida.'),
  delay: z.number().int().min(0).max(10000).optional(),
}).strict();

export const sendButtonsSchema = z.object({
  to: z.string().regex(/^\d{10,15}$/, 'Número de destino inválido.'),
  title: z.string().min(1).max(255),
  description: z.string().max(1024).optional(),
  buttons: z.array(z.string().min(1).max(80)).min(1).max(3),
  footer: z.string().max(255).optional(),
  delay: z.number().int().min(0).max(10000).optional(),
}).strict();

export const sendListSchema = z.object({
  to: z.string().regex(/^\d{10,15}$/, 'Número de destino inválido.'),
  title: z.string().min(1).max(255),
  description: z.string().max(1024).optional(),
  buttonText: z.string().min(1).max(60).default('Escolha uma opção'),
  sections: z.array(z.object({
    title: z.string().min(1).max(255),
    rows: z.array(z.object({
      title: z.string().min(1).max(255),
      description: z.string().max(1024).optional(),
      id: z.string().max(255).optional(),
    })).min(1).max(10),
  })).min(1).max(3),
  delay: z.number().int().min(0).max(10000).optional(),
}).strict();

export const sendLocationSchema = z.object({
  to: z.string().regex(/^\d{10,15}$/, 'Número de destino inválido.'),
  name: z.string().max(255).optional(),
  address: z.string().max(1024).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  delay: z.number().int().min(0).max(10000).optional(),
}).strict();

export const sendReactionSchema = z.object({
  to: z.string().regex(/^\d{10,15}$/, 'Número de destino inválido.'),
  messageId: z.string().min(1, 'ID da mensagem é obrigatório.'),
  reaction: z.string().min(1).max(50),
}).strict();

export const markAsReadSchema = z.object({
  to: z.string().regex(/^\d{10,15}$/, 'Número de destino inválido.'),
  messageId: z.string().min(1, 'ID da mensagem é obrigatório.'),
}).strict();

export const presenceSchema = z.object({
  to: z.string().regex(/^\d{10,15}$/, 'Número de destino inválido.').optional(),
  presence: z.enum(['available', 'unavailable', 'composing', 'recording', 'paused']).optional(),
}).strict();

export const checkNumberSchema = z.object({
  number: z.string().regex(/^\d{10,15}$/, 'Número inválido.'),
}).strict();

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50),
}).strict();

export const updateProfilePictureSchema = z.object({
  picture: z.string().min(10, 'Imagem inválida (base64).'),
}).strict();

export const chatMessagesQuerySchema = z.object({
  chatId: z.string().min(1, 'chatId é obrigatório.'),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const sendStatusSchema = z.object({
  content: z.string().min(1, 'Conteúdo do status obrigatório.').max(4096),
}).strict();

export const sendStatusMediaSchema = z.object({
  mediaType: z.enum(['image', 'video', 'audio', 'document']),
  mediaUrl: z.string().url('URL da mídia inválida.'),
  caption: z.string().max(1024).optional(),
}).strict();

export const presenceUpdateSchema = z.object({
  presence: z.enum(['available', 'unavailable', 'composing', 'recording', 'paused']).optional(),
  to: z.string().optional(),
}).strict();

export default {
  connectNumberSchema,
  sendMessageSchema,
  sendMediaSchema,
  sendAudioSchema,
  sendDocumentSchema,
  sendVideoSchema,
  sendStickerSchema,
  sendButtonsSchema,
  sendListSchema,
  sendLocationSchema,
  sendReactionSchema,
  markAsReadSchema,
  presenceSchema,
  updateProfileSchema,
  updateProfilePictureSchema,
  chatMessagesQuerySchema,
  sendStatusSchema,
  sendStatusMediaSchema,
  presenceUpdateSchema,
};