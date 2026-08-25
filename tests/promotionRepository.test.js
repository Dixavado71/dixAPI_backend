import { describe, expect, it, vi } from 'vitest';

const findMany = vi.fn().mockResolvedValue([]);

vi.mock('../src/infrastructure/database/prismaClient.js', () => ({
  default: {
    coupon: { findMany },
  },
}));

describe('Promotion repository queries', () => {
  it('lists coupons using a schema field', async () => {
    const repository = await import('../src/modules/promotions/repositories/promotionRepository.js');
    await repository.listCoupons('company-id');
    expect(findMany).toHaveBeenCalledWith({
      where: { company_id: 'company-id' },
      orderBy: { code: 'asc' },
    });
  });
});
