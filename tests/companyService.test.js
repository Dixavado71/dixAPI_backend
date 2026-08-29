import { describe, it, expect, vi, beforeEach } from 'vitest';

const repo = {
  findAll: vi.fn(),
  findById: vi.fn(),
  findByCnpj: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
};
vi.mock('../src/modules/companies/repositories/companyRepository.js', () => repo);

const service = await import('../src/modules/companies/services/companyService.js');

const rawCompany = {
  id: 'comp1',
  name: 'Loja Demo',
  trade_name: 'Demo LTDA',
  cnpj: '12345678000199',
  address_street: 'Rua A',
  address_number: '10',
  address_city: 'São Paulo',
  address_state: 'SP',
  is_active: true,
  company_type: 'store',
  logo_url: 'https://img.com/logo.png',
  whatsapp_enabled: true,
  ecommerce_enabled: true,
  default_currency: 'BRL',
  status: 'active',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
};

describe('companyService DTO (camelCase)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps company to camelCase', async () => {
    repo.findById.mockResolvedValue(rawCompany);
    const result = await service.getById('comp1', 'c1');
    expect(result).toMatchObject({
      tradeName: 'Demo LTDA',
      logoUrl: 'https://img.com/logo.png',
      addressStreet: 'Rua A',
      isActive: true,
      companyType: 'store',
      whatsappEnabled: true,
      ecommerceEnabled: true,
      defaultCurrency: 'BRL',
    });
    expect(result.trade_name).toBeUndefined();
    expect(result.logo_url).toBeUndefined();
  });

  it('getAll maps each company', async () => {
    repo.findAll.mockResolvedValue({ companies: [rawCompany], total: 1 });
    const result = await service.getAll('c1', {});
    expect(result.companies[0].tradeName).toBe('Demo LTDA');
    expect(result.total).toBe(1);
  });
});