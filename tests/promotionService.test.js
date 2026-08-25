import { beforeEach, describe, expect, it, vi } from 'vitest';

const repository = { createPromotion: vi.fn(), createCoupon: vi.fn() };
vi.mock('../src/modules/promotions/repositories/promotionRepository.js', () => repository);
const { createPromotion, createCoupon } = await import('../src/modules/promotions/services/promotionService.js');

describe('promotion service', () => {
  beforeEach(() => vi.clearAllMocks());
  it('rejects inverted promotion window', async () => {
    await expect(createPromotion('company-1', { name: 'X', type: 'percentage', value: 10, startsAt: new Date('2026-02-02'), endsAt: new Date('2026-02-01') })).rejects.toMatchObject({ code: 'CONFLICT' });
  });
  it('rejects duplicate coupon codes', async () => {
    repository.createCoupon.mockRejectedValue({ code: 'P2002' });
    await expect(createCoupon('company-1', { code: 'SAVE', discountType: 'percentage', discountValue: 10 })).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});
