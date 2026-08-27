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
  statusJidList: z.array(z.string().min(10)).optional(),
}).strict();

export const sendStatusMediaSchema = z.object({
  mediaType: z.enum(['image', 'video', 'audio', 'document']),
  mediaUrl: z.string().url('URL da mídia inválida.'),
  caption: z.string().max(1024).optional(),
  statusJidList: z.array(z.string().min(10)).optional(),
}).strict();

export const createGroupSchema = z.object({
  name: z.string().min(2, 'Nome do grupo deve ter pelo menos 2 caracteres.').max(100),
  participants: z.array(z.string().min(10)).optional(),
}).strict();

export const updateGroupSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  action: z.enum(['announcement', 'restrict']).optional(),
  value: z.boolean().optional(),
}).strict();

export const groupActionSchema = z.object({
  phone: z.string().min(10, 'Número inválido.'),
}).strict();

export const inviteCodeSchema = z.object({
  code: z.string().min(1, 'Código de convite é obrigatório.'),
}).strict();

export const groupPictureSchema = z.object({
  picture: z.string().min(10, 'Imagem inválida (base64).'),
}).strict();

export const reactStatusSchema = z.object({
  statusId: z.string().min(1),
  reaction: z.string().min(1).max(50),
}).strict();

export const findChatSchema = z.object({
  chatId: z.string().min(1),
}).strict();

export const createChatSchema = z.object({
  number: z.string().min(10, 'Número inválido.'),
}).strict();

export const checkNumberSchema = z.object({
  number: z.string().min(10, 'Número inválido.'),
}).strict();

export const sendPollSchema = z.object({
  number: z.string().min(1),
  name: z.string().min(1, 'Pergunta da enquete é obrigatória.').max(255),
  values: z.array(z.string().min(1)).min(2, 'Mínimo de 2 opções').max(12, 'Máximo de 12 opções'),
}).strict();

export const editMessageSchema = z.object({
  number: z.string().min(1),
  messageId: z.string().min(1),
  text: z.string().min(1).max(4096),
}).strict();

export const deleteMessageSchema = z.object({
  number: z.string().min(1),
  messageId: z.string().min(1),
  forEveryone: z.boolean().optional(),
}).strict();

export const linkPreviewSchema = z.object({
  number: z.string().min(1),
  url: z.string().url('URL inválida.'),
  title: z.string().max(255).optional(),
  description: z.string().max(1024).optional(),
  image: z.string().optional(),
}).strict();

export const sendBase64Schema = z.object({
  number: z.string().min(1),
  mediaType: z.enum(['image', 'video', 'audio', 'document']).optional(),
  base64: z.string().min(1, 'Base64 é obrigatório.'),
  fileName: z.string().max(255).optional(),
}).strict();

export const sendBulkSchema = z.object({
  messages: z.array(z.object({
    number: z.string().min(10),
    text: z.string().min(1).max(4096),
    delay: z.number().int().min(0).max(10000).optional(),
  })).min(1, 'Pelo menos 1 mensagem é obrigatória.').max(5000, 'Máximo 5000 mensagens.'),
}).strict();

export const typewriterSchema = z.object({
  number: z.string().min(1),
  text: z.string().min(1).max(4096),
}).strict();

export const sendContactSchema = z.object({
  number: z.string().min(1),
  name: z.string().min(1).max(255),
  phone: z.string().min(10),
}).strict();

export const profilePictureSchema = z.object({
  number: z.string().min(1),
}).strict();

export const profileNameSchema = z.object({
  number: z.string().min(1),
}).strict();

export const requestPairingSchema = z.object({
  phone: z.string().min(10),
}).strict();

export const changeNumberSchema = z.object({
  number: z.string().min(10),
}).strict();

export const botConfigSchema = z.object({
  mode: z.enum(['public', 'private', 'customers_only']).optional(),
  greeting: z.string().max(500).optional(),
}).strict();

export const updateProfileStatusSchema = z.object({
  status: z.string().min(1).max(255),
}).strict();

export const catalogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
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
  createGroupSchema,
  updateGroupSchema,
  groupActionSchema,
  inviteCodeSchema,
  groupPictureSchema,
  reactStatusSchema,
  findChatSchema,
  createChatSchema,
  checkNumberSchema,
  sendPollSchema,
  editMessageSchema,
  deleteMessageSchema,
  sendContactSchema,
  profilePictureSchema,
  profileNameSchema,
  botConfigSchema,
  updateProfileStatusSchema,
  catalogQuerySchema,
};