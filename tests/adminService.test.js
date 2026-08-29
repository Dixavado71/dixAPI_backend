import { describe, it, expect, vi, beforeEach } from 'vitest';

const repo = {
  findAllStores: vi.fn(),
  findAllPayments: vi.fn(),
  countStores: vi.fn(),
  countPayments: vi.fn(),
  findPlanByCode: vi.fn(),
  findByEmail: vi.fn(),
  createStore: vi.fn(),
  createAdminUser: vi.fn(),
  createAdminMembership: vi.fn(),
  createAdminSubscription: vi.fn(),
  createPlatformTransaction: vi.fn(),
  findResellerByUserId: vi.fn(),
};
vi.mock('../src/modules/admin/repositories/adminRepository.js', () => repo);
vi.mock('../src/infrastructure/security/password.js', () => ({ hashPassword: vi.fn().mockResolvedValue('hashed') }));

const service = await import('../src/modules/admin/services/adminService.js');

const makeStore = (overrides = {}) => ({
  id: 's1',
  name: 'Loja Demo',
  trade_name: 'Demo LTDA',
  status: 'active',
  subscription: { status: 'active', price: '49.90', plan: { name: 'Simples', code: 'simple' } },
  support_email: 'loja@demo.com',
  created_at: '2026-01-01T00:00:00.000Z',
  _count: { orders: 5, customers: 10 },
  reseller: null,
  ...overrides,
});

describe('adminService (master overview)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('computeOverview aggregates stores and payments', async () => {
    repo.findAllStores.mockResolvedValue([makeStore()]);
    repo.findAllPayments.mockResolvedValue([
      { id: 'p1', company: { name: 'Loja Demo' }, amount: '49.90', status: 'paid', created_at: '2026-08-01T00:00:00.000Z' },
    ]);
    repo.countStores.mockResolvedValue(1);

    const result = await service.getOverview();
    expect(result.activeStores).toBe(1);
    expect(result.totalStores).toBe(1);
    expect(result.mrr).toBeCloseTo(49.9);
    expect(result.paidThisMonth).toBeCloseTo(49.9);
    expect(result.recentStores[0]).toMatchObject({ tradeName: 'Demo LTDA', planCode: 'simple' });
    expect(result.recentStores[0].trade_name).toBeUndefined();
    expect(result.recentPayments[0].storeName).toBe('Loja Demo');
  });

  it('listStores maps storeDto to camelCase', async () => {
    repo.findAllStores.mockResolvedValue([makeStore()]);
    repo.countStores.mockResolvedValue(1);
    const result = await service.listStores(1, 20);
    expect(result.data[0].tradeName).toBe('Demo LTDA');
    expect(result.total).toBe(1);
  });
});