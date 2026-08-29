import * as whatsappService from '../services/whatsappService.js';
import { listOrderNotificationLogs } from '../../notifications/repositories/notificationRepository.js';
import {
  connectNumberSchema, sendMessageSchema, sendMediaSchema, sendAudioSchema, sendDocumentSchema,
  sendVideoSchema, sendStickerSchema, sendButtonsSchema, sendListSchema, sendLocationSchema,
  sendReactionSchema, markAsReadSchema, presenceSchema, updateProfileSchema,
  updateProfilePictureSchema, chatMessagesQuerySchema, sendStatusSchema, sendStatusMediaSchema,
  createGroupSchema, updateGroupSchema, groupActionSchema, inviteCodeSchema, groupPictureSchema,
  reactStatusSchema, findChatSchema, createChatSchema, checkNumberSchema, sendPollSchema,
  editMessageSchema, deleteMessageSchema, sendContactSchema, profilePictureSchema, profileNameSchema,
  botConfigSchema, updateProfileStatusSchema, catalogQuerySchema,
  linkGroupSchema, updateLinkedGroupSchema, syncLinkedGroupsSchema, messageLogsQuerySchema,
  blockContactSchema, sendTemplateSchema, sendPtvSchema, ephemeralSchema,
  groupInviteInfoSchema, sendGroupInviteSchema, findContactsSchema, fetchBusinessProfileSchema,
  requestPairingSchema, changeNumberSchema, linkPreviewSchema, typewriterSchema, sendBase64Schema, sendBulkSchema,
} from '../validators/whatsappValidators.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const listNumbers = asyncHandler(async (req, res) => { const data = await whatsappService.listNumbers(req.tenant.companyId); return successResponse(res, data); });

export const connectNumber = asyncHandler(async (req, res) => { const data = connectNumberSchema.parse(req.body); const result = await whatsappService.connectNumber(req.tenant.companyId, data); return createdResponse(res, result); });

export const getQrCode = asyncHandler(async (req, res) => { const result = await whatsappService.getQrCode(req.tenant.companyId, req.params.id); return successResponse(res, result); });

export const getStatus = asyncHandler(async (req, res) => { const result = await whatsappService.getStatus(req.tenant.companyId, req.params.id); return successResponse(res, result); });

export const disconnectNumber = asyncHandler(async (req, res) => { const result = await whatsappService.disconnectNumber(req.tenant.companyId, req.params.id); return successResponse(res, result); });

export const deleteNumber = asyncHandler(async (req, res) => { const result = await whatsappService.deleteNumber(req.tenant.companyId, req.params.id); return successResponse(res, result); });

export const sendMessage = asyncHandler(async (req, res) => { const data = sendMessageSchema.parse(req.body); const result = await whatsappService.sendMessage(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); });

export const sendMedia = asyncHandler(async (req, res) => { const data = sendMediaSchema.parse(req.body); const result = await whatsappService.sendMedia(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); });

export const sendAudio = asyncHandler(async (req, res) => { const data = sendAudioSchema.parse(req.body); const result = await whatsappService.sendAudioMessage(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); });

export const sendDocument = asyncHandler(async (req, res) => { const data = sendDocumentSchema.parse(req.body); const result = await whatsappService.sendDocumentMessage(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); });

export const sendVideo = asyncHandler(async (req, res) => { const data = sendVideoSchema.parse(req.body); const result = await whatsappService.sendVideoMessage(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); });

export const sendSticker = asyncHandler(async (req, res) => { const data = sendStickerSchema.parse(req.body); const result = await whatsappService.sendStickerMessage(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); });

export const sendButtons = asyncHandler(async (req, res) => { const data = sendButtonsSchema.parse(req.body); const result = await whatsappService.sendButtonsMessage(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); });

export const sendList = asyncHandler(async (req, res) => { const data = sendListSchema.parse(req.body); const result = await whatsappService.sendListMessage(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); });

export const sendLocation = asyncHandler(async (req, res) => { const data = sendLocationSchema.parse(req.body); const result = await whatsappService.sendLocationMessage(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); });

export const sendReaction = asyncHandler(async (req, res) => { const data = sendReactionSchema.parse(req.body); const result = await whatsappService.sendReactionMessage(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); });

export const sendStatus = asyncHandler(async (req, res) => { const data = sendStatusSchema.parse(req.body); const result = await whatsappService.sendStatus(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); });

export const sendStatusMedia = asyncHandler(async (req, res) => { const data = sendStatusMediaSchema.parse(req.body); const result = await whatsappService.sendStatusMedia(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); });

export const markRead = asyncHandler(async (req, res) => { const data = markAsReadSchema.parse(req.body); const result = await whatsappService.markAsRead(req.tenant.companyId, req.params.id, data); return successResponse(res, result); });

export const typing = asyncHandler(async (req, res) => { const data = presenceSchema.parse(req.body); const result = await whatsappService.setTyping(req.tenant.companyId, req.params.id, data); return successResponse(res, result); });

export const presence = asyncHandler(async (req, res) => { const data = presenceSchema.parse(req.body); const result = await whatsappService.setOnlinePresence(req.tenant.companyId, req.params.id, data); return successResponse(res, result); });

export const getChats = asyncHandler(async (req, res) => { const result = await whatsappService.listChats(req.tenant.companyId, req.params.id); return successResponse(res, result); });

export const getChatMessages = asyncHandler(async (req, res) => { const query = chatMessagesQuerySchema.parse(req.query); const result = await whatsappService.listChatMessages(req.tenant.companyId, req.params.id, query.chatId, query.limit); return successResponse(res, result); });

/* ===== Groups ===== */

export const createGroup = asyncHandler(async (req, res) => { const data = createGroupSchema.parse(req.body); const result = await whatsappService.createGroup(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); });

export const getGroups = asyncHandler(async (req, res) => { const result = await whatsappService.listGroups(req.tenant.companyId, req.params.id); return successResponse(res, result); });

export const getGroup = asyncHandler(async (req, res) => { const result = await whatsappService.findGroup(req.tenant.companyId, req.params.id, req.params.groupId); return successResponse(res, result); });

export const updateGroup = asyncHandler(async (req, res) => { const data = updateGroupSchema.parse(req.body); const result = await whatsappService.updateGroup(req.tenant.companyId, req.params.id, req.params.groupId, data); return successResponse(res, result); });

export const groupSettings = asyncHandler(async (req, res) => { const data = updateGroupSchema.parse(req.body); const result = await whatsappService.groupSettings(req.tenant.companyId, req.params.id, req.params.groupId, data); return successResponse(res, result); });

export const addGroupParticipant = asyncHandler(async (req, res) => { const data = groupActionSchema.parse(req.body); const result = await whatsappService.addParticipant(req.tenant.companyId, req.params.id, req.params.groupId, data); return successResponse(res, result); });

export const removeGroupParticipant = asyncHandler(async (req, res) => { const data = groupActionSchema.parse(req.body); const result = await whatsappService.removeParticipant(req.tenant.companyId, req.params.id, req.params.groupId, data); return successResponse(res, result); });

export const promoteGroupParticipant = asyncHandler(async (req, res) => { const data = groupActionSchema.parse(req.body); const result = await whatsappService.promoteParticipant(req.tenant.companyId, req.params.id, req.params.groupId, data); return successResponse(res, result); });

export const demoteGroupParticipant = asyncHandler(async (req, res) => { const data = groupActionSchema.parse(req.body); const result = await whatsappService.demoteParticipant(req.tenant.companyId, req.params.id, req.params.groupId, data); return successResponse(res, result); });

export const getInviteLink = asyncHandler(async (req, res) => { const result = await whatsappService.inviteLink(req.tenant.companyId, req.params.id, req.params.groupId); return successResponse(res, result); });

export const revokeInviteLink = asyncHandler(async (req, res) => { const result = await whatsappService.revokeInvite(req.tenant.companyId, req.params.id, req.params.groupId); return successResponse(res, result); });

export const acceptInviteCode = asyncHandler(async (req, res) => { const data = inviteCodeSchema.parse(req.body); const result = await whatsappService.acceptInvite(req.tenant.companyId, req.params.id, data); return successResponse(res, result); });

export const updateGroupPicture = asyncHandler(async (req, res) => { const data = groupPictureSchema.parse(req.body); const result = await whatsappService.groupPicture(req.tenant.companyId, req.params.id, req.params.groupId, data); return successResponse(res, result); });

export const leaveGroup = asyncHandler(async (req, res) => { const result = await whatsappService.leaveGroup(req.tenant.companyId, req.params.id, req.params.groupId); return successResponse(res, result); });

/* ===== Status / Stories ===== */

export const getStories = asyncHandler(async (req, res) => { const result = await whatsappService.listStatus(req.tenant.companyId, req.params.id); return successResponse(res, result); });

export const getStoryById = asyncHandler(async (req, res) => { const result = await whatsappService.getStatusById(req.tenant.companyId, req.params.id, req.params.statusId); return successResponse(res, result); });

export const reactStory = asyncHandler(async (req, res) => { const data = reactStatusSchema.parse(req.body); const result = await whatsappService.reactStatus(req.tenant.companyId, req.params.id, data); return successResponse(res, result); });

/* ===== Chats (extra) ===== */

export const findChat = asyncHandler(async (req, res) => { const data = findChatSchema.parse(req.body); const result = await whatsappService.findChat(req.tenant.companyId, req.params.id, data); return successResponse(res, result); });

export const archiveChat = asyncHandler(async (req, res) => { const result = await whatsappService.archiveChat(req.tenant.companyId, req.params.id, req.params.chatId); return successResponse(res, result); });

export const unarchiveChat = asyncHandler(async (req, res) => { const result = await whatsappService.unarchiveChat(req.tenant.companyId, req.params.id, req.params.chatId); return successResponse(res, result); });

export const fetchAllMessages = asyncHandler(async (req, res) => { const result = await whatsappService.fetchAllMessages(req.tenant.companyId, req.params.id, req.params.chatId); return successResponse(res, result); });

export const checkNumber = asyncHandler(async (req, res) => { const data = checkNumberSchema.parse(req.body); const result = await whatsappService.checkNumber(req.tenant.companyId, req.params.id, data); return successResponse(res, result); });

/* ===== Messages (advanced) ===== */

export const sendPoll = asyncHandler(async (req, res) => { const data = sendPollSchema.parse(req.body); const result = await whatsappService.sendPoll(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); });

export const editMessage = asyncHandler(async (req, res) => { const data = editMessageSchema.parse(req.body); const result = await whatsappService.editMessage(req.tenant.companyId, req.params.id, data); return successResponse(res, result); });

export const deleteMessage = asyncHandler(async (req, res) => { const data = deleteMessageSchema.parse(req.body); const result = await whatsappService.deleteMessage(req.tenant.companyId, req.params.id, data); return successResponse(res, result); });

export const sendContact = asyncHandler(async (req, res) => { const data = sendContactSchema.parse(req.body); const result = await whatsappService.sendContact(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); });

/* ===== Profile ===== */

export const getProfilePicture = asyncHandler(async (req, res) => { const data = profilePictureSchema.parse(req.body); const result = await whatsappService.getProfilePicture(req.tenant.companyId, req.params.id, data); return successResponse(res, result); });

export const getProfileName = asyncHandler(async (req, res) => { const data = profileNameSchema.parse(req.body); const result = await whatsappService.getProfileName(req.tenant.companyId, req.params.id, data); return successResponse(res, result); });

export const updateProfileStatus = asyncHandler(async (req, res) => { const data = updateProfileStatusSchema.parse(req.body); const result = await whatsappService.updateProfileStatus(req.tenant.companyId, req.params.id, data); return successResponse(res, result); });

export const getBotConfig = asyncHandler(async (req, res) => { const result = await whatsappService.getBotConfig(req.tenant.companyId, req.params.id); return successResponse(res, result); });

export const updateBotConfig = asyncHandler(async (req, res) => { const data = botConfigSchema.parse(req.body); const result = await whatsappService.updateBotConfig(req.tenant.companyId, req.params.id, data); return successResponse(res, result); });

export const getCatalog = asyncHandler(async (req, res) => { const query = catalogQuerySchema.parse(req.query); const result = await whatsappService.getCatalog(req.tenant.companyId, req.params.id, query.limit); return successResponse(res, result); });

export const getNotificationLogs = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 50;
  const result = await listOrderNotificationLogs(req.tenant.companyId, { limit });
  return successResponse(res, result);
});

export const getLinkedGroups = asyncHandler(async (req, res) => { const result = await whatsappService.listLinkedGroups(req.tenant.companyId, req.params.id); return successResponse(res, result); });

export const createLinkedGroup = asyncHandler(async (req, res) => { const data = linkGroupSchema.parse(req.body); const result = await whatsappService.linkGroup(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); });

export const updateLinkedGroup = asyncHandler(async (req, res) => { const data = updateLinkedGroupSchema.parse(req.body); const result = await whatsappService.updateLinkedGroup(req.tenant.companyId, req.params.id, req.params.lgId, data); return successResponse(res, result); });

export const removeLinkedGroup = asyncHandler(async (req, res) => { const result = await whatsappService.unlinkGroup(req.tenant.companyId, req.params.id, req.params.lgId); return successResponse(res, result); });

export const syncLinkedGroups = asyncHandler(async (req, res) => { const data = syncLinkedGroupsSchema.parse(req.body ?? {}); const result = await whatsappService.syncLinkedGroups(req.tenant.companyId, req.params.id, data); return successResponse(res, result); });

export const getMessageLogs = asyncHandler(async (req, res) => { const query = messageLogsQuerySchema.parse(req.query); const result = await whatsappService.listMessageLogs(req.tenant.companyId, req.params.id, query); return successResponse(res, result); });

export const updateProfile = asyncHandler(async (req, res) => { const data = updateProfileSchema.parse(req.body); const result = await whatsappService.updateProfile(req.tenant.companyId, req.params.id, data); return successResponse(res, result); });

export const updatePicture = asyncHandler(async (req, res) => { const data = updateProfilePictureSchema.parse(req.body); const result = await whatsappService.updateProfilePicture(req.tenant.companyId, req.params.id, data); return successResponse(res, result); });

export const restartNumber = asyncHandler(async (req, res) => { const result = await whatsappService.restartInstance(req.tenant.companyId, req.params.id); return successResponse(res, result); });

export const logoutNumber = asyncHandler(async (req, res) => { const result = await whatsappService.logoutOnly(req.tenant.companyId, req.params.id); return successResponse(res, result); });

export const getWebhook = asyncHandler(async (req, res) => { const result = await whatsappService.getInstanceWebhook(req.tenant.companyId, req.params.id); return successResponse(res, result); });

export const setupWebhook = asyncHandler(async (req, res) => { const result = await whatsappService.updateInstanceWebhook(req.tenant.companyId, req.params.id); return successResponse(res, result); });

export const webhook = asyncHandler(async (req, res) => { await whatsappService.handleWebhook(req.params.instanceName, req.body); return res.status(200).json({ success: true }); });

/* ===== Capabilities EvolutionAPI (novos endpoints) ===== */

export const blockContact = asyncHandler(async (req, res) => { const data = blockContactSchema.parse(req.body); const result = await whatsappService.blockContact(req.tenant.companyId, req.params.id, data); return successResponse(res, result); });

export const requestPairingCode = asyncHandler(async (req, res) => { const data = requestPairingSchema.parse(req.body); const result = await whatsappService.requestPairingCode(req.tenant.companyId, req.params.id, data); return successResponse(res, result); });

export const getGroupParticipants = asyncHandler(async (req, res) => { const result = await whatsappService.listGroupParticipants(req.tenant.companyId, req.params.id, req.params.groupId); return successResponse(res, result); });

export const sendTemplate = asyncHandler(async (req, res) => { const data = sendTemplateSchema.parse(req.body); const result = await whatsappService.sendTemplateMessage(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); });

export const sendPtv = asyncHandler(async (req, res) => { const data = sendPtvSchema.parse(req.body); const result = await whatsappService.sendPtvMessage(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); });

export const toggleEphemeral = asyncHandler(async (req, res) => { const data = ephemeralSchema.parse(req.body); const result = await whatsappService.toggleEphemeralMessage(req.tenant.companyId, req.params.id, data); return successResponse(res, result); });

export const sendBulk = asyncHandler(async (req, res) => { const data = sendBulkSchema.parse(req.body); const result = await whatsappService.sendBulkMessages(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); });

export const sendBase64 = asyncHandler(async (req, res) => { const data = sendBase64Schema.parse(req.body); const result = await whatsappService.sendBase64Message(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); });

export const getGroupInviteInfo = asyncHandler(async (req, res) => { const data = groupInviteInfoSchema.parse(req.body); const result = await whatsappService.groupInviteInfo(req.tenant.companyId, req.params.id, data); return successResponse(res, result); });

export const sendGroupInvite = asyncHandler(async (req, res) => { const data = sendGroupInviteSchema.parse(req.body); const result = await whatsappService.sendGroupInvite(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); });

export const findContacts = asyncHandler(async (req, res) => { const data = findContactsSchema.parse(req.body); const result = await whatsappService.findContacts(req.tenant.companyId, req.params.id, data); return successResponse(res, result); });

export const removeProfilePicture = asyncHandler(async (req, res) => { const result = await whatsappService.removeProfilePicture(req.tenant.companyId, req.params.id); return successResponse(res, result); });

export const fetchBusinessProfile = asyncHandler(async (req, res) => { const data = fetchBusinessProfileSchema.parse(req.body); const result = await whatsappService.fetchBusinessProfile(req.tenant.companyId, req.params.id, data); return successResponse(res, result); });

export const changeNumber = asyncHandler(async (req, res) => { const data = changeNumberSchema.parse(req.body); const result = await whatsappService.changeNumber(req.tenant.companyId, req.params.id, data); return successResponse(res, result); });

export const sendLinkPreview = asyncHandler(async (req, res) => { const data = linkPreviewSchema.parse(req.body); const result = await whatsappService.sendLinkPreview(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); });

export const typewriter = asyncHandler(async (req, res) => { const data = typewriterSchema.parse(req.body); const result = await whatsappService.typewriterEffect(req.tenant.companyId, req.params.id, data); return createdResponse(res, result); });

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
  getProfilePicture, getProfileName, updateProfileStatus, getBotConfig, updateBotConfig, getCatalog, getNotificationLogs,
  getLinkedGroups, createLinkedGroup, updateLinkedGroup, removeLinkedGroup, syncLinkedGroups, getMessageLogs,
  updateProfile, updatePicture, restartNumber, logoutNumber, getWebhook, setupWebhook, webhook,
  blockContact, requestPairingCode, getGroupParticipants, sendTemplate, sendPtv, toggleEphemeral,
  sendBulk, sendBase64, getGroupInviteInfo, sendGroupInvite, findContacts, removeProfilePicture,
  fetchBusinessProfile, changeNumber, sendLinkPreview, typewriter,
};