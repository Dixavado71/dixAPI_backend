import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/modules/whatsapp/repositories/whatsappRepository.js', () => ({
  findNumberById: vi.fn(),
  listMessages: vi.fn(),
  upsertMessage: vi.fn(),
  createMessage: vi.fn(),
  upsertContact: vi.fn(),
}));
vi.mock('../src/modules/conversations/repositories/conversationRepository.js', () => ({
  findConversationByContact: vi.fn(),
  createConversation: vi.fn(),
  updateConversationLastMessage: vi.fn(),
  updateConversation: vi.fn(),
  createMessage: vi.fn(),
}));
vi.mock('../src/infrastructure/whatsapp/evolutionApiClient.js', () => ({
  fetchChats: vi.fn(),
  fetchChatMessages: vi.fn(),
  sendText: vi.fn(),
}));
vi.mock('../src/infrastructure/cache/chatbotCache.js', () => ({ default: { getFlowState: vi.fn(), setFlowState: vi.fn(), clearFlowState: vi.fn() } }));
vi.mock('../src/config/env.js', () => ({ env: { evolutionApiUrl: 'http://evolution' } }));

const { parseEvolutionMessage, isReactionMessage, aggregateReactions, mergeChatMessages, listChatMessages } = await import('../src/modules/whatsapp/services/whatsappService.js');
const evolutionApi = await import('../src/infrastructure/whatsapp/evolutionApiClient.js');
const whatsappRepo = await import('../src/modules/whatsapp/repositories/whatsappRepository.js');

const C1 = '00000000-0000-0000-0000-000000000001';
const number = { id: 'n1', company_id: C1, external_account_id: 'inst1' };

beforeEach(() => vi.clearAllMocks());

describe('parseEvolutionMessage', () => {
  it('parses a text message', () => {
    const msg = {
      key: { id: 'ABC', remoteJid: '5511@s.whatsapp.net', fromMe: false },
      message: { conversation: 'Olá, quero saber mais' },
      messageType: 'conversation',
      messageTimestamp: 1693365600,
      status: 'received',
      pushName: 'Thiago',
      source: 'whatsapp',
    };
    const parsed = parseEvolutionMessage(msg);
    expect(parsed.id).toBe('ABC');
    expect(parsed.content).toBe('Olá, quero saber mais');
    expect(parsed.fromMe).toBe(false);
    expect(parsed.messageTimestamp).toBe(1693365600000);
    expect(parsed.remoteJid).toBe('5511@s.whatsapp.net');
    expect(parsed.fetchedFrom).toBe('evolution');
    expect(parsed.reactions).toEqual([]);
  });

  it('parses media message with url', () => {
    const msg = {
      key: { id: 'IMG1', remoteJid: '5511@s.whatsapp.net', fromMe: true },
      message: { imageMessage: { url: 'http://cdn/photo.jpg', caption: 'foto', mimetype: 'image/jpeg' } },
      messageType: 'imageMessage',
      messageTimestamp: 1693365700,
    };
    const parsed = parseEvolutionMessage(msg);
    expect(parsed.content).toBe('foto');
    expect(parsed.media).toEqual({ type: 'image', url: 'http://cdn/photo.jpg', caption: 'foto', mimeType: 'image/jpeg', fileName: null });
    expect(parsed.fromMe).toBe(true);
  });
});

describe('isReactionMessage', () => {
  it('detects reactionMessage, reaction type and reactions array', () => {
    expect(isReactionMessage({ message: { reactionMessage: {} } })).toBe(true);
    expect(isReactionMessage({ messageType: 'reaction' })).toBe(true);
    expect(isReactionMessage({ message: { reactions: [] } })).toBe(true);
    expect(isReactionMessage({ message: { conversation: 'oi' } })).toBe(false);
  });
});

describe('aggregateReactions', () => {
  it('extracts reaction messages and maps them to targets', () => {
    const reactionMsg = {
      key: { id: 'REACT1', remoteJid: '5511@s.whatsapp.net' },
      message: { reactionMessage: { key: { id: 'ABC' }, text: '👍' } },
      messageTimestamp: 100,
    };
    const baseMsg = { key: { id: 'ABC', remoteJid: '5511@s.whatsapp.net' }, message: { conversation: 'oi' } };
    const { messages, reactionsByTarget } = aggregateReactions([baseMsg, reactionMsg]);
    expect(messages).toHaveLength(1);
    expect(reactionsByTarget.get('ABC')).toEqual([{ emoji: '👍', author: null, at: 100000 }]);
  });

  it('keeps inline reactions on the message', () => {
    const msg = { key: { id: 'XYZ' }, message: { reactions: [{ reaction: '❤️', senderId: '5511' }] } };
    const { messages, reactionsByTarget } = aggregateReactions([msg]);
    expect(messages).toHaveLength(1);
    expect(reactionsByTarget.size).toBe(0);
  });
});

describe('mergeChatMessages', () => {
  it('dedupes by id and sorts chronologically', () => {
    const evo = [
      { id: 'a', messageTimestamp: 300 },
      { id: 'b', messageTimestamp: 100 },
    ];
    const db = [
      { id: 'b', messageTimestamp: 100 },
      { id: 'c', messageTimestamp: 200 },
    ];
    const merged = mergeChatMessages(evo, db);
    expect(merged.map((m) => m.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('listChatMessages', () => {
  it('fetches from Evolution API and persists', async () => {
    whatsappRepo.findNumberById.mockResolvedValue(number);
    evolutionApi.fetchChatMessages.mockResolvedValue([
      { key: { id: 'm1', remoteJid: '5511@s.whatsapp.net', fromMe: false }, message: { conversation: 'Olá' }, messageType: 'conversation', messageTimestamp: 100 },
    ]);
    whatsappRepo.listMessages.mockResolvedValue([]);
    whatsappRepo.upsertMessage.mockResolvedValue({});

    const result = await listChatMessages(C1, 'n1', '5511@s.whatsapp.net', 50);

    expect(evolutionApi.fetchChatMessages).toHaveBeenCalledWith('inst1', '5511@s.whatsapp.net', 50);
    expect(whatsappRepo.upsertMessage).toHaveBeenCalledWith(C1, 'n1', expect.objectContaining({ external_message_id: 'm1', remote_jid: '5511@s.whatsapp.net' }));
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('Olá');
  });

  it('falls back to database when Evolution returns empty', async () => {
    whatsappRepo.findNumberById.mockResolvedValue(number);
    evolutionApi.fetchChatMessages.mockResolvedValue([]);
    whatsappRepo.listMessages.mockResolvedValue([
      { external_message_id: 'db1', remote_jid: '5511@s.whatsapp.net', direction: 'outbound', message_type: 'text', content: 'Mensagem local', status: 'sent', sent_at: new Date('2026-08-01T00:00:00Z') },
    ]);

    const result = await listChatMessages(C1, 'n1', '5511@s.whatsapp.net');

    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('Mensagem local');
    expect(result[0].fetchedFrom).toBe('database');
    expect(whatsappRepo.listMessages).toHaveBeenCalledWith(C1, 'n1', { remoteJid: '5511@s.whatsapp.net', limit: 100 });
  });
});
