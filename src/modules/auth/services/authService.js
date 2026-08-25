import { UnauthorizedError, ConflictError, BadRequestError } from '../../../shared/errors/AppError.js';
import { hashPassword, comparePassword } from '../../../infrastructure/security/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../../infrastructure/security/jwt.js';
import * as authRepository from '../repositories/authRepository.js';

function refreshExpiresAt() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

async function issueTokens(user, membership) {
  const companyId = membership.company_id;
  const role = membership.role === 'owner' ? 'admin' : membership.role;
  const accessToken = generateAccessToken({ id: user.id, email: user.email, companyId, role });
  const refreshToken = generateRefreshToken({ id: user.id, companyId });
  await authRepository.createRefreshToken(user.id, refreshToken, refreshExpiresAt());
  return { accessToken, refreshToken };
}

export async function login(email, password) {
  const users = await authRepository.findUsersByEmail(email);
  const user = users.length === 1 ? users[0] : null;
  const membership = user?.UserCompany?.[0];
  const company = membership?.company;
  if (!user || !user.is_active || !membership || !company || company.status !== 'active') throw new UnauthorizedError('Invalid credentials');
  if (!(await comparePassword(password, user.password_hash))) throw new UnauthorizedError('Invalid credentials');
  await authRepository.updateUserLastLogin(user.id);
  return {
    user: {
      id: user.id, name: user.name, email: user.email, phone: user.phone,
      avatar_url: user.avatar_url, role: membership.role, language: user.language,
      timezone: user.timezone,
      company: { id: membership.company_id, name: company.name, trade_name: company.trade_name, logo_url: company.logo_url },
    },
    tokens: await issueTokens(user, membership),
  };
}

export async function register(userData, companyId) {
  const existingUsers = await authRepository.findUsersByEmail(userData.email);
  if (existingUsers.some(user => user.UserCompany?.some(membership => membership.company_id === companyId))) throw new ConflictError('Email already registered in this company');
  const hashedPassword = await hashPassword(userData.password);
  const user = await authRepository.createUser({
    name: userData.name, email: userData.email, password_hash: hashedPassword,
    phone: userData.phone, company_id: companyId, role: 'operator',
  });
  const membership = await authRepository.createMembership(user.id, companyId, 'operator');
  return { user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: membership.role }, tokens: await issueTokens(user, membership) };
}

export async function refreshTokens(refreshToken) {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    const storedToken = await authRepository.findRefreshToken(refreshToken);
    if (!storedToken || storedToken.user_id !== decoded.id) throw new UnauthorizedError('Invalid refresh token');
    if (storedToken.revoked_at) {
      await authRepository.revokeUserRefreshTokens(decoded.id);
      throw new UnauthorizedError('Refresh token reuse detected');
    }
    if (storedToken.expires_at <= new Date()) throw new UnauthorizedError('Invalid refresh token');
    const user = await authRepository.findUserById(decoded.id);
    const membership = user ? await authRepository.findActiveMembership(user.id, decoded.companyId) : null;
    if (!user || !user.is_active || !membership || user.company.status !== 'active') throw new UnauthorizedError('Invalid refresh token');
    await authRepository.revokeRefreshToken(storedToken.id);
    return issueTokens(user, membership);
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}

export async function logout(refreshToken) {
  if (!refreshToken) return;
  const storedToken = await authRepository.findRefreshToken(refreshToken);
  if (storedToken && !storedToken.revoked_at) await authRepository.revokeRefreshToken(storedToken.id);
}

export async function logoutAll(userId) {
  await authRepository.revokeUserRefreshTokens(userId);
}

export async function getCurrentUser(userId) {
  const user = await authRepository.findUserById(userId);
  if (!user) throw new BadRequestError('User not found');
  const membership = user.UserCompany?.[0];
  const company = membership?.company;
  if (!membership || !company || company.status !== 'active') throw new UnauthorizedError('Active membership not found');
  return {
    id: user.id, name: user.name, email: user.email, phone: user.phone,
    avatar_url: user.avatar_url, role: membership.role, language: user.language,
    timezone: user.timezone, is_active: user.is_active, last_login_at: user.last_login_at,
    company: { id: membership.company_id, name: company.name, trade_name: company.trade_name, logo_url: company.logo_url },
  };
}

export default { login, register, refreshTokens, logout, logoutAll, getCurrentUser };
