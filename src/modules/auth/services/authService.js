import { UnauthorizedError, ConflictError, BadRequestError } from '../../../shared/errors/AppError.js';
import { hashPassword, comparePassword } from '../../../infrastructure/security/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../../infrastructure/security/jwt.js';
import * as authRepository from '../repositories/authRepository.js';

function refreshExpiresAt() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

function collectCompanies(memberships) {
  return memberships.map((m) => ({
    id: m.company.id,
    name: m.company.name,
    trade_name: m.company.trade_name,
    logo_url: m.company.logo_url,
    role: m.role,
  }));
}

async function issueTokens(user, membership) {
  const companyId = membership.company_id;
  let role = membership.role === 'owner' ? 'admin' : membership.role;
  if (user.role === 'master' || user.role === 'reseller') role = user.role;
  const accessToken = generateAccessToken({ id: user.id, email: user.email, companyId, role });
  const refreshToken = generateRefreshToken({ id: user.id, companyId });
  await authRepository.createRefreshToken(user.id, refreshToken, refreshExpiresAt());
  return { accessToken, refreshToken };
}

function effectiveRole(user, membership) {
  if (user.role === 'master' || user.role === 'reseller') return user.role;
  return membership.role === 'owner' ? 'admin' : membership.role;
}

export async function login(email, password) {
  const users = await authRepository.findUsersByEmail(email);
  if (users.length === 0) throw new UnauthorizedError('Invalid credentials');

  let matchedUser = null;
  for (const user of users) {
    if (user.is_active && await comparePassword(password, user.password_hash)) {
      matchedUser = user;
      break;
    }
  }
  if (!matchedUser) throw new UnauthorizedError('Invalid credentials');

  const memberships = matchedUser.UserCompany.filter((m) => m.status === 'active' && !m.removed_at);
  if (memberships.length === 0) throw new UnauthorizedError('Invalid credentials');

  const primary = memberships.find((m) => m.is_primary) ?? memberships[0];
  const company = primary.company;
  if (!company || company.status !== 'active') throw new UnauthorizedError('Invalid credentials');

  await authRepository.updateUserLastLogin(matchedUser.id);
  return {
    user: {
      id: matchedUser.id, name: matchedUser.name, email: matchedUser.email, phone: matchedUser.phone,
      avatar_url: matchedUser.avatar_url, role: effectiveRole(matchedUser, primary), language: matchedUser.language,
      timezone: matchedUser.timezone,
      company: { id: company.id, name: company.name, trade_name: company.trade_name, logo_url: company.logo_url },
    },
    companies: collectCompanies(memberships),
    tokens: await issueTokens(matchedUser, primary),
  };
}

export async function registerStore(data) {
  const existingUsers = await authRepository.findUsersByEmail(data.email);
  if (existingUsers.some((u) => u.UserCompany?.some((m) => m.status === 'active' && !m.removed_at))) {
    throw new ConflictError('Este e-mail já está cadastrado em uma loja ativa.');
  }
  let resellerId = null;
  if (data.affiliateCode) {
    const affiliate = await authRepository.findResellerByAffiliateCode(data.affiliateCode);
    if (affiliate) resellerId = affiliate.reseller_id;
  }
  const passwordHash = await hashPassword(data.password);
  const result = await authRepository.createStoreWithSubscription({
    companyName: data.companyName,
    companyTradeName: data.companyTradeName ?? data.companyName,
    cnpj: data.cnpj ?? null,
    adminName: data.adminName,
    email: data.email,
    phone: data.phone ?? null,
    passwordHash,
    planCode: data.planCode ?? 'simple',
    resellerId,
  });

  const membership = result.membership;
  const company = result.company;
  const user = result.user;

  return {
    user: {
      id: user.id, name: user.name, email: user.email, phone: user.phone,
      avatar_url: user.avatar_url, role: membership.role, language: user.language,
      timezone: user.timezone,
      company: { id: company.id, name: company.name, trade_name: company.trade_name, logo_url: company.logo_url },
    },
    companies: [{ id: company.id, name: company.name, trade_name: company.trade_name, logo_url: company.logo_url, role: membership.role }],
    tokens: await issueTokens(user, { company_id: company.id, role: membership.role }),
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
  const memberships = user.UserCompany.filter((m) => m.status === 'active' && !m.removed_at);
  const membership = memberships[0];
  const company = membership?.company;
  if (!membership || !company || company.status !== 'active') throw new UnauthorizedError('Active membership not found');
  return {
    id: user.id, name: user.name, email: user.email, phone: user.phone,
    avatar_url: user.avatar_url, role: effectiveRole(user, membership), language: user.language,
    timezone: user.timezone, is_active: user.is_active, last_login_at: user.last_login_at,
    company: { id: membership.company_id, name: company.name, trade_name: company.trade_name, logo_url: company.logo_url },
    companies: collectCompanies(memberships),
  };
}

export default { login, registerStore, register, refreshTokens, logout, logoutAll, getCurrentUser };
