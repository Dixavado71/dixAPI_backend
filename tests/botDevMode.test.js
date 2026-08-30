import { describe, it, expect, vi, beforeEach } from 'vitest';

const repository = {
  getBotConfig: vi.fn(),
  findNumberById: vi.fn(),
  findCustomerByPhone: vi.fn(),
  findContactByPhone: vi.fn(),
  listActiveProducts: vi.fn(),
  upsertContact: vi.fn(),
  createMessage: vi.fn(),
  findMessageByExternalId: vi.fn(),
  createMessageLog: vi.fn(),
};

vi.mock('../src/modules/whatsapp/repositories/whatsappRepository.js', () => repository);
vi.mock('../src/modules/automation/cache/chatbotCache.js', () => ({ default: { getFlowState: vi.fn(), setFlowState: vi.fn(), clearFlowState: vi.fn() } }));
vi.mock('../src/config/logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));

const { shouldBotRespond } = await import('../src/modules/whatsapp/services/whatsappService.js');

const C1 = '00000000-0000-0000-0000-000000000001';
const N1 = { id: 'n1', company_id: C1, phone_number: '5511999999999' };

beforeEach(() => {
  vi.clearAllMocks();
  repository.findNumberById.mockResolvedValue(N1);
});

describe('modo dev/teste (shouldBotRespond)', () => {
  it('dev_mode desligado preserva comportamento public', async () => {
    repository.getBotConfig.mockResolvedValue({ mode: 'public' });
    const r = await shouldBotRespond(C1, 'n1', '5511999999999');
    expect(r).toEqual({ allowed: true, reason: 'public' });
  });

  it('dev_mode ligado + numero do proprio bot -> allowed', async () => {
    repository.getBotConfig.mockResolvedValue({ dev_mode: true, dev_whitelist: [] });
    const r = await shouldBotRespond(C1, 'n1', '5511999999999');
    expect(r).toEqual({ allowed: true, reason: 'dev_mode' });
  });

  it('dev_mode ligado + numero na whitelist -> allowed', async () => {
    repository.getBotConfig.mockResolvedValue({ dev_mode: true, dev_whitelist: ['5511888888888'] });
    const r = await shouldBotRespond(C1, 'n1', '5511888888888');
    expect(r).toEqual({ allowed: true, reason: 'dev_mode' });
  });

  it('dev_mode ligado + numero fora da whitelist -> denied', async () => {
    repository.getBotConfig.mockResolvedValue({ dev_mode: true, dev_whitelist: ['5511888888888'] });
    const r = await shouldBotRespond(C1, 'n1', '5511777777777');
    expect(r).toEqual({ allowed: false, reason: 'dev_mode_denied' });
  });

  it('dev_mode ligado + whitelist vazia -> apenas o proprio numero responde', async () => {
    repository.getBotConfig.mockResolvedValue({ dev_mode: true, dev_whitelist: [] });
    const deny = await shouldBotRespond(C1, 'n1', '5511777777777');
    expect(deny).toEqual({ allowed: false, reason: 'dev_mode_denied' });
  });

  it('dev_mode ligado + numero do bot sem prefixo 55 tambem reconhecido', async () => {
    repository.getBotConfig.mockResolvedValue({ dev_mode: true, dev_whitelist: [] });
    const r = await shouldBotRespond(C1, 'n1', '5511999999999');
    expect(r.allowed).toBe(true);
  });

  it('dev_mode ligado + modo customers_only ainda assim respeita dev guard primeiro', async () => {
    repository.getBotConfig.mockResolvedValue({ dev_mode: true, mode: 'customers_only', dev_whitelist: [] });
    const deny = await shouldBotRespond(C1, 'n1', '5511777777777');
    expect(deny).toEqual({ allowed: false, reason: 'dev_mode_denied' });
    const own = await shouldBotRespond(C1, 'n1', '5511999999999');
    expect(own).toEqual({ allowed: true, reason: 'dev_mode' });
  });
});
