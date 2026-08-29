import { env } from '../../config/env.js';

const BASE_URL = env.evolutionApiUrl || 'http://localhost:8080';

function headers() {
  const h = { 'Content-Type': 'application/json', apikey: env.evolutionApiKey || '' };
  if (env.evolutionApiGlobalKey) h['x-global-apikey'] = env.evolutionApiGlobalKey;
  return h;
}

async function request(method, path, body) {
  const url = `${BASE_URL}${path}`;
  const opts = { method, headers: headers() };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || `EvolutionAPI error: ${res.status}`);
  return data;
}

async function instanceRequest(method, instanceName, path, body) {
  const url = `${BASE_URL}${path}`;
  const opts = { method, headers: { ...headers(), apikey: env.evolutionApiKey } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || `EvolutionAPI error: ${res.status}`);
  return data;
}

function isAllowedMediaUrl(mediaUrl) {
  let parsed;
  try {
    parsed = new URL(mediaUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  const hostname = parsed.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '[::1]') return false;
  if (hostname.startsWith('10.') || hostname.startsWith('172.16.') || hostname.startsWith('192.168.')) return false;
  return true;
}

export async function downloadMedia(instanceName, mediaUrl) {
  if (!isAllowedMediaUrl(mediaUrl)) {
    throw new Error('URL de mídia não permitida.');
  }
  const opts = { headers: { ...headers(), apikey: env.evolutionApiKey }, redirect: 'error' };
  const res = await fetch(mediaUrl, opts);
  if (!res.ok) throw new Error(`EvolutionAPI media download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return buffer.toString('base64');
}

function webhookConfig(url, events = ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED', 'MESSAGES_UPDATE']) {
  const cfg = { enabled: true, url, events };
  if (env.evolutionWebhookSecret) cfg.headers = { 'x-webhook-secret': env.evolutionWebhookSecret };
  return cfg;
}

/* ===== Instance (v2.3.7) ===== */

export async function createInstance(instanceName, webhookUrl) {
  return request('POST', '/instance/create', {
    instanceName,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS',
    webhook: webhookUrl ? webhookConfig(webhookUrl) : undefined,
  });
}

export async function getInstanceQrCode(instanceName) {
  return instanceRequest('GET', instanceName, `/instance/connect/${instanceName}`);
}

export async function getConnectionState(instanceName) {
  return instanceRequest('GET', instanceName, `/instance/connectionState/${instanceName}`);
}

export async function fetchAllInstances() {
  return request('GET', '/instance/fetchInstances');
}

export async function deleteInstance(instanceName) {
  return instanceRequest('DELETE', instanceName, `/instance/delete/${instanceName}`);
}

export async function logoutInstance(instanceName) {
  return instanceRequest('DELETE', instanceName, `/instance/logout/${instanceName}`);
}

export async function restartInstance(instanceName) {
  return instanceRequest('POST', instanceName, `/instance/restart/${instanceName}`);
}

export async function setPresence(instanceName, presence = 'available') {
  return instanceRequest('POST', instanceName, `/instance/setPresence/${instanceName}`, { presence });
}

export async function requestPairing(instanceName, phone) {
  const qr = await getInstanceQrCode(instanceName);
  return { pairingCode: qr?.pairingCode ?? null, code: qr?.code ?? null, base64: qr?.base64 ?? null };
}

export async function sendLinkPreview(instanceName, number, text) {
  return instanceRequest('POST', instanceName, `/message/sendText/${instanceName}`, { number, text, linkPreview: true });
}

export async function typewriter(instanceName, number) {
  return instanceRequest('POST', instanceName, `/chat/sendPresence/${instanceName}`, { number, presence: 'composing', delay: 1000 });
}

export async function sendBase64(instanceName, number, mediaType, base64, fileName) {
  return instanceRequest('POST', instanceName, `/message/sendMedia/${instanceName}`, {
    number, mediatype: mediaType || 'image', media: base64, fileName, delay: 800,
  });
}

/* ===== Message (v2.3.7) ===== */

export async function sendText(instanceName, number, text, delay = 1000) {
  return instanceRequest('POST', instanceName, `/message/sendText/${instanceName}`, { number, text, delay });
}

export async function sendMedia(instanceName, number, mediaType, mediaUrl, caption, delay = 1000) {
  return instanceRequest('POST', instanceName, `/message/sendMedia/${instanceName}`, {
    number, mediatype: mediaType, media: mediaUrl, caption, delay,
  });
}

export async function sendWhatsAppAudio(instanceName, number, audioUrl, delay = 1000) {
  return instanceRequest('POST', instanceName, `/message/sendWhatsAppAudio/${instanceName}`, { number, audio: audioUrl, delay });
}

export async function sendPtv(instanceName, number, videoUrl, caption, delay = 1000) {
  return instanceRequest('POST', instanceName, `/message/sendPtv/${instanceName}`, { number, video: videoUrl, delay });
}

export async function sendDocument(instanceName, number, documentUrl, caption, fileName, delay = 1000) {
  return instanceRequest('POST', instanceName, `/message/sendMedia/${instanceName}`, {
    number, mediatype: 'document', media: documentUrl, caption, fileName, delay,
  });
}

export async function sendVideo(instanceName, number, videoUrl, caption, delay = 1000) {
  return instanceRequest('POST', instanceName, `/message/sendMedia/${instanceName}`, {
    number, mediatype: 'video', media: videoUrl, caption, delay,
  });
}

export async function sendSticker(instanceName, number, stickerUrl, delay = 1000) {
  return instanceRequest('POST', instanceName, `/message/sendSticker/${instanceName}`, { number, sticker: stickerUrl, delay });
}

export async function sendButtons(instanceName, number, title, description, buttons, footer = '', delay = 1000) {
  return instanceRequest('POST', instanceName, `/message/sendButtons/${instanceName}`, {
    number, title, description, footer, buttons, delay,
  });
}

export async function sendList(instanceName, number, title, description, buttonText, sections, delay = 1000) {
  return instanceRequest('POST', instanceName, `/message/sendList/${instanceName}`, {
    number, title, description, footerText: description ?? '', buttonText, sections, delay,
  });
}

export async function sendLocation(instanceName, number, name, address, latitude, longitude, delay = 1000) {
  return instanceRequest('POST', instanceName, `/message/sendLocation/${instanceName}`, {
    number, name, address, latitude, longitude, delay,
  });
}

export async function sendStatusText(instanceName, content, statusJidList = []) {
  const body = { type: 'text', content, backgroundColor: '#075E54', font: 0 };
  if (statusJidList.length > 0) body.statusJidList = statusJidList; else body.allContacts = true;
  return instanceRequest('POST', instanceName, `/message/sendStatus/${instanceName}`, body);
}

export async function sendStatusMedia(instanceName, mediaType, mediaUrl, caption, statusJidList = []) {
  const body = { type: mediaType, content: mediaUrl, caption };
  if (statusJidList.length > 0) body.statusJidList = statusJidList; else body.allContacts = true;
  return instanceRequest('POST', instanceName, `/message/sendStatus/${instanceName}`, body);
}

export async function sendReaction(instanceName, number, messageId, reaction, fromMe = false) {
  const remoteJid = String(number).includes('@') ? number : `${String(number).replace(/[^\d]/g, '')}@s.whatsapp.net`;
  return instanceRequest('POST', instanceName, `/message/sendReaction/${instanceName}`, {
    key: { id: messageId, remoteJid, fromMe },
    reaction,
  });
}

export async function sendContactVcard(instanceName, number, name, phone) {
  return instanceRequest('POST', instanceName, `/message/sendContact/${instanceName}`, {
    number, contact: [{ fullName: name, phoneNumber: phone }],
  });
}

export async function sendPoll(instanceName, number, name, values) {
  return instanceRequest('POST', instanceName, `/message/sendPoll/${instanceName}`, {
    number, name, selectableCount: Math.max(1, Math.min(values.length, 10)), values,
  });
}

export async function sendTemplate(instanceName, number, template) {
  const name = template?.name;
  const language = template?.language ?? { code: 'pt_BR' };
  const components = template?.components ?? template?.template?.components ?? [];
  return instanceRequest('POST', instanceName, `/message/sendTemplate/${instanceName}`, { number, name, language, components });
}

/* ===== Chat (v2.3.7) ===== */

export async function fetchChats(instanceName) {
  return instanceRequest('POST', instanceName, `/chat/findChats/${instanceName}`, {});
}

export async function fetchChatMessages(instanceName, chatId, limit = 50) {
  return instanceRequest('POST', instanceName, `/chat/findMessages/${instanceName}`, { where: { key: { remoteJid: chatId } }, limit });
}

export async function findChatByRemoteJid(instanceName, chatId) {
  return instanceRequest('GET', instanceName, `/chat/findChatByRemoteJid/${instanceName}?remoteJid=${encodeURIComponent(chatId)}`);
}

export async function markMessageAsRead(instanceName, number, messageId) {
  const remoteJid = String(number).includes('@') ? number : `${String(number).replace(/[^\d]/g, '')}@s.whatsapp.net`;
  return instanceRequest('POST', instanceName, `/chat/markMessageAsRead/${instanceName}`, {
    readMessages: [{ id: messageId, fromMe: false, remoteJid }],
  });
}

export async function sendTyping(instanceName, number) {
  return instanceRequest('POST', instanceName, `/chat/sendPresence/${instanceName}`, { number, presence: 'composing', delay: 1000 });
}

export async function sendPresencePaused(instanceName, number) {
  return instanceRequest('POST', instanceName, `/chat/sendPresence/${instanceName}`, { number, presence: 'paused', delay: 1000 });
}

export async function archiveChat(instanceName, chatId, archive = true) {
  return instanceRequest('POST', instanceName, `/chat/archiveChat/${instanceName}`, { archive, chat: { id: chatId } });
}

export async function markChatUnread(instanceName, chatId, lastMessage) {
  return instanceRequest('POST', instanceName, `/chat/markChatUnread/${instanceName}`, { chat: { id: chatId }, lastMessage });
}

export async function updateMessage(instanceName, number, messageId, text) {
  const remoteJid = String(number).includes('@') ? number : `${String(number).replace(/[^\d]/g, '')}@s.whatsapp.net`;
  return instanceRequest('POST', instanceName, `/chat/updateMessage/${instanceName}`, {
    number, text, key: { id: messageId, remoteJid, fromMe: false },
  });
}

export async function deleteMessageForEveryone(instanceName, number, messageId) {
  const remoteJid = String(number).includes('@') ? number : `${String(number).replace(/[^\d]/g, '')}@s.whatsapp.net`;
  return instanceRequest('DELETE', instanceName, `/chat/deleteMessageForEveryone/${instanceName}`, {
    id: messageId, fromMe: false, remoteJid,
  });
}

export async function fetchProfilePictureUrl(instanceName, number) {
  return instanceRequest('POST', instanceName, `/chat/fetchProfilePictureUrl/${instanceName}`, { number });
}

export async function fetchProfile(instanceName, number) {
  return instanceRequest('POST', instanceName, `/chat/fetchProfile/${instanceName}`, { number });
}

export async function findContacts(instanceName, where = {}) {
  return instanceRequest('POST', instanceName, `/chat/findContacts/${instanceName}`, { where });
}

export async function whatsappNumbers(instanceName, numbers) {
  return instanceRequest('POST', instanceName, `/chat/whatsappNumbers/${instanceName}`, { numbers });
}

export async function findStatusMessage(instanceName, chatId, limit = 50) {
  return instanceRequest('POST', instanceName, `/chat/findStatusMessage/${instanceName}`, { where: { remoteJid: chatId }, limit });
}

export async function updateProfileName(instanceName, name) {
  return instanceRequest('POST', instanceName, `/chat/updateProfileName/${instanceName}`, { name });
}

export async function updateProfileStatus(instanceName, status) {
  return instanceRequest('POST', instanceName, `/chat/updateProfileStatus/${instanceName}`, { status });
}

export async function updateProfilePicture(instanceName, image) {
  return instanceRequest('POST', instanceName, `/chat/updateProfilePicture/${instanceName}`, { picture: image });
}

export async function removeProfilePicture(instanceName) {
  return instanceRequest('DELETE', instanceName, `/chat/removeProfilePicture/${instanceName}`);
}

export async function updateBlockStatus(instanceName, number, action) {
  return instanceRequest('POST', instanceName, `/chat/updateBlockStatus/${instanceName}`, { number, status: action });
}

export async function fetchBusinessProfile(instanceName, number) {
  return instanceRequest('POST', instanceName, `/chat/fetchBusinessProfile/${instanceName}`, { number });
}

/* ===== Group (v2.3.7) ===== */

export async function createGroup(instanceName, subject, participants = [], description) {
  return instanceRequest('POST', instanceName, `/group/create/${instanceName}`, {
    subject, participants, description,
  });
}

export async function updateGroupSubject(instanceName, groupJid, subject) {
  return instanceRequest('POST', instanceName, `/group/updateGroupSubject/${instanceName}`, { groupJid, subject });
}

export async function updateGroupDescription(instanceName, groupJid, description) {
  return instanceRequest('POST', instanceName, `/group/updateGroupDescription/${instanceName}`, { groupJid, description });
}

export async function updateGroupPicture(instanceName, groupJid, image) {
  return instanceRequest('POST', instanceName, `/group/updateGroupPicture/${instanceName}`, { groupJid, image });
}

export async function findGroupInfos(instanceName, groupJid) {
  return instanceRequest('GET', instanceName, `/group/findGroupInfos/${instanceName}?groupJid=${encodeURIComponent(groupJid)}`);
}

export async function fetchAllGroups(instanceName, getParticipants = false) {
  return instanceRequest('GET', instanceName, `/group/fetchAllGroups/${instanceName}?getParticipants=${getParticipants ? 'true' : 'false'}`);
}

export async function groupParticipants(instanceName, groupJid) {
  return instanceRequest('GET', instanceName, `/group/participants/${instanceName}?groupJid=${encodeURIComponent(groupJid)}`);
}

export async function groupInviteCode(instanceName, groupJid) {
  return instanceRequest('GET', instanceName, `/group/inviteCode/${instanceName}?groupJid=${encodeURIComponent(groupJid)}`);
}

export async function groupInviteInfo(instanceName, inviteCode) {
  return instanceRequest('GET', instanceName, `/group/inviteInfo/${instanceName}?inviteCode=${encodeURIComponent(inviteCode)}`);
}

export async function acceptInviteCode(instanceName, inviteCode) {
  return instanceRequest('GET', instanceName, `/group/acceptInviteCode/${instanceName}?inviteCode=${encodeURIComponent(inviteCode)}`);
}

export async function sendGroupInvite(instanceName, groupJid, numbers, description) {
  return instanceRequest('POST', instanceName, `/group/sendInvite/${instanceName}`, { groupJid, numbers, description });
}

export async function revokeInviteCode(instanceName, groupJid) {
  return instanceRequest('POST', instanceName, `/group/revokeInviteCode/${instanceName}`, { groupJid });
}

export async function updateParticipant(instanceName, groupJid, action, participants) {
  return instanceRequest('POST', instanceName, `/group/updateParticipant/${instanceName}`, { groupJid, action, participants });
}

export async function updateGroupSetting(instanceName, groupJid, action) {
  return instanceRequest('POST', instanceName, `/group/updateSetting/${instanceName}`, { groupJid, action });
}

export async function toggleEphemeral(instanceName, groupJid, expiration) {
  return instanceRequest('POST', instanceName, `/group/toggleEphemeral/${instanceName}`, { groupJid, expiration });
}

export async function leaveGroup(instanceName, groupJid) {
  return instanceRequest('DELETE', instanceName, `/group/leaveGroup/${instanceName}`, { groupJid });
}

/* ===== Webhook ===== */

export async function setWebhook(instanceName, webhookUrl, events = ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED', 'MESSAGES_UPDATE']) {
  return instanceRequest('POST', instanceName, `/webhook/set/${instanceName}`, {
    webhook: webhookConfig(webhookUrl, events),
  });
}

export async function getWebhook(instanceName) {
  return instanceRequest('GET', instanceName, `/webhook/find/${instanceName}`).catch(() => ({ webhook: null }));
}

export default {
  createInstance,
  getInstanceQrCode,
  getConnectionState,
  fetchAllInstances,
  deleteInstance,
  logoutInstance,
  restartInstance,
  setPresence,
  requestPairing,
  sendLinkPreview,
  typewriter,
  sendBase64,
  downloadMedia,
  sendText,
  sendMedia,
  sendWhatsAppAudio,
  sendPtv,
  sendDocument,
  sendVideo,
  sendSticker,
  sendButtons,
  sendList,
  sendLocation,
  sendStatusText,
  sendStatusMedia,
  sendReaction,
  sendContactVcard,
  sendPoll,
  sendTemplate,
  fetchChats,
  fetchChatMessages,
  findChatByRemoteJid,
  markMessageAsRead,
  sendTyping,
  sendPresencePaused,
  archiveChat,
  markChatUnread,
  updateMessage,
  deleteMessageForEveryone,
  fetchProfilePictureUrl,
  fetchProfile,
  findContacts,
  whatsappNumbers,
  findStatusMessage,
  updateProfileName,
  updateProfileStatus,
  updateProfilePicture,
  removeProfilePicture,
  updateBlockStatus,
  fetchBusinessProfile,
  createGroup,
  updateGroupSubject,
  updateGroupDescription,
  updateGroupPicture,
  findGroupInfos,
  fetchAllGroups,
  groupParticipants,
  groupInviteCode,
  groupInviteInfo,
  acceptInviteCode,
  sendGroupInvite,
  revokeInviteCode,
  updateParticipant,
  updateGroupSetting,
  toggleEphemeral,
  leaveGroup,
  setWebhook,
  getWebhook,
};