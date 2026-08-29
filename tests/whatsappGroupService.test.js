import { describe, it, expect, vi, beforeEach } from 'vitest';

const repository = {
  findMembershipByUser: vi.fn(),
  listAttendants: vi.fn(),
  createMessageLog: vi.fn(),
};

const cache = { nextRoundRobin: vi.fn() };

vi.mock('../src/modules/whatsapp/repositories/whatsappRepository.js', () => repository);
vi.mock('../src/modules/automation/cache/chatbotCache.js', () => ({ default: cache }));

const { resolveForwardTarget } = await import('../src/modules/whatsapp/services/whatsappService.js');

const C1 = '00000000-0000-0000-0000-000000000001';
const N1 = { id: 'n1', company_id: C1, external_account_id: 'inst1' };

beforeEach(() => {
  vi.clearAllMocks();
  cache.nextRoundRobin.mockResolvedValue(0);
});

describe('resolveForwardTarget', () => {
  it('returns fixed phone number', async () => {
    const group = { forward_rule: { mode: 'fixed', phone: '5511999999999' } };
    const result = await resolveForwardTarget(C1, N1, group);
    expect(result).toBe('5511999999999');
  });

  it('returns null for fixed without phone', async () => {
    const group = { forward_rule: { mode: 'fixed', phone: null } };
    const result = await resolveForwardTarget(C1, N1, group);
    expect(result).toBeNull();
  });

  it('returns operator phone by attendantId', async () => {
    repository.findMembershipByUser.mockResolvedValue({ user: { phone: '5511888888888' } });
    const group = { forward_rule: { mode: 'operator', attendantId: 'u1' } };
    const result = await resolveForwardTarget(C1, N1, group);
    expect(repository.findMembershipByUser).toHaveBeenCalledWith(C1, 'u1');
    expect(result).toBe('5511888888888');
  });

  it('returns null when operator has no phone', async () => {
    repository.findMembershipByUser.mockResolvedValue({ user: { phone: null } });
    const group = { forward_rule: { mode: 'operator', attendantId: 'u1' } };
    const result = await resolveForwardTarget(C1, N1, group);
    expect(result).toBeNull();
  });

  it('returns first available attendant phone by role', async () => {
    repository.listAttendants.mockResolvedValue([
      { user: { phone: '5511999991111' } },
      { user: { phone: '5511999992222' } },
    ]);
    const group = { forward_rule: { mode: 'group', attendantRole: 'operator' } };
    const result = await resolveForwardTarget(C1, N1, group);
    expect(repository.listAttendants).toHaveBeenCalledWith(C1, ['operator']);
    expect(result).toBe('5511999991111');
  });

  it('returns null when no attendants with phone', async () => {
    repository.listAttendants.mockResolvedValue([{ user: { phone: null } }]);
    const group = { forward_rule: { mode: 'group', attendantRole: 'operator' } };
    const result = await resolveForwardTarget(C1, N1, group);
    expect(result).toBeNull();
  });

  it('uses round-robin and rotates index', async () => {
    cache.nextRoundRobin.mockResolvedValue(1);
    repository.listAttendants.mockResolvedValue([
      { user: { phone: '5511999991111' } },
      { user: { phone: '5511999992222' } },
    ]);
    const group = { forward_rule: { mode: 'round_robin', roles: ['operator'] } };
    const result = await resolveForwardTarget(C1, N1, group);
    expect(cache.nextRoundRobin).toHaveBeenCalledWith(C1, group.id, 2);
    expect(result).toBe('5511999992222');
  });
});