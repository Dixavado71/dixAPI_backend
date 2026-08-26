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

export async function createInstance(instanceName) {
  const webhookUrl = `${env.publicApiUrl}/api/v1/whatsapp/webhook/${instanceName}`;
  return request('POST', '/instance/create', {
    instanceName,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS',
    webhook: { enabled: true, url: webhookUrl, events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'] },
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

export async function sendButtons(instanceName, number, title, description, buttons, delay = 1000) {
  return instanceRequest('POST', instanceName, `/message/sendButtons/${instanceName}`, {
    number, title, description, footer: 'diix', buttons, delay,
  });
}

export async function fetchChats(instanceName) {
  return instanceRequest('GET', instanceName, `/chat/findChats/${instanceName}`);
}

export async function fetchMessages(instanceName, chatId, limit = 50) {
  return instanceRequest('GET', instanceName, `/chat/findMessages/${instanceName}?chatId=${encodeURIComponent(chatId)}&limit=${limit}`);
}

export async function setWebhook(instanceName, webhookUrl, events = ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED']) {
  return instanceRequest('POST', instanceName, `/webhook/set/${instanceName}`, {
    webhook: { enabled: true, url: webhookUrl, events },
  });
}

export async function getWebhook(instanceName) {
  return instanceRequest('POST', instanceName, `/webhook/find/${instanceName}`);
}

export async function setPresence(instanceName, presence = 'available') {
  return instanceRequest('POST', instanceName, `/instance/setPresence/${instanceName}`, { presence });
}

export default {
  createInstance,
  getInstanceQrCode,
  getConnectionState,
  fetchAllInstances,
  deleteInstance,
  logoutInstance,
  sendText,
  sendMedia,
  sendAudio,
  sendButtons,
  fetchChats,
  fetchMessages,
  setWebhook,
  getWebhook,
  setPresence,
};