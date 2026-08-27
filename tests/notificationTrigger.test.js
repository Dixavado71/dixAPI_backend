import { describe, it, expect, vi, beforeEach } from 'vitest';

const repo = {
  listTriggers: vi.fn(),
  listAttendantUsers: vi.fn(),
  createNotification: vi.fn(),
  findTriggerById: vi.fn(),
  findTriggerByEvent: vi.fn(),
  createTrigger: vi.fn(),
  updateTrigger: vi.fn(),
  deleteTrigger: vi.fn(),
};

vi.mock('../src/modules/notifications/repositories/notificationRepository.js', () => repo);
vi.mock('../src/modules/automation/services/templateEngine.js', () => ({
  fillTemplate: (t, vars) => String(t).replace(/{nome}/g, vars?.nome ?? ''),
}));

const service = await import('../src/modules/notifications/services/notificationService.js');

const C1 = '00000000-0000-0000-0000-000000000001';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('dispatchEvent', () => {
  it('does nothing when no active triggers match', async () => {
    repo.listTriggers.mockResolvedValue([]);
    const result = await service.dispatchEvent({ companyId: C1, event: 'order_created' });
    expect(result.dispatched).toBe(0);
  });

  it('creates in-app notifications for app-channel trigger', async () => {
    repo.listTriggers.mockResolvedValue([
      { id: 't1', event: 'order_created', channel: 'app', is_active: true, template: 'Novo pedido de {nome}', recipient_rule: { mode: 'group', role: 'admin' } },
    ]);
    repo.listAttendantUsers.mockResolvedValue([
      { user_id: 'u1', role: 'admin', user: { phone: null } },
    ]);
    repo.createNotification.mockResolvedValue({ id: 'n1' });

    const result = await service.dispatchEvent({ companyId: C1, event: 'order_created', vars: { nome: 'Maria' } });
    expect(repo.createNotification).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'u1', company_id: C1, message: 'Novo pedido de Maria' }));
    expect(result.dispatched).toBe(1);
  });

  it('does not dispatch when no recipients match the rule', async () => {
    repo.listTriggers.mockResolvedValue([
      { id: 't1', event: 'delivery_assigned', channel: 'app', is_active: true, template: 'Entrega', recipient_rule: { mode: 'operator', attendantId: 'u99' } },
    ]);
    repo.listAttendantUsers.mockResolvedValue([{ user_id: 'u1', role: 'operator', user: { phone: null } }]);

    const result = await service.dispatchEvent({ companyId: C1, event: 'delivery_assigned' });
    expect(repo.createNotification).not.toHaveBeenCalled();
    expect(result.dispatched).toBe(0);
  });

  it('rejects duplicate trigger for same event/channel', async () => {
    repo.findTriggerByEvent.mockResolvedValue({ id: 't1' });
    await expect(service.createTrigger(C1, 'u1', { event: 'order_created', channel: 'app' })).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('creates a trigger with defaults', async () => {
    repo.findTriggerByEvent.mockResolvedValue(null);
    repo.createTrigger.mockImplementation((data) => Promise.resolve({ id: 't2', ...data }));
    const result = await service.createTrigger(C1, 'u1', { event: 'stock_low', template: 'Estoque baixo' });
    expect(repo.createTrigger).toHaveBeenCalledWith(expect.objectContaining({ company_id: C1, event: 'stock_low', channel: 'app', is_active: true }));
    expect(result.id).toBe('t2');
  });
});