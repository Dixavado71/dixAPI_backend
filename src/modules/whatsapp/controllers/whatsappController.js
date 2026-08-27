import * as whatsappService from '../services/whatsappService.js';
import {
  connectNumberSchema, sendMessageSchema, sendMediaSchema, sendAudioSchema, sendDocumentSchema,
  sendVideoSchema, sendStickerSchema, sendButtonsSchema, sendListSchema, sendLocationSchema,
  sendReactionSchema, markAsReadSchema, presenceSchema, updateProfileSchema,
  updateProfilePictureSchema, chatMessagesQuerySchema, sendStatusSchema, sendStatusMediaSchema,
} from '../validators/whatsappValidators.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';

export async function listNumbers(req, res, next) {
  try { const data = await whatsappService.listNumbers(req.tenant.companyId); return successResponse(res, data); }
  catch (error) { return next(error); }
}

export async function connectNumber(req, res, next) {
  try { const data = connectNumberSchema.parse(req.body); const result = await whatsappService.connectNumber(req.tenant.companyId, data); return createdResponse(res, result); }
  catch (error) { return next(error); }
}

export async function getQrCode(req, res, next) {
  try { const result = await whatsappService.getQrCode(req.tenant.companyId, req.params.id); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function getStatus(req, res, next) {
  try { const result = await whatsappService.getStatus(req.tenant.companyId, req.params.id); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function disconnectNumber(req, res, next) {
  try { const result = await whatsappService.disconnectNumber(req.tenant.companyId, req.params.id); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function deleteNumber(req, res, next) {
  try { const result = await whatsappService.deleteNumber(req.tenant.companyId, req.params.id); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function sendMessage(req, res, next) {
  try { const data = sendMessageSchema.parse(req.body); const result = await whatsappService.sendMessage(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); }
  catch (error) { return next(error); }
}

export async function sendMedia(req, res, next) {
  try { const data = sendMediaSchema.parse(req.body); const result = await whatsappService.sendMedia(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); }
  catch (error) { return next(error); }
}

export async function sendAudio(req, res, next) {
  try { const data = sendAudioSchema.parse(req.body); const result = await whatsappService.sendAudioMessage(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); }
  catch (error) { return next(error); }
}

export async function sendDocument(req, res, next) {
  try { const data = sendDocumentSchema.parse(req.body); const result = await whatsappService.sendDocumentMessage(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); }
  catch (error) { return next(error); }
}

export async function sendVideo(req, res, next) {
  try { const data = sendVideoSchema.parse(req.body); const result = await whatsappService.sendVideoMessage(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); }
  catch (error) { return next(error); }
}

export async function sendSticker(req, res, next) {
  try { const data = sendStickerSchema.parse(req.body); const result = await whatsappService.sendStickerMessage(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); }
  catch (error) { return next(error); }
}

export async function sendButtons(req, res, next) {
  try { const data = sendButtonsSchema.parse(req.body); const result = await whatsappService.sendButtonsMessage(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); }
  catch (error) { return next(error); }
}

export async function sendList(req, res, next) {
  try { const data = sendListSchema.parse(req.body); const result = await whatsappService.sendListMessage(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); }
  catch (error) { return next(error); }
}

export async function sendLocation(req, res, next) {
  try { const data = sendLocationSchema.parse(req.body); const result = await whatsappService.sendLocationMessage(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); }
  catch (error) { return next(error); }
}

export async function sendReaction(req, res, next) {
  try { const data = sendReactionSchema.parse(req.body); const result = await whatsappService.sendReactionMessage(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); }
  catch (error) { return next(error); }
}

export async function sendStatus(req, res, next) {
  try { const data = sendStatusSchema.parse(req.body); const result = await whatsappService.sendStatus(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); }
  catch (error) { return next(error); }
}

export async function sendStatusMedia(req, res, next) {
  try { const data = sendStatusMediaSchema.parse(req.body); const result = await whatsappService.sendStatusMedia(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); }
  catch (error) { return next(error); }
}

export async function markRead(req, res, next) {
  try { const data = markAsReadSchema.parse(req.body); const result = await whatsappService.markAsRead(req.tenant.companyId, req.params.id, data); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function typing(req, res, next) {
  try { const data = presenceSchema.parse(req.body); const result = await whatsappService.setTyping(req.tenant.companyId, req.params.id, data); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function presence(req, res, next) {
  try { const data = presenceSchema.parse(req.body); const result = await whatsappService.setOnlinePresence(req.tenant.companyId, req.params.id, data); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function getChats(req, res, next) {
  try { const result = await whatsappService.listChats(req.tenant.companyId, req.params.id); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function getChatMessages(req, res, next) {
  try { const query = chatMessagesQuerySchema.parse(req.query); const result = await whatsappService.listChatMessages(req.tenant.companyId, req.params.id, query.chatId, query.limit); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function updateProfile(req, res, next) {
  try { const data = updateProfileSchema.parse(req.body); const result = await whatsappService.updateProfile(req.tenant.companyId, req.params.id, data); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function updatePicture(req, res, next) {
  try { const data = updateProfilePictureSchema.parse(req.body); const result = await whatsappService.updateProfilePicture(req.tenant.companyId, req.params.id, data); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function restartNumber(req, res, next) {
  try { const result = await whatsappService.restartInstance(req.tenant.companyId, req.params.id); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function logoutNumber(req, res, next) {
  try { const result = await whatsappService.logoutOnly(req.tenant.companyId, req.params.id); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function getWebhook(req, res, next) {
  try { const result = await whatsappService.getInstanceWebhook(req.tenant.companyId, req.params.id); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function setupWebhook(req, res, next) {
  try { const result = await whatsappService.updateInstanceWebhook(req.tenant.companyId, req.params.id); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function webhook(req, res, next) {
  try { await whatsappService.handleWebhook(req.params.instanceName, req.body); return res.status(200).json({ success: true }); }
  catch (error) { return next(error); }
}

export default {
  listNumbers, connectNumber, getQrCode, getStatus, disconnectNumber, deleteNumber,
  sendMessage, sendMedia, sendAudio, sendDocument, sendVideo, sendSticker,
  sendButtons, sendList, sendLocation, sendReaction, sendStatus, sendStatusMedia, markRead, typing, presence,
  getChats, getChatMessages,
  updateProfile, updatePicture, restartNumber, logoutNumber, getWebhook, setupWebhook, webhook,
};