import { describe, it, expect, vi, beforeEach } from 'vitest';

const repo = {
  findSettings: vi.fn(),
  upsertSettings: vi.fn(),
  findOrderWithItems: vi.fn(),
  listScheduledOrders: vi.fn(),
  findLastSchedule: vi.fn(),
  findScheduleByOrder: vi.fn(),
  createSchedule: vi.fn(),
  updateSchedule: vi.fn(),
  updateOrderDates: vi.fn(),
};
vi.mock('../src/modules/production/repositories/productionRepository.js', () => repo);

const whatsappRepo = {
  getBotConfig: vi.fn(),
};
vi.mock('../src/modules/whatsapp/repositories/whatsappRepository.js', () => whatsappRepo);

vi.mock('../src/infrastructure/whatsapp/evolutionApiClient.js', () => ({
  sendText: vi.fn().mockResolvedValue({ key: { id: 'k1' } }),
}));

vi.mock('../src/config/logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const production = await import('../src/modules/production/services/productionService.js');

const order = {
  id: 'o1',
  order_number: 'MK-20260829-A7F3',
  customer: { name: 'João' },
  order_items: [
    { quantity: 2, product: { estimated_production_days: 2 } },
    { quantity: 1, product: { estimated_production_days: 3 } },
  ],
};

describe('productionService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('adds business days skipping weekends by default', () => {
    // sexta-feira 2026-08-28 -> +1 dia útil = segunda-feira 2026-08-31
    const friday = new Date('2026-08-28T10:00:00.000Z');
    const result = production.addBusinessDays(friday, 1, undefined);
    expect(result.getDay()).toBe(1); // segunda
    expect(result.toISOString().slice(0, 10)).toBe('2026-08-31');
  });

  it('respects custom working days (mon..fri indexes)', () => {
    const sunday = new Date('2026-08-30T10:00:00.000Z');
    const result = production.addBusinessDays(sunday, 1, ['mon', 'tue', 'wed', 'thu', 'fri']);
    expect(result.getDay()).toBe(1);
  });

  it('estimates order days from product production days * quantity', async () => {
    repo.findOrderWithItems.mockResolvedValue(order);
    const days = await production.estimateOrderDays('c1', 'o1');
    expect(days).toBe(2 * 2 + 1 * 3); // 7
  });

  it('schedules order chained after the last schedule', async () => {
    repo.findSettings.mockResolvedValue({ working_days: ['mon', 'tue', 'wed', 'thu', 'fri'] });
    repo.findLastSchedule.mockResolvedValue({ scheduled_date: new Date('2026-08-31T10:00:00.000Z') });
    repo.findOrderWithItems.mockResolvedValue(order);
    repo.findScheduleByOrder.mockResolvedValue(null);
    repo.createSchedule.mockResolvedValue({ id: 's1' });

    const result = await production.scheduleOrder('c1', 'o1');

    expect(result.estimatedDays).toBe(7);
    expect(repo.createSchedule).toHaveBeenCalled();
    expect(repo.updateOrderDates).toHaveBeenCalledWith('c1', 'o1', expect.objectContaining({
      expected_completion_at: expect.any(Date),
      delivery_eta_at: expect.any(Date),
    }));
  });

  it('builds a workflow report listing scheduled orders', async () => {
    repo.listScheduledOrders.mockResolvedValue([
      { scheduled_date: new Date('2026-08-31T10:00:00.000Z'), status: 'in_progress', order: { order_number: 'MK-1', customer: { name: 'Ana' } } },
      { scheduled_date: new Date('2026-09-01T10:00:00.000Z'), status: 'scheduled', order: { order_number: 'MK-2', customer: { name: 'João' } } },
    ]);
    const report = await production.getWorkflowReport('c1');
    expect(report).toContain('MK-1');
    expect(report).toContain('EM PRODUÇÃO');
    expect(report).toContain('MK-2');
  });

  it('returns empty message when no schedules', async () => {
    repo.listScheduledOrders.mockResolvedValue([]);
    const report = await production.getWorkflowReport('c1');
    expect(report).toContain('Nenhum pedido agendado');
  });

  it('sends workflow report to owner phone', async () => {
    repo.listScheduledOrders.mockResolvedValue([]);
    whatsappRepo.getBotConfig.mockResolvedValue({ ownerPhone: '5511999999999' });
    const number = { external_account_id: 'inst1' };
    const result = await production.sendWorkflowReportToOwner('c1', number);
    expect(result).not.toBeNull();
  });
});
