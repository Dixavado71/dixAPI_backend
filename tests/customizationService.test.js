import { describe, it, expect, vi, beforeEach } from 'vitest';

const repo = {
  getCustomization: vi.fn(),
  upsertCustomization: vi.fn(),
};
vi.mock('../src/modules/promotions/repositories/promotionRepository.js', () => repo);

const service = await import('../src/modules/companies/services/customizationService.js');

const rawCustomization = {
  id: 'cz1',
  company_id: 'c1',
  brand_name: 'Minha Loja',
  primary_color: '#f59e0b',
  secondary_color: '#075E54',
  logo_url: 'https://img.com/logo.png',
  whatsapp_greeting: 'Olá!',
  whatsapp_fallback: 'Não entendi',
  storefront_config: { theme: 'dark' },
  bot_config: { mode: 'public' },
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
};

describe('customizationService DTO (camelCase)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps customization to camelCase', async () => {
    repo.getCustomization.mockResolvedValue(rawCustomization);
    const result = await service.getCustomization('c1');
    expect(result).toMatchObject({
      companyId: 'c1',
      brandName: 'Minha Loja',
      primaryColor: '#f59e0b',
      whatsappGreeting: 'Olá!',
      whatsappFallback: 'Não entendi',
      storefrontConfig: { theme: 'dark' },
      botConfig: { mode: 'public' },
    });
    expect(result.brand_name).toBeUndefined();
    expect(result.whatsapp_greeting).toBeUndefined();
  });
});