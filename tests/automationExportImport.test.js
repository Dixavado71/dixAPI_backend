import { describe, it, expect, vi, beforeEach } from 'vitest';

const repository = {
  findFlowById: vi.fn(),
  createFlow: vi.fn(),
};
vi.mock('../src/modules/automation/repositories/automationRepository.js', () => repository);

vi.mock('../src/modules/whatsapp/repositories/whatsappRepository.js', () => ({}));
vi.mock('../src/modules/conversations/repositories/conversationRepository.js', () => ({}));
vi.mock('../src/infrastructure/whatsapp/evolutionApiClient.js', () => ({}));
vi.mock('../src/modules/automation/cache/chatbotCache.js', () => ({ default: {} }));
vi.mock('../src/modules/orders/services/orderService.js', () => ({ createOrder: vi.fn() }));
vi.mock('../src/modules/notifications/services/notificationService.js', () => ({ notifyAttendants: vi.fn(), dispatchEvent: vi.fn() }));
vi.mock('../src/shared/whatsapp/customer.js', () => ({ findOrCreateCustomer: vi.fn() }));

const service = await import('../src/modules/automation/services/automationService.js');

const flowDef = {
  id: 'f1',
  company_id: 'c1',
  name: 'Vendas',
  type: 'vendas',
  description: 'Fluxo de vendas',
  icon_emoji: '🛍️',
  is_active: true,
  config_json: {
    steps: [{ id: 's1', type: 'message', content: 'Olá', next: null }],
    triggers: [{ keyword: 'ola', step: 's1' }],
    defaultStep: 's1',
  },
};

describe('automation export/import de flows', () => {
  beforeEach(() => vi.clearAllMocks());

  it('exports a flow as importable JSON', async () => {
    repository.findFlowById.mockResolvedValue(flowDef);
    const result = await service.exportFlow('c1', 'f1');
    expect(result).toMatchObject({
      name: 'Vendas',
      type: 'vendas',
      iconEmoji: '🛍️',
      isActive: true,
    });
    expect(result.config.steps[0].id).toBe('s1');
    expect(result.config.triggers[0].keyword).toBe('ola');
  });

  it('throws NotFoundError when flow missing on export', async () => {
    repository.findFlowById.mockResolvedValue(null);
    await expect(service.exportFlow('c1', 'missing')).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
  });

  it('imports a flow with camelCase config', async () => {
    repository.createFlow.mockImplementation((data) => Promise.resolve({ ...data, id: 'f2' }));
    const result = await service.importFlow('c1', {
      name: 'Importado',
      type: 'suporte',
      config: {
        steps: [{ id: 'x1', type: 'message', content: 'Oi', next: null }],
        defaultStep: 'x1',
      },
    });
    expect(repository.createFlow).toHaveBeenCalledWith(expect.objectContaining({
      company_id: 'c1',
      name: 'Importado',
      type: 'suporte',
    }));
    expect(result.id).toBe('f2');
  });

  it('rejects import with dangling step reference', async () => {
    await expect(service.importFlow('c1', {
      name: 'Inválido',
      type: 'vendas',
      config: { steps: [{ id: 'x1', type: 'message', content: 'Oi', next: 'nao-existe' }], defaultStep: 'x1' },
    })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});