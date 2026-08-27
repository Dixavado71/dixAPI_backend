import { describe, it, expect, vi, beforeEach } from 'vitest';

const automationRepo = {
  findFlowById: vi.fn(),
  findActiveFlowByType: vi.fn(),
  incrementMessagesCount: vi.fn(),
  listFlows: vi.fn(),
  createFlow: vi.fn(),
  updateFlow: vi.fn(),
  deleteFlow: vi.fn(),
  listQuickReplies: vi.fn(),
  createQuickReply: vi.fn(),
  updateQuickReply: vi.fn(),
  deleteQuickReply: vi.fn(),
  findQuickReplyById: vi.fn(),
  incrementQuickReplyUsage: vi.fn(),
};
const whatsappRepo = {
  findLinkedGroupByRemoteJid: vi.fn(),
  findContactByPhone: vi.fn(),
  findContactById: vi.fn(),
  updateContactMetadata: vi.fn(),
};
const conversationRepo = {
  findConversationByContact: vi.fn(),
  createConversation: vi.fn(),
  updateConversationLastMessage: vi.fn(),
  updateConversation: vi.fn(),
  createMessage: vi.fn(),
};
const evolutionApi = { sendText: vi.fn(), sendMedia: vi.fn() };
const cache = { getFlowState: vi.fn(), setFlowState: vi.fn(), clearFlowState: vi.fn() };

vi.mock('../src/modules/automation/repositories/automationRepository.js', () => automationRepo);
vi.mock('../src/modules/whatsapp/repositories/whatsappRepository.js', () => whatsappRepo);
vi.mock('../src/modules/conversations/repositories/conversationRepository.js', () => conversationRepo);
vi.mock('../src/infrastructure/whatsapp/evolutionApiClient.js', () => evolutionApi);
vi.mock('../src/infrastructure/cache/chatbotCache.js', () => ({ default: cache }));
vi.mock('../src/config/env.js', () => ({ env: { logLevel: 'silent' } }));
vi.mock('../src/config/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const service = await import('../src/modules/automation/services/automationService.js');

const C1 = '00000000-0000-0000-0000-000000000001';
const number = { id: 'n1', company_id: C1, external_account_id: 'inst1', is_bot_enabled: true };

beforeEach(() => vi.clearAllMocks());

describe('processIncomingMessage', () => {
  const flow = {
    id: 'f1',
    is_active: true,
    config_json: {
      defaultStep: 'welcome',
      steps: [
        { id: 'welcome', type: 'message', content: 'Olá {nome}!', next: null },
        { id: 'menu', type: 'question', content: 'Escolha:', options: [{ label: 'Pedido', value: 'pedido', next: 'welcome' }], next: 'welcome' },
      ],
      triggers: [{ keyword: 'oi', step: 'welcome' }],
    },
  };

  it('returns null when bot is disabled', async () => {
    const result = await service.processIncomingMessage({ companyId: C1, number: { ...number, is_bot_enabled: false }, from: '5511', text: 'oi' });
    expect(result).toBeNull();
  });

  it('returns null when no active flow', async () => {
    automationRepo.findActiveFlowByType.mockResolvedValue(null);
    const result = await service.processIncomingMessage({ companyId: C1, number, from: '5511', text: 'oi' });
    expect(result).toBeNull();
  });

  it('matches trigger and sends welcome message', async () => {
    automationRepo.findActiveFlowByType.mockResolvedValue(flow);
    whatsappRepo.findContactByPhone.mockResolvedValue({ id: 'c1', metadata: {} });
    cache.getFlowState.mockResolvedValue(null);
    evolutionApi.sendText.mockResolvedValue({ key: { id: 'x' } });
    conversationRepo.findConversationByContact.mockResolvedValue(null);
    conversationRepo.createConversation.mockResolvedValue({ id: 'conv1' });
    conversationRepo.createMessage.mockResolvedValue({});
    automationRepo.incrementMessagesCount.mockResolvedValue({});

    const result = await service.processIncomingMessage({ companyId: C1, number, from: '5511', text: 'oi' });

    expect(result.flowId).toBe('f1');
    expect(result.stepId).toBe('welcome');
    expect(evolutionApi.sendText).toHaveBeenCalledWith('inst1', '5511', 'Olá {nome}!', 800);
    expect(cache.setFlowState).toHaveBeenCalled();
  });

  it('matches a question option and continues to the next step', async () => {
    const qFlow = {
      id: 'f2',
      is_active: true,
      config_json: {
        defaultStep: 'menu',
        steps: [
          { id: 'menu', type: 'question', content: 'Escolha:', options: [{ label: 'Pedido', value: 'pedido', next: 'welcome' }], next: 'welcome' },
          { id: 'welcome', type: 'message', content: 'Pedido recebido!', next: null },
        ],
      },
    };
    automationRepo.findActiveFlowByType.mockResolvedValue(qFlow);
    automationRepo.findFlowById.mockResolvedValue(null);
    whatsappRepo.findContactByPhone.mockResolvedValue({ id: 'c1', metadata: { flowStep: 'menu', flowId: 'f2', vars: {} } });
    cache.getFlowState.mockResolvedValue(null);
    evolutionApi.sendText.mockResolvedValue({});
    conversationRepo.findConversationByContact.mockResolvedValue(null);
    conversationRepo.createConversation.mockResolvedValue({ id: 'conv1' });
    conversationRepo.createMessage.mockResolvedValue({});
    automationRepo.incrementMessagesCount.mockResolvedValue({});

    const result = await service.processIncomingMessage({ companyId: C1, number, from: '5511', text: 'pedido' });

    expect(result.stepId).toBe('welcome');
  });

  it('persists the flowId so the sub-flow continues', async () => {
    const subFlow = { id: 'sub1', is_active: true, config_json: { defaultStep: 'a', steps: [{ id: 'a', type: 'message', content: 'sub', next: null }] } };
    automationRepo.findFlowById.mockResolvedValue(subFlow);
    whatsappRepo.findContactByPhone.mockResolvedValue({ id: 'c1', metadata: { flowStep: 'a', flowId: 'sub1', vars: {} } });
    cache.getFlowState.mockResolvedValue(null);
    evolutionApi.sendText.mockResolvedValue({});
    conversationRepo.findConversationByContact.mockResolvedValue(null);
    conversationRepo.createConversation.mockResolvedValue({ id: 'conv1' });
    conversationRepo.createMessage.mockResolvedValue({});
    automationRepo.incrementMessagesCount.mockResolvedValue({});

    const result = await service.processIncomingMessage({ companyId: C1, number, from: '5511', text: 'continuando' });

    expect(automationRepo.findFlowById).toHaveBeenCalledWith(C1, 'sub1');
    expect(result.flowId).toBe('sub1');
  });
});

describe('executeStep webhook', () => {
  it('executes a webhook step and advances', async () => {
    global.fetch = vi.fn().mockResolvedValue({ json: async () => ({ ok: true }) });
    const step = { id: 'w', type: 'webhook', url: 'https://api.example.com/hook', method: 'POST', next: 'next1', responseVar: 'resp' };
    const result = await service.testFlow(C1, 'wf', { vars: {} });
    expect(result.executed).toBeDefined();
    global.fetch = undefined;
  });
});

describe('quick replies', () => {
  it('creates quick reply and rejects duplicates', async () => {
    automationRepo.listQuickReplies.mockResolvedValue([{ shortcut: 'pix' }]);
    await expect(service.createQuickReply(C1, 'u1', { shortcut: 'PIX', messageText: 'ok' })).rejects.toMatchObject({ code: 'CONFLICT' });
    automationRepo.listQuickReplies.mockResolvedValue([]);
    automationRepo.createQuickReply.mockImplementation((d) => Promise.resolve({ id: 'qr1', ...d }));
    const qr = await service.createQuickReply(C1, 'u1', { shortcut: 'pix', messageText: 'ok' });
    expect(qr.id).toBe('qr1');
  });

  it('increments usage', async () => {
    automationRepo.findQuickReplyById.mockResolvedValue({ id: 'qr1', shortcut: 'pix', message_text: 'ok' });
    automationRepo.incrementQuickReplyUsage.mockResolvedValue({});
    const result = await service.useQuickReply(C1, 'qr1');
    expect(result.messageText).toBe('ok');
    expect(automationRepo.incrementQuickReplyUsage).toHaveBeenCalledWith('qr1');
  });
});
