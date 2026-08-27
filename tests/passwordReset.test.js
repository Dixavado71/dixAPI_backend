import { describe, it, expect, vi, beforeEach } from 'vitest';

const repository = {
  findActiveUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  updateUserPassword: vi.fn(),
  revokeUserRefreshTokens: vi.fn(),
};

const jwtMock = {
  generatePasswordResetToken: vi.fn(() => 'reset-token-abc'),
  verifyPasswordResetToken: vi.fn(() => 'user-1'),
};

vi.mock('../src/modules/auth/repositories/authRepository.js', () => repository);
vi.mock('../src/infrastructure/security/password.js', () => ({ hashPassword: vi.fn().mockResolvedValue('new-hash') }));
vi.mock('../src/infrastructure/security/jwt.js', () => jwtMock);
vi.mock('../src/config/env.js', () => ({ env: { nodeEnv: 'development', publicApiUrl: 'http://localhost:7171' } }));

const { forgotPassword, resetPassword } = await import('../src/modules/auth/services/authService.js');

beforeEach(() => vi.clearAllMocks());

describe('forgotPassword', () => {
  it('does not reveal whether the email exists', async () => {
    repository.findActiveUserByEmail.mockResolvedValue(null);
    const result = await forgotPassword('ghost@example.test');
    expect(result.sent).toBe(true);
    expect(jwtMock.generatePasswordResetToken).not.toHaveBeenCalled();
  });

  it('generates a reset link for existing user in development', async () => {
    repository.findActiveUserByEmail.mockResolvedValue({ id: 'user-1', email: 'a@example.test' });
    const result = await forgotPassword('a@example.test');
    expect(jwtMock.generatePasswordResetToken).toHaveBeenCalledWith('user-1');
    expect(result.resetUrl).toContain('reset-token-abc');
  });
});

describe('resetPassword', () => {
  it('rejects invalid token', async () => {
    jwtMock.verifyPasswordResetToken.mockImplementation(() => { throw new Error('Invalid reset token'); });
    await expect(resetPassword('bad-token', 'NovaSenha1')).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('updates password and revokes sessions for valid token', async () => {
    jwtMock.verifyPasswordResetToken.mockReturnValue('user-1');
    repository.findUserById.mockResolvedValue({ id: 'user-1', is_active: true });
    const result = await resetPassword('reset-token-abc', 'NovaSenha1');
    expect(repository.updateUserPassword).toHaveBeenCalledWith('user-1', 'new-hash');
    expect(repository.revokeUserRefreshTokens).toHaveBeenCalledWith('user-1');
    expect(result.message).toContain('redefinida');
  });

  it('rejects reset for inactive user', async () => {
    jwtMock.verifyPasswordResetToken.mockReturnValue('user-1');
    repository.findUserById.mockResolvedValue({ id: 'user-1', is_active: false });
    await expect(resetPassword('reset-token-abc', 'NovaSenha1')).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
  });
});
