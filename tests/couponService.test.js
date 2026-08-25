import { describe, expect, it, vi } from 'vitest';

const repository = {
  findCoupon: vi.fn(),
  countCustomerRedemptions: vi.fn(),
  redeemCoupon: vi.fn(),
};

vi.mock('../src/modules/coupons/repositories/couponRepository.js', () => repository);
const { validateCoupon, redeemCoupon } = await import('../src/modules/coupons/services/couponService.js');

const baseCoupon = { id: 'coupon-1', status: 'active', starts_at: null, ends_at: null, usage_limit: null, usage_count: 0, minimum_amount: null, per_customer_limit: null };

describe('coupon service', () => {
  it('rejects coupon from another tenant', async () => {
    repository.findCoupon.mockResolvedValue(null);
    await expect(validateCoupon({ companyId: '00000000-0000-0000-0000-000000000001', code: 'SAVE', subtotal: 10 })).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
  });

  it('rejects expired or inactive coupons', async () => {
    repository.findCoupon.mockResolvedValue({ ...baseCoupon, status: 'expired' });
    await expect(validateCoupon({ companyId: '00000000-0000-0000-0000-000000000001', code: 'SAVE', subtotal: 10 })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('requires an order before redemption', async () => {
    await expect(redeemCoupon({ companyId: '00000000-0000-0000-0000-000000000001', code: 'SAVE', subtotal: 10 })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});
