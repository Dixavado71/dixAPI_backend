import { describe, it, expect, vi, beforeEach } from 'vitest';

const repo = {
  findSubscription: vi.fn(),
  subscribeAndBill: vi.fn(),
  confirmPaymentAndActivate: vi.fn(),
};
vi.mock('../src/modules/billing/repositories/billingRepository.js', () => repo);

const service = await import('../src/modules/billing/services/billingService.js');

const rawPlan = {
  id: 'plan-1',
  code: 'simple',
  name: 'Simples',
  monthly_price: '49.90',
  yearly_price: '499.00',
  trial_days: 7,
  max_users: 3,
  max_products: 50,
  max_orders_month: 100,
  max_drivers: 2,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const rawSubscription = {
  id: 'sub-1',
  company_id: 'c1',
  plan_id: 'plan-1',
  status: 'active',
  billing_cycle: 'monthly',
  price: '49.90',
  started_at: '2026-01-01T00:00:00.000Z',
  current_period_start: '2026-01-01T00:00:00.000Z',
  current_period_end: '2026-02-01T00:00:00.000Z',
  trial_ends_at: null,
  grace_ends_at: null,
  cancel_at_period_end: false,
  cancelled_at: null,
  external_customer_id: null,
  external_subscription_id: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  plan: rawPlan,
};

describe('billingService DTO (camelCase)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps subscription to camelCase', async () => {
    repo.findSubscription.mockResolvedValue(rawSubscription);
    const result = await service.getMySubscription('c1');
    expect(result).toMatchObject({
      billingCycle: 'monthly',
      currentPeriodEnd: '2026-02-01T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    });
    expect(result.plan).toMatchObject({
      monthlyPrice: '49.90',
      yearlyPrice: '499.00',
      trialDays: 7,
    });
    expect(result.billing_cycle).toBeUndefined();
    expect(result.plan.monthly_price).toBeUndefined();
  });

  it('throws NotFoundError when no subscription', async () => {
    repo.findSubscription.mockResolvedValue(null);
    await expect(service.getMySubscription('c1')).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
  });
});