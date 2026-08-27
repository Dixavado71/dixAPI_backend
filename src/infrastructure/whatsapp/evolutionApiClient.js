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

/* ===== Instance ===== */

export async function createInstance(instanceName) {
  const webhookUrl = `${env.publicApiUrl}/api/v1/whatsapp/webhook/${instanceName}`;
  return request('POST', '/instance/create', {
    instanceName,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS',
    webhook: { enabled: true, url: webhookUrl, events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED', 'MESSAGES_UPDATE'] },
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
  return instanceRequest('POST', instanceName, `/instance/logout/${instanceName}`);
}

export async function restartInstance(instanceName) {
  return instanceRequest('POST', instanceName, `/instance/restart/${instanceName}`);
}

export async function setPresence(instanceName, presence = 'available') {
  return instanceRequest('POST', instanceName, `/instance/setPresence/${instanceName}`, { presence });
}

export async function updateProfileName(instanceName, name) {
  return instanceRequest('POST', instanceName, `/instance/updateProfileName/${instanceName}`, { name });
}

export async function updateProfilePicture(instanceName, pictureBase64) {
  return instanceRequest('POST', instanceName, `/instance/updateProfilePicture/${instanceName}`, { picture: pictureBase64 });
}

export async function getInstanceInfo(instanceName) {
  return instanceRequest('POST', instanceName, `/instance/connectionState/${instanceName}`);
}

export async function fetchInstanceSessions(instanceName) {
  return instanceRequest('POST', instanceName, `/instance/fetchSessions/${instanceName}`);
}

/* ===== Message sending ===== */

export async function sendText(instanceName, number, text, delay = 1000) {
  return instanceRequest('POST', instanceName, `/message/sendText/${instanceName}`, { number, text, delay });
}

export async function sendMedia(instanceName, number, mediaType, mediaUrl, caption, delay = 1000) {
  return instanceRequest('POST', instanceName, `/message/sendMedia/${instanceName}`, {
    number, mediatype: mediaType, media: mediaUrl, caption, delay,
  });
}

export async function sendAudio(instanceName, number, audioUrl, delay = 1000) {
  return instanceRequest('POST', instanceName, `/message/sendAudio/${instanceName}`, { number, audio: audioUrl, delay });
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

export async function sendButtons(instanceName, number, title, description, buttons, footer = 'diix', delay = 1000) {
  return instanceRequest('POST', instanceName, `/message/sendButtons/${instanceName}`, {
    number, title, description, footer, buttons, delay,
  });
}

export async function sendList(instanceName, number, title, description, buttonText, sections, delay = 1000) {
  return instanceRequest('POST', instanceName, `/message/sendList/${instanceName}`, {
    number, title, description, buttonText, sections, delay,
  });
}

export async function sendLocation(instanceName, number, name, address, latitude, longitude, delay = 1000) {
  return instanceRequest('POST', instanceName, `/message/sendLocation/${instanceName}`, {
    number, name, address, latitude, longitude, delay,
  });
}

export async function sendStatusText(instanceName, content) {
  return instanceRequest('POST', instanceName, `/message/sendStatus/${instanceName}`, {
    statusMessage: { type: 'text', content },
  });
}

export async function sendStatusMedia(instanceName, mediaType, mediaUrl, caption) {
  return instanceRequest('POST', instanceName, `/message/sendStatus/${instanceName}`, {
    statusMessage: { type: 'media', mediaType, media: mediaUrl, caption },
  });
}

export async function sendReaction(instanceName, number, messageId, reaction) {
  return instanceRequest('POST', instanceName, `/message/sendReaction/${instanceName}`, {
    number, messageId, reaction,
  });
}

export async function sendContactVcard(instanceName, number, name, phone) {
  return instanceRequest('POST', instanceName, `/message/sendContact/${instanceName}`, {
    number, name, phone,
  });
}

/* ===== Chats ===== */

export async function fetchChats(instanceName) {
  return instanceRequest('POST', instanceName, `/chat/findChats/${instanceName}`, {});
}

export async function fetchChatMessages(instanceName, chatId, limit = 50) {
  return instanceRequest('POST', instanceName, `/chat/findMessages/${instanceName}`, { chatId, limit });
}

export async function markMessageAsRead(instanceName, number, messageId) {
  return instanceRequest('POST', instanceName, `/chat/markMessageAsRead/${instanceName}`, { number, messageId });
}

export async function sendTyping(instanceName, number) {
  return instanceRequest('POST', instanceName, `/chat/sendPresence/${instanceName}`, { number, presence: 'composing', delay: 1000 });
}

export async function sendPresencePaused(instanceName, number) {
  return instanceRequest('POST', instanceName, `/chat/sendPresence/${instanceName}`, { number, presence: 'paused', delay: 1000 });
}

export async function setChatName(instanceName, chatId, name) {
  return instanceRequest('POST', instanceName, `/chat/update/${instanceName}`, { chatId, name });
}

export async function updateGroupSubject(instanceName, groupId, name) {
  return instanceRequest('PUT', instanceName, `/group/update/${instanceName}`, { groupId, name });
}

export async function updateGroupDescription(instanceName, groupId, description) {
  return instanceRequest('PUT', instanceName, `/group/update/${instanceName}`, { groupId, description });
}

export async function addGroupParticipant(instanceName, groupId, phone) {
  return instanceRequest('POST', instanceName, `/group/addParticipant/${instanceName}`, { groupId, phone });
}

export async function removeGroupParticipant(instanceName, groupId, phone) {
  return instanceRequest('POST', instanceName, `/group/removeParticipant/${instanceName}`, { groupId, phone });
}

export async function promoteGroupParticipant(instanceName, groupId, phone) {
  return instanceRequest('POST', instanceName, `/group/promoteParticipant/${instanceName}`, { groupId, phone });
}

export async function demoteGroupParticipant(instanceName, groupId, phone) {
  return instanceRequest('POST', instanceName, `/group/demoteParticipant/${instanceName}`, { groupId, phone });
}

export async function leaveGroup(instanceName, groupId) {
  return instanceRequest('POST', instanceName, `/group/leave/${instanceName}`, { groupId });
}

export async function fetchGroups(instanceName) {
  return instanceRequest('GET', instanceName, `/group/findGroups/${instanceName}`);
}

/* ===== Webhook ===== */

export async function setWebhook(instanceName, webhookUrl, events = ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED', 'MESSAGES_UPDATE']) {
  return instanceRequest('POST', instanceName, `/webhook/set/${instanceName}`, {
    webhook: { enabled: true, url: webhookUrl, events },
  });
}

export async function getWebhook(instanceName) {
  return instanceRequest('POST', instanceName, `/webhook/find/${instanceName}`);
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
  updateProfileName,
  updateProfilePicture,
  getInstanceInfo,
  fetchInstanceSessions,
  sendText,
  sendMedia,
  sendAudio,
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
  fetchChats,
  fetchChatMessages,
  markMessageAsRead,
  sendTyping,
  sendPresencePaused,
  setChatName,
  updateGroupSubject,
  updateGroupDescription,
  addGroupParticipant,
  removeGroupParticipant,
  promoteGroupParticipant,
  demoteGroupParticipant,
  leaveGroup,
  fetchGroups,
  setWebhook,
  getWebhook,
};