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
  getBotConfig: vi.fn().mockResolvedValue({}),
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
vi.mock('../src/modules/automation/cache/chatbotCache.js', () => ({ default: cache }));
vi.mock('../src/config/env.js', () => ({ env: { logLevel: 'silent' } }));
vi.mock('../src/config/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../src/modules/notifications/services/notificationService.js', () => ({
  notifyAttendants: vi.fn().mockResolvedValue([]),
  notifyAttendantsAsync: vi.fn(),
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

  it('uses the flow bound to the number (flow_id) before type fallback', async () => {
    const boundFlow = {
      id: 'bound1',
      is_active: true,
      config_json: {
        defaultStep: 'a',
        steps: [{ id: 'a', type: 'message', content: 'Fluxo do numero', next: null }],
        triggers: [{ keyword: 'oi', step: 'a' }],
      },
    };
    automationRepo.findFlowById.mockResolvedValue(boundFlow);
    automationRepo.findActiveFlowByType.mockResolvedValue({ id: 'generic', is_active: true, config_json: { defaultStep: 'g', steps: [{ id: 'g', type: 'message', content: 'generico', next: null }] } });
    whatsappRepo.findContactByPhone.mockResolvedValue({ id: 'c1', metadata: {} });
    cache.getFlowState.mockResolvedValue(null);
    evolutionApi.sendText.mockResolvedValue({ key: { id: 'x' } });
    conversationRepo.findConversationByContact.mockResolvedValue(null);
    conversationRepo.createConversation.mockResolvedValue({ id: 'conv1' });
    conversationRepo.createMessage.mockResolvedValue({});
    automationRepo.incrementMessagesCount.mockResolvedValue({});

    const boundNumber = { ...number, flow_id: 'bound1' };
    const result = await service.processIncomingMessage({ companyId: C1, number: boundNumber, from: '5511', text: 'oi' });

    expect(result.flowId).toBe('bound1');
    expect(evolutionApi.sendText).toHaveBeenCalledWith('inst1', '5511', 'Fluxo do numero', 0);
    expect(automationRepo.findActiveFlowByType).not.toHaveBeenCalled();
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
    expect(evolutionApi.sendText).toHaveBeenCalledWith('inst1', '5511', 'Olá {nome}!', 0);
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

describe('auto-chain e retry de question', () => {
  it('encadeia steps message consecutivos sem input do usuário', async () => {
    const chainFlow = {
      id: 'chain1', is_active: true,
      config_json: {
        defaultStep: 's1',
        steps: [
          { id: 's1', type: 'message', content: 'Primeiro', next: 's2' },
          { id: 's2', type: 'message', content: 'Segundo', next: null },
        ],
      },
    };
    automationRepo.findActiveFlowByType.mockResolvedValue(chainFlow);
    whatsappRepo.findContactByPhone.mockResolvedValue({ id: 'c1', metadata: {} });
    cache.getFlowState.mockResolvedValue(null);
    evolutionApi.sendText.mockResolvedValue({});
    conversationRepo.findConversationByContact.mockResolvedValue(null);
    conversationRepo.createConversation.mockResolvedValue({ id: 'conv1' });
    conversationRepo.createMessage.mockResolvedValue({});
    automationRepo.incrementMessagesCount.mockResolvedValue({});

    await service.processIncomingMessage({ companyId: C1, number, from: '5511', text: 'oi' });

    expect(evolutionApi.sendText).toHaveBeenCalledTimes(2);
    expect(evolutionApi.sendText.mock.calls[0][2]).toBe('Primeiro');
    expect(evolutionApi.sendText.mock.calls[1][2]).toBe('Segundo');
  });

  it('transfere para atendente após 3 tentativas sem match', async () => {
    const qFlow = {
      id: 'qf', is_active: true,
      config_json: {
        defaultStep: 'menu',
        steps: [
          { id: 'menu', type: 'question', content: 'Escolha:', options: [{ label: 'Pedido', value: 'pedido', next: 'menu' }], next: 'menu' },
        ],
      },
    };
    automationRepo.findActiveFlowByType.mockResolvedValue(qFlow);
    automationRepo.findFlowById.mockResolvedValue(null);
    whatsappRepo.findContactByPhone.mockResolvedValue({ id: 'c1', metadata: { flowStep: 'menu', flowId: 'qf', vars: { questionAttempts: 2 } } });
    cache.getFlowState.mockResolvedValue(null);
    evolutionApi.sendText.mockResolvedValue({});
    conversationRepo.findConversationByContact.mockResolvedValue(null);
    conversationRepo.createConversation.mockResolvedValue({ id: 'conv1' });
    conversationRepo.createMessage.mockResolvedValue({});
    automationRepo.incrementMessagesCount.mockResolvedValue({});

    const result = await service.processIncomingMessage({ companyId: C1, number, from: '5511', text: 'qualquer coisa' });

    expect(result.cleared).toBe(true);
    expect(cache.clearFlowState).toHaveBeenCalledWith(C1, '5511');
    expect(evolutionApi.sendText).toHaveBeenCalledWith('inst1', '5511', 'Não consegui entender. Vou transferir para um atendente.', 0);
  });

  it('captures client text into a variable step (mode input)', async () => {
    const varFlow = {
      id: 'vf', is_active: true,
      config_json: {
        defaultStep: 'capturar',
        steps: [
          { id: 'capturar', type: 'variable', variable: 'produto_selecionado', mode: 'input', next: 'detalhe' },
          { id: 'detalhe', type: 'message', content: 'Detalhe do {produto_selecionado}', next: null },
        ],
      },
    };
    automationRepo.findActiveFlowByType.mockResolvedValue(varFlow);
    automationRepo.findFlowById.mockResolvedValue(null);
    whatsappRepo.findContactByPhone.mockResolvedValue({ id: 'c1', metadata: { flowStep: 'capturar', flowId: 'vf', vars: {} } });
    cache.getFlowState.mockResolvedValue(null);
    evolutionApi.sendText.mockResolvedValue({});
    conversationRepo.findConversationByContact.mockResolvedValue(null);
    conversationRepo.createConversation.mockResolvedValue({ id: 'conv1' });
    conversationRepo.createMessage.mockResolvedValue({});
    automationRepo.incrementMessagesCount.mockResolvedValue({});

    const result = await service.processIncomingMessage({ companyId: C1, number, from: '5511', text: 'Caixa de Chocolates' });

    expect(evolutionApi.sendText).toHaveBeenCalledWith('inst1', '5511', 'Detalhe do Caixa de Chocolates', 0);
    expect(result.stepId).toBe('detalhe');
  });
});

describe('executeStep webhook', () => {
  it('records a webhook step in the simulation', async () => {
    automationRepo.findFlowById.mockResolvedValue({
      id: 'wf', is_active: true,
      config_json: {
        defaultStep: 'w',
        steps: [{ id: 'w', type: 'webhook', url: 'https://api.example.com/hook', method: 'POST', next: null, responseVar: 'resp' }],
      },
    });
    const result = await service.testFlow(C1, 'wf', { vars: {} });
    expect(result.executed.map((e) => e.type)).toContain('webhook');
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
