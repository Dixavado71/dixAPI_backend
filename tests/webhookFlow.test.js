import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

const mocks = vi.hoisted(() => {
  const whatsappRepo = {
    findNumberByExternalAccountId: vi.fn(),
    upsertContact: vi.fn(),
    createMessage: vi.fn(),
    findNumberByPhone: vi.fn(),
    updateNumberById: vi.fn(),
    getBotConfig: vi.fn().mockResolvedValue({}),
    findContactByPhone: vi.fn(),
    findMessageByExternalId: vi.fn().mockResolvedValue(null),
  };
  const conversationRepo = {
    findConversationByContact: vi.fn(),
    createConversation: vi.fn(),
    updateConversationLastMessage: vi.fn(),
    updateConversation: vi.fn(),
    createMessage: vi.fn(),
  };
  const evolutionApi = { sendText: vi.fn().mockResolvedValue({ key: { id: 'bot-msg-1' } }) };
  const cache = { getFlowState: vi.fn().mockResolvedValue(null), setFlowState: vi.fn(), clearFlowState: vi.fn() };
  const automationRepo = { findFlowById: vi.fn(), findActiveFlowByType: vi.fn(), incrementMessagesCount: vi.fn() };
  return { whatsappRepo, conversationRepo, evolutionApi, cache, automationRepo };
});

vi.mock('../src/modules/whatsapp/repositories/whatsappRepository.js', () => mocks.whatsappRepo);
vi.mock('../src/modules/conversations/repositories/conversationRepository.js', () => mocks.conversationRepo);
vi.mock('../src/infrastructure/whatsapp/evolutionApiClient.js', () => mocks.evolutionApi);
vi.mock('../src/modules/automation/cache/chatbotCache.js', () => ({ default: mocks.cache }));
vi.mock('../src/modules/automation/repositories/automationRepository.js', () => mocks.automationRepo);
vi.mock('../src/modules/notifications/services/notificationService.js', () => ({
  notifyAttendants: vi.fn().mockResolvedValue([]),
  notifyAttendantsAsync: vi.fn(),
  dispatchEvent: vi.fn().mockResolvedValue({ dispatched: 0 }),
  dispatchEventAsync: vi.fn(),
}));
vi.mock('../src/infrastructure/queue/notificationQueue.js', () => ({ enqueueNotification: vi.fn() }));
vi.mock('../src/config/env.js', () => ({ env: { evolutionApiUrl: 'http://evolution', logLevel: 'silent', publicApiUrl: 'http://app', paymentWebhookSecret: null, evolutionWebhookSecret: null } }));

import app from '../src/app.js';

const { whatsappRepo, conversationRepo, evolutionApi, automationRepo } = mocks;

const C1 = '00000000-0000-0000-0000-000000000001';
const number = { id: 'n1', company_id: C1, external_account_id: 'inst1', is_bot_enabled: true, flow_id: null };

beforeEach(() => vi.clearAllMocks());

describe('Webhook Evolution API (MESSAGES_UPSERT)', () => {
  it('POST /api/v1/whatsapp/webhook/:instanceName processa mensagem inbound e bot responde', async () => {
    whatsappRepo.findNumberByExternalAccountId.mockResolvedValue(number);
    whatsappRepo.upsertContact.mockResolvedValue({ id: 'c1', customer_id: null });
    whatsappRepo.createMessage.mockResolvedValue({ id: 'msg1' });
    whatsappRepo.findContactByPhone.mockResolvedValue({ id: 'c1', metadata: {} });
    conversationRepo.findConversationByContact.mockResolvedValue(null);
    conversationRepo.createConversation.mockResolvedValue({ id: 'conv1' });
    conversationRepo.createMessage.mockResolvedValue({});
    automationRepo.findActiveFlowByType.mockResolvedValue({
      id: 'f1', is_active: true, config_json: {
        defaultStep: 'welcome', steps: [{ id: 'welcome', type: 'message', content: 'Olá! Como posso ajudar?', next: null }],
        triggers: [{ keyword: 'oi', step: 'welcome' }],
      },
    });
    automationRepo.incrementMessagesCount.mockResolvedValue({});

    const payload = {
      event: 'MESSAGES_UPSERT',
      data: [{
        key: { remoteJid: '5511999999999@s.whatsapp.net', fromMe: false, id: 'ext-msg-1' },
        message: { conversation: 'oi, quero fazer um pedido' },
        messageType: 'conversation',
        messageTimestamp: Math.floor(Date.now() / 1000),
        pushName: 'Maria',
      }],
    };

    const res = await request(app)
      .post('/api/v1/whatsapp/webhook/inst1')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // webhook processa assíncronamente (fila via setImmediate)
    await new Promise((r) => setTimeout(r, 250));

    expect(whatsappRepo.findNumberByExternalAccountId).toHaveBeenCalledWith('inst1');
    expect(whatsappRepo.upsertContact).toHaveBeenCalled();
    expect(conversationRepo.createConversation).toHaveBeenCalled();
    expect(evolutionApi.sendText).toHaveBeenCalled();
    expect(evolutionApi.sendText.mock.calls[0][0]).toBe('inst1');
    expect(evolutionApi.sendText.mock.calls[0][1]).toBe('5511999999999');
    expect(evolutionApi.sendText.mock.calls[0][2]).toContain('Olá');
  });

  it('retorna 200 para CONNECTION_UPDATE (ignora sem processar)', async () => {
    whatsappRepo.findNumberByExternalAccountId.mockResolvedValue(number);
    whatsappRepo.updateNumberById.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/whatsapp/webhook/inst1')
      .send({ event: 'CONNECTION_UPDATE', data: { state: 'open' } });

    expect(res.status).toBe(200);
    expect(whatsappRepo.updateNumberById).toHaveBeenCalledWith('n1', { status: 'connected', last_connected_at: expect.any(Date) });
  });
});