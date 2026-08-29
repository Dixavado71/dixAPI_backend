import { describe, it, expect, vi, beforeEach } from 'vitest';

const repo = {
  listUsers: vi.fn(),
  findUserById: vi.fn(),
  findUserByEmail: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  createMembership: vi.fn(),
  updateMembership: vi.fn(),
};
vi.mock('../src/modules/users/repositories/usersRepository.js', () => repo);
vi.mock('../src/infrastructure/security/password.js', () => ({ hashPassword: vi.fn().mockResolvedValue('hashed') }));

const service = await import('../src/modules/users/services/usersService.js');

const rawUser = {
  id: 'u1',
  name: 'Ana',
  email: 'ana@x.com',
  phone: '5511999999999',
  avatar_url: 'https://img.com/a.png',
  role: 'operator',
  is_active: true,
  last_login_at: '2026-01-02T00:00:00.000Z',
  created_at: '2026-01-01T00:00:00.000Z',
  UserCompany: [{ role: 'operator' }],
};

describe('usersService DTO (camelCase)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps user to camelCase', async () => {
    repo.listUsers.mockResolvedValue([rawUser]);
    const result = await service.listUsers('c1', {});
    expect(result[0]).toMatchObject({
      avatarUrl: 'https://img.com/a.png',
      isActive: true,
      lastLoginAt: '2026-01-02T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result[0].avatar_url).toBeUndefined();
    expect(result[0].is_active).toBeUndefined();
  });
});