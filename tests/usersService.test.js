import { describe, it, expect, vi, beforeEach } from 'vitest';

const repository = {
  listUsers: vi.fn(),
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  createMembership: vi.fn(),
  updateMembership: vi.fn(),
};

vi.mock('../src/modules/users/repositories/usersRepository.js', () => repository);
vi.mock('../src/infrastructure/security/password.js', () => ({ hashPassword: vi.fn().mockResolvedValue('hashed') }));

const usersService = await import('../src/modules/users/services/usersService.js');

const C1 = '00000000-0000-0000-0000-000000000001';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('users service (store scope)', () => {
  it('lists users of the tenant', async () => {
    repository.listUsers.mockResolvedValue([
      { id: 'u1', name: 'Ana', email: 'ana@x.com', role: 'operator', is_active: true, UserCompany: [{ role: 'operator' }] },
    ]);
    const result = await usersService.listUsers(C1, {});
    expect(repository.listUsers).toHaveBeenCalledWith(C1, {});
    expect(result[0].id).toBe('u1');
  });

  it('rejects operator role creation by manager', async () => {
    await expect(
      usersService.createUser(C1, 'manager', { name: 'Jo', email: 'jo@x.com', password: 'Senha123!', role: 'admin' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('creates operator by manager with membership', async () => {
    repository.findUserByEmail.mockResolvedValue(null);
    repository.createUser.mockImplementation((data) => Promise.resolve({ id: 'u2', ...data }));
    repository.createMembership.mockResolvedValue({});
    repository.findUserById.mockResolvedValue({ id: 'u2', name: 'Jo', email: 'jo@x.com', role: 'operator', is_active: true, UserCompany: [{ role: 'operator' }] });

    const result = await usersService.createUser(C1, 'manager', { name: 'Jo', email: 'jo@x.com', password: 'Senha123!', role: 'operator' });
    expect(repository.createMembership).toHaveBeenCalledWith(expect.objectContaining({ company_id: C1, role: 'operator', is_primary: true }));
    expect(result.id).toBe('u2');
  });

  it('rejects duplicate email in the tenant', async () => {
    repository.findUserByEmail.mockResolvedValue({ id: 'u1' });
    await expect(
      usersService.createUser(C1, 'admin', { name: 'Jo', email: 'jo@x.com', password: 'Senha123!', role: 'operator' }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('deactivates user on remove (admin only)', async () => {
    repository.findUserById.mockResolvedValue({ id: 'u1', name: 'Ana', role: 'operator' });
    repository.updateUser.mockResolvedValue({});
    repository.updateMembership.mockResolvedValue({});
    const result = await usersService.removeUser(C1, 'admin', 'actor-1', 'u1');
    expect(repository.updateUser).toHaveBeenCalledWith(C1, 'u1', { is_active: false });
    expect(result.deleted).toBe(true);
  });

  it('blocks remove by manager', async () => {
    repository.findUserById.mockResolvedValue({ id: 'u1', name: 'Ana', role: 'operator' });
    await expect(usersService.removeUser(C1, 'manager', 'actor-1', 'u1')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('blocks manager from deactivating an admin', async () => {
    repository.findUserById.mockResolvedValue({ id: 'u1', name: 'Ana', role: 'admin', UserCompany: [{ role: 'admin' }] });
    await expect(
      usersService.updateUser(C1, 'manager', 'actor-1', 'u1', { isActive: false }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('blocks admin from removing themselves', async () => {
    repository.findUserById.mockResolvedValue({ id: 'u1', name: 'Ana', role: 'admin', UserCompany: [{ role: 'admin' }] });
    await expect(usersService.removeUser(C1, 'admin', 'u1', 'u1')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
