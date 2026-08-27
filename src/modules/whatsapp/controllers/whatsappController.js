import * as whatsappService from '../services/whatsappService.js';
import {
  connectNumberSchema, sendMessageSchema, sendMediaSchema, sendAudioSchema, sendDocumentSchema,
  sendVideoSchema, sendStickerSchema, sendButtonsSchema, sendListSchema, sendLocationSchema,
  sendReactionSchema, markAsReadSchema, presenceSchema, updateProfileSchema,
  updateProfilePictureSchema, chatMessagesQuerySchema, sendStatusSchema, sendStatusMediaSchema,
  createGroupSchema, updateGroupSchema, groupActionSchema, inviteCodeSchema, groupPictureSchema,
  reactStatusSchema, findChatSchema, createChatSchema, checkNumberSchema, sendPollSchema,
  editMessageSchema, deleteMessageSchema, sendContactSchema, profilePictureSchema, profileNameSchema,
  botConfigSchema, updateProfileStatusSchema, catalogQuerySchema,
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

/* ===== Groups ===== */

export async function createGroup(req, res, next) {
  try { const data = createGroupSchema.parse(req.body); const result = await whatsappService.createGroup(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); }
  catch (error) { return next(error); }
}

export async function getGroups(req, res, next) {
  try { const result = await whatsappService.listGroups(req.tenant.companyId, req.params.id); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function getGroup(req, res, next) {
  try { const result = await whatsappService.findGroup(req.tenant.companyId, req.params.id, req.params.groupId); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function updateGroup(req, res, next) {
  try { const data = updateGroupSchema.parse(req.body); const result = await whatsappService.updateGroup(req.tenant.companyId, req.params.id, req.params.groupId, data); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function groupSettings(req, res, next) {
  try { const data = updateGroupSchema.parse(req.body); const result = await whatsappService.groupSettings(req.tenant.companyId, req.params.id, req.params.groupId, data); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function addGroupParticipant(req, res, next) {
  try { const data = groupActionSchema.parse(req.body); const result = await whatsappService.addParticipant(req.tenant.companyId, req.params.id, req.params.groupId, data); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function removeGroupParticipant(req, res, next) {
  try { const data = groupActionSchema.parse(req.body); const result = await whatsappService.removeParticipant(req.tenant.companyId, req.params.id, req.params.groupId, data); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function promoteGroupParticipant(req, res, next) {
  try { const data = groupActionSchema.parse(req.body); const result = await whatsappService.promoteParticipant(req.tenant.companyId, req.params.id, req.params.groupId, data); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function demoteGroupParticipant(req, res, next) {
  try { const data = groupActionSchema.parse(req.body); const result = await whatsappService.demoteParticipant(req.tenant.companyId, req.params.id, req.params.groupId, data); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function getInviteLink(req, res, next) {
  try { const result = await whatsappService.inviteLink(req.tenant.companyId, req.params.id, req.params.groupId); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function revokeInviteLink(req, res, next) {
  try { const result = await whatsappService.revokeInvite(req.tenant.companyId, req.params.id, req.params.groupId); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function acceptInviteCode(req, res, next) {
  try { const data = inviteCodeSchema.parse(req.body); const result = await whatsappService.acceptInvite(req.tenant.companyId, req.params.id, data); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function updateGroupPicture(req, res, next) {
  try { const data = groupPictureSchema.parse(req.body); const result = await whatsappService.groupPicture(req.tenant.companyId, req.params.id, req.params.groupId, data); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function leaveGroup(req, res, next) {
  try { const result = await whatsappService.leaveGroup(req.tenant.companyId, req.params.id, req.params.groupId); return successResponse(res, result); }
  catch (error) { return next(error); }
}

/* ===== Status / Stories ===== */

export async function getStories(req, res, next) {
  try { const result = await whatsappService.listStatus(req.tenant.companyId, req.params.id); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function getStoryById(req, res, next) {
  try { const result = await whatsappService.getStatusById(req.tenant.companyId, req.params.id, req.params.statusId); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function reactStory(req, res, next) {
  try { const data = reactStatusSchema.parse(req.body); const result = await whatsappService.reactStatus(req.tenant.companyId, req.params.id, data); return successResponse(res, result); }
  catch (error) { return next(error); }
}

/* ===== Chats (extra) ===== */

export async function findChat(req, res, next) {
  try { const data = findChatSchema.parse(req.body); const result = await whatsappService.findChat(req.tenant.companyId, req.params.id, data); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function archiveChat(req, res, next) {
  try { const result = await whatsappService.archiveChat(req.tenant.companyId, req.params.id, req.params.chatId); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function unarchiveChat(req, res, next) {
  try { const result = await whatsappService.unarchiveChat(req.tenant.companyId, req.params.id, req.params.chatId); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function fetchAllMessages(req, res, next) {
  try { const result = await whatsappService.fetchAllMessages(req.tenant.companyId, req.params.id, req.params.chatId); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function checkNumber(req, res, next) {
  try { const data = checkNumberSchema.parse(req.body); const result = await whatsappService.checkNumber(req.tenant.companyId, req.params.id, data); return successResponse(res, result); }
  catch (error) { return next(error); }
}

/* ===== Messages (advanced) ===== */

export async function sendPoll(req, res, next) {
  try { const data = sendPollSchema.parse(req.body); const result = await whatsappService.sendPoll(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); }
  catch (error) { return next(error); }
}

export async function editMessage(req, res, next) {
  try { const data = editMessageSchema.parse(req.body); const result = await whatsappService.editMessage(req.tenant.companyId, req.params.id, data); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function deleteMessage(req, res, next) {
  try { const data = deleteMessageSchema.parse(req.body); const result = await whatsappService.deleteMessage(req.tenant.companyId, req.params.id, data); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function sendContact(req, res, next) {
  try { const data = sendContactSchema.parse(req.body); const result = await whatsappService.sendContact(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); }
  catch (error) { return next(error); }
}

/* ===== Profile ===== */

export async function getProfilePicture(req, res, next) {
  try { const data = profilePictureSchema.parse(req.body); const result = await whatsappService.getProfilePicture(req.tenant.companyId, req.params.id, data); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function getProfileName(req, res, next) {
  try { const data = profileNameSchema.parse(req.body); const result = await whatsappService.getProfileName(req.tenant.companyId, req.params.id, data); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function updateProfileStatus(req, res, next) {
  try { const data = updateProfileStatusSchema.parse(req.body); const result = await whatsappService.updateProfileStatus(req.tenant.companyId, req.params.id, data); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function getBotConfig(req, res, next) {
  try { const result = await whatsappService.getBotConfig(req.tenant.companyId, req.params.id); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function updateBotConfig(req, res, next) {
  try { const data = botConfigSchema.parse(req.body); const result = await whatsappService.updateBotConfig(req.tenant.companyId, req.params.id, data); return successResponse(res, result); }
  catch (error) { return next(error); }
}

export async function getCatalog(req, res, next) {
  try { const query = catalogQuerySchema.parse(req.query); const result = await whatsappService.getCatalog(req.tenant.companyId, req.params.id, query.limit); return successResponse(res, result); }
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
  createGroup, getGroups, getGroup, updateGroup, groupSettings, addGroupParticipant, removeGroupParticipant,
  promoteGroupParticipant, demoteGroupParticipant, getInviteLink, revokeInviteLink, acceptInviteCode,
  updateGroupPicture, leaveGroup,
  getStories, getStoryById, reactStory,
  findChat, archiveChat, unarchiveChat, fetchAllMessages, checkNumber,
  sendPoll, editMessage, deleteMessage, sendContact,
  getProfilePicture, getProfileName, updateProfileStatus, getBotConfig, updateBotConfig, getCatalog,
  updateProfile, updatePicture, restartNumber, logoutNumber, getWebhook, setupWebhook, webhook,
};