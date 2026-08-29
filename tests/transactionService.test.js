import { describe, it, expect, vi, beforeEach } from 'vitest';

const repo = {
  findAll: vi.fn(),
  create: vi.fn(),
};
vi.mock('../src/modules/transactions/repositories/transactionRepository.js', () => repo);

const service = await import('../src/modules/transactions/services/transactionService.js');

const rawTx = {
  id: 't1',
  order_id: 'o1',
  description: 'Venda',
  type: 'income',
  category: 'Vendas',
  value: 100.5,
  status: 'completed',
  payment_method: 'pix',
  transaction_date: '2026-01-01T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
};

describe('transactionService DTO (camelCase)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps transaction to camelCase', async () => {
    repo.findAll.mockResolvedValue([rawTx]);
    const result = await service.list('c1', {});
    expect(result[0]).toMatchObject({
      orderId: 'o1',
      paymentMethod: 'pix',
      transactionDate: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result[0].order_id).toBeUndefined();
    expect(result[0].payment_method).toBeUndefined();
  });
});