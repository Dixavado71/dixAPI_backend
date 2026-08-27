import { describe, it, expect, vi } from 'vitest';

const mockPrisma = {
  order: {
    aggregate: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  customer: { count: vi.fn(), groupBy: vi.fn() },
  conversation: { count: vi.fn(), groupBy: vi.fn() },
  $queryRaw: vi.fn(),
};

vi.mock('../src/infrastructure/database/prismaClient.js', () => ({ default: mockPrisma }));

const repo = await import('../src/modules/dashboard/repositories/dashboardRepository.js');

const C1 = '00000000-0000-0000-0000-000000000001';

describe('dashboard repository', () => {
  it('computes revenue, segments percentage and monthly series', async () => {
    mockPrisma.order.aggregate.mockResolvedValue({ _sum: { total: 1000n } });
    mockPrisma.order.count.mockResolvedValue(4);
    mockPrisma.customer.count.mockResolvedValue(10);
    mockPrisma.conversation.count.mockResolvedValue(6);
    mockPrisma.order.groupBy.mockResolvedValue([
      { order_date: new Date('2026-08-01T12:00:00.000Z'), _sum: { total: 250n }, _count: { _all: 1 } },
      { order_date: new Date('2026-08-02T12:00:00.000Z'), _sum: { total: 750n }, _count: { _all: 3 } },
    ]);
    mockPrisma.$queryRaw.mockResolvedValue([
      { id: 'p1', name: 'Combo', total_sales: 5, revenue: '900.00' },
    ]);
    mockPrisma.customer.groupBy.mockResolvedValue([
      { segment: 'vip', _count: { _all: 3 } },
      { segment: 'new', _count: { _all: 7 } },
    ]);
    mockPrisma.conversation.groupBy.mockResolvedValue([
      { channel: 'whatsapp', _count: { _all: 6 } },
    ]);

    const result = await repo.getOverview(C1, { from: '2026-08-01', to: '2026-08-31' });

    expect(result.revenue).toBe(1000);
    expect(result.totalOrders).toBe(4);
    expect(result.monthlyRevenue).toHaveLength(2);
    expect(result.monthlyRevenue[0].revenue).toBe(250);
    expect(result.topProducts[0].name).toBe('Combo');
    expect(result.customerSegments.find((s) => s.segment === 'vip').percentage).toBe(30);
    expect(result.conversationsByChannel[0].count).toBe(6);
  });

  it('guards against division by zero on empty segments', async () => {
    mockPrisma.order.aggregate.mockResolvedValue({ _sum: { total: 0n } });
    mockPrisma.order.count.mockResolvedValue(0);
    mockPrisma.customer.count.mockResolvedValue(0);
    mockPrisma.conversation.count.mockResolvedValue(0);
    mockPrisma.order.groupBy.mockResolvedValue([]);
    mockPrisma.$queryRaw.mockResolvedValue([]);
    mockPrisma.customer.groupBy.mockResolvedValue([]);
    mockPrisma.conversation.groupBy.mockResolvedValue([]);

    const result = await repo.getOverview(C1, {});
    expect(result.revenue).toBe(0);
    expect(result.customerSegments).toEqual([]);
  });
});
