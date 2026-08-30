import { z } from 'zod';

// Aceita telefone puro (10-15 dígitos) ou JID completo (@lid, @s.whatsapp.net, @c.us, @g.us)
const destinationSchema = z.string().regex(/^(\d{10,15}|[^@\s]+@(lid|s\.whatsapp\.net|c\.us|g\.us))$/, 'Número de destino inválido.');

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
  to: destinationSchema,
  mediaType: z.enum(['image', 'document', 'video', 'audio']),
  mediaUrl: z.string().url('URL da mídia inválida.'),
  caption: z.string().max(1024).optional(),
  delay: z.number().int().min(0).max(10000).optional(),
}).strict();

export const sendAudioSchema = z.object({
  to: destinationSchema,
  audioUrl: z.string().url('URL do áudio inválida.'),
  delay: z.number().int().min(0).max(10000).optional(),
}).strict();

export const sendDocumentSchema = z.object({
  to: destinationSchema,
  documentUrl: z.string().url('URL do documento inválida.'),
  caption: z.string().max(1024).optional(),
  fileName: z.string().max(255).optional(),
  delay: z.number().int().min(0).max(10000).optional(),
}).strict();

export const sendVideoSchema = z.object({
  to: destinationSchema,
  videoUrl: z.string().url('URL do vídeo inválida.'),
  caption: z.string().max(1024).optional(),
  delay: z.number().int().min(0).max(10000).optional(),
}).strict();

export const sendStickerSchema = z.object({
  to: destinationSchema,
  stickerUrl: z.string().url('URL do sticker inválida.'),
  delay: z.number().int().min(0).max(10000).optional(),
}).strict();

export const sendButtonsSchema = z.object({
  to: destinationSchema,
  title: z.string().min(1).max(255),
  description: z.string().max(1024).optional(),
  buttons: z.array(z.string().min(1).max(80)).min(1).max(3),
  footer: z.string().max(255).optional(),
  delay: z.number().int().min(0).max(10000).optional(),
}).strict();

export const sendListSchema = z.object({
  to: destinationSchema,
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
  to: destinationSchema,
  name: z.string().max(255).optional(),
  address: z.string().max(1024).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  delay: z.number().int().min(0).max(10000).optional(),
}).strict();

export const sendReactionSchema = z.object({
  to: destinationSchema,
  messageId: z.string().min(1, 'ID da mensagem é obrigatório.'),
  reaction: z.string().min(1).max(50),
}).strict();

export const markAsReadSchema = z.object({
  to: destinationSchema,
  messageId: z.string().min(1, 'ID da mensagem é obrigatório.'),
}).strict();

export const presenceSchema = z.object({
  to: destinationSchema.optional(),
  presence: z.enum(['available', 'unavailable', 'composing', 'recording', 'paused']).optional(),
}).strict();

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  flowId: z.string().uuid().nullable().optional(),
}).strict().refine((v) => v.name !== undefined || v.flowId !== undefined, { message: 'Informe name ou flowId.' });

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
  number: z.string().min(1).optional(),
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
  greeting: z.string().max(500).nullable().optional(),
  forwardTo: z.string().max(20).nullable().optional(),
  forwardMessage: z.string().max(500).nullable().optional(),
  segment: z.enum(['delivery_food', 'retail', 'services']).optional(),
  ownerPhone: z.string().max(20).nullable().optional(),
  kitchenPhone: z.string().max(20).nullable().optional(),
  atendentePhone: z.string().max(20).nullable().optional(),
  flowPriority: z.array(z.enum(['vendas', 'suporte', 'marketing'])).optional(),
  fallbackMessage: z.string().max(500).nullable().optional(),
  transferMessage: z.string().max(500).nullable().optional(),
  maxAttempts: z.number().int().min(1).max(10).optional(),
  dev_mode: z.boolean().optional(),
  dev_whitelist: z.array(z.string().max(20)).optional(),
  templates: z.record(z.string(), z.object({
    to: z.string().optional(),
    message: z.string().optional(),
  })).optional(),
}).strict();

export const updateProfileStatusSchema = z.object({
  status: z.string().min(1).max(255),
}).strict();

export const catalogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
}).strict();

export const forwardRuleSchema = z.object({
  mode: z.enum(['fixed', 'operator', 'group', 'round_robin']),
  phone: z.string().max(20).nullable().optional(),
  attendantId: z.string().uuid().nullable().optional(),
  attendantRole: z.enum(['admin', 'manager', 'operator']).nullable().optional(),
  roles: z.array(z.enum(['admin', 'manager', 'operator'])).optional(),
}).strict();

export const linkGroupSchema = z.object({
  remoteJid: z.string().min(1, 'remoteJid do grupo é obrigatório.').max(100),
  subject: z.string().max(255).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
  flowId: z.string().uuid().nullable().optional(),
  forwardRule: forwardRuleSchema.nullable().optional(),
  forwardMedia: z.boolean().optional(),
  forwardPrefix: z.string().max(500).nullable().optional(),
}).strict();

export const updateLinkedGroupSchema = linkGroupSchema.partial();

export const syncLinkedGroupsSchema = z.object({
  groups: z.array(z.object({
    remoteJid: z.string().min(1).max(100),
    subject: z.string().max(255).nullable().optional(),
    description: z.string().max(500).nullable().optional(),
  })).optional(),
}).strict();

export const messageLogsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  event: z.enum(['group_forward', 'media_forward', 'flow_action', 'alert', 'unknown']).optional(),
  status: z.string().max(20).optional(),
}).strict();

export const blockContactSchema = z.object({
  number: z.string().min(1),
  action: z.enum(['block', 'unblock']),
}).strict();

export const sendTemplateSchema = z.object({
  number: z.string().min(1),
  template: z.record(z.unknown()),
}).strict();

export const sendPtvSchema = z.object({
  number: z.string().min(1),
  videoUrl: z.string().url('URL do vídeo inválida.'),
  caption: z.string().max(1024).optional(),
}).strict();

export const ephemeralSchema = z.object({
  groupJid: z.string().min(1),
  expiration: z.number().int().min(0).max(86400),
}).strict();

export const groupInviteInfoSchema = z.object({
  inviteCode: z.string().min(1).max(255),
}).strict();

export const sendGroupInviteSchema = z.object({
  groupJid: z.string().min(1),
  numbers: z.array(z.string().min(1)).min(1).max(100),
  description: z.string().max(1024).optional(),
}).strict();

export const findContactsSchema = z.object({
  where: z.record(z.unknown()).optional(),
}).strict();

export const fetchBusinessProfileSchema = z.object({
  number: z.string().min(1),
}).strict();

export const typewriterActionSchema = z.object({
  number: z.string().min(1),
  text: z.string().min(1).max(4096),
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
  forwardRuleSchema,
  linkGroupSchema,
  updateLinkedGroupSchema,
  syncLinkedGroupsSchema,
  messageLogsQuerySchema,
  blockContactSchema,
  sendTemplateSchema,
  sendPtvSchema,
  ephemeralSchema,
  groupInviteInfoSchema,
  sendGroupInviteSchema,
  findContactsSchema,
  fetchBusinessProfileSchema,
  typewriterActionSchema,
};