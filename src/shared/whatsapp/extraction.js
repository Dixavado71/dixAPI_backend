export function extractMessageText(message) {
  if (!message) return '';
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage?.caption) return message.imageMessage.caption;
  if (message.videoMessage?.caption) return message.videoMessage.caption;
  if (message.documentMessage?.title) return message.documentMessage.title;
  if (message.documentMessage?.fileName && !message.documentMessage?.title) return message.documentMessage.fileName;
  if (message.buttonsResponseMessage?.selectedDisplayText) return message.buttonsResponseMessage.selectedDisplayText;
  if (message.buttonsResponseMessage?.selectedButtonId) return message.buttonsResponseMessage.selectedButtonId;
  if (message.listResponseMessage?.title) return message.listResponseMessage.title;
  if (message.listResponseMessage?.singleSelectReply?.selectedRowId) return message.listResponseMessage.singleSelectReply.selectedRowId;
  if (message.templateButtonReplyMessage?.selectedDisplayText) return message.templateButtonReplyMessage.selectedDisplayText;
  if (message.templateButtonReplyMessage?.selectedId) return message.templateButtonReplyMessage.selectedId;
  if (message.audioMessage) return '🎵 Áudio';
  if (message.stickerMessage) return '🖼️ Sticker';
  if (message.locationMessage) return '📍 Localização';
  if (message.contactMessage?.displayName) return `👤 ${message.contactMessage.displayName}`;
  return '(mídia)';
}

export function extractMedia(message) {
  if (!message) return null;
  if (message.imageMessage?.url) return { type: 'image', url: message.imageMessage.url, caption: message.imageMessage.caption ?? null, fileName: null, mimeType: message.imageMessage.mimetype ?? null };
  if (message.documentMessage?.url) return { type: 'document', url: message.documentMessage.url, caption: message.documentMessage.caption ?? null, fileName: message.documentMessage.fileName ?? null, mimeType: message.documentMessage.mimetype ?? null };
  if (message.videoMessage?.url) return { type: 'video', url: message.videoMessage.url, caption: message.videoMessage.caption ?? null, fileName: null, mimeType: message.videoMessage.mimetype ?? null };
  if (message.audioMessage?.url) return { type: 'audio', url: message.audioMessage.url, caption: null, fileName: null, mimeType: message.audioMessage.mimetype ?? null };
  if (message.stickerMessage?.url) return { type: 'sticker', url: message.stickerMessage.url, caption: null, fileName: null, mimeType: message.stickerMessage.mimetype ?? null };
  return null;
}

export function extractMessageTextFromData(data) {
  return extractMessageText(data?.message ?? data);
}

export default { extractMessageText, extractMedia, extractMessageTextFromData };
