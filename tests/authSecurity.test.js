import { beforeEach, describe, expect, it, vi } from 'vitest';

const repository = {
  findUsersByEmail: vi.fn(),
  updateUserLastLogin: vi.fn(),
  createRefreshToken: vi.fn(),
  findRefreshToken: vi.fn(),
  revokeUserRefreshTokens: vi.fn(),
  findUserById: vi.fn(),
  findActiveMembership: vi.fn(),
};

vi.mock('../src/modules/auth/repositories/authRepository.js', () => repository);
vi.mock('../src/infrastructure/security/password.js', () => ({
  comparePassword: vi.fn().mockResolvedValue(true),
  hashPassword: vi.fn().mockResolvedValue('password-hash'),
}));
vi.mock('../src/infrastructure/security/jwt.js', () => ({
  generateAccessToken: vi.fn().mockReturnValue('access-token'),
  generateRefreshToken: vi.fn().mockReturnValue('refresh-token'),
  verifyRefreshToken: vi.fn().mockReturnValue({ id: 'user-1', companyId: 'company-1' }),
}));

const { login, refreshTokens, getCurrentUser } = await import('../src/modules/auth/services/authService.js');

const company = { id: 'company-1', name: 'Store', trade_name: null, logo_url: null, status: 'active' };
const membership = { user_id: 'user-1', company_id: 'company-1', role: 'admin', company };
const user = { id: 'user-1', email: 'user@example.test', name: 'User', phone: null, password_hash: 'hash', is_active: true, company, UserCompany: [membership] };

describe('auth service security', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects ambiguous email accounts instead of selecting a tenant', async () => {
    repository.findUsersByEmail.mockResolvedValue([user, { ...user, id: 'user-2' }]);

    await expect(login(user.email, 'Password!1')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(repository.updateUserLastLogin).not.toHaveBeenCalled();
  });

  it('uses the active membership tenant and role when issuing tokens', async () => {
    repository.findUsersByEmail.mockResolvedValue([user]);
    repository.createRefreshToken.mockResolvedValue({});

    const result = await login(user.email, 'Password!1');

    expect(result.user.company.id).toBe('company-1');
    expect(result.user.role).toBe('admin');
    expect(repository.createRefreshToken).toHaveBeenCalledWith('user-1', 'refresh-token', expect.any(Date));
  });

  it('uses active membership context in current user response', async () => {
    repository.findUserById.mockResolvedValue({ ...user, UserCompany: [membership] });
    const result = await getCurrentUser(user.id);
    expect(result.role).toBe('admin');
    expect(result.company.id).toBe('company-1');
  });

  it('rejects current user without active membership', async () => {
    repository.findUserById.mockResolvedValue({ ...user, UserCompany: [] });
    await expect(getCurrentUser(user.id)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('revokes all sessions after refresh token reuse', async () => {
    repository.findRefreshToken.mockResolvedValue({ id: 'token-1', user_id: 'user-1', revoked_at: new Date(), expires_at: new Date(Date.now() + 10000) });

    await expect(refreshTokens('reused-token')).rejects.toMatchObject({ message: 'Refresh token reuse detected' });
    expect(repository.revokeUserRefreshTokens).toHaveBeenCalledWith('user-1');
  });
});
