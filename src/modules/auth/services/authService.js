import { UnauthorizedError, ConflictError, BadRequestError } from '../../../shared/errors/AppError.js';
import { hashPassword, comparePassword } from '../../../infrastructure/security/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../../infrastructure/security/jwt.js';
import * as authRepository from '../repositories/authRepository.js';

export async function login(email, password) {
  const user = await authRepository.findUserByEmail(email);
  
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }
  
  if (!user.is_active) {
    throw new UnauthorizedError('User account is inactive');
  }
  
  const isValidPassword = await comparePassword(password, user.password_hash);
  
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid credentials');
  }
  
  await authRepository.updateUserLastLogin(user.id);
  
  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    companyId: user.company_id,
    role: user.role,
  });
  
  const refreshToken = generateRefreshToken({
    id: user.id,
    email: user.email,
    companyId: user.company_id,
  });
  
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar_url: user.avatar_url,
      role: user.role,
      language: user.language,
      timezone: user.timezone,
      company: {
        id: user.company.id,
        name: user.company.name,
        trade_name: user.company.trade_name,
        logo_url: user.company.logo_url,
      },
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  };
}

export async function register(userData) {
  const existingUser = await authRepository.findUserByEmail(userData.email);
  
  if (existingUser) {
    throw new ConflictError('Email already registered');
  }
  
  const hashedPassword = await hashPassword(userData.password);
  
  const user = await authRepository.createUser({
    name: userData.name,
    email: userData.email,
    password_hash: hashedPassword,
    phone: userData.phone,
    company_id: userData.companyId,
    role: userData.role,
  });
  
  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    companyId: user.company_id,
    role: user.role,
  });
  
  const refreshToken = generateRefreshToken({
    id: user.id,
    email: user.email,
    companyId: user.company_id,
  });
  
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    },
    tokens: {
      accessToken,
      refreshToken,
    },
  };
}

export async function refreshTokens(refreshToken) {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    
    const user = await authRepository.findUserById(decoded.id);
    
    if (!user || !user.is_active) {
      throw new UnauthorizedError('Invalid refresh token');
    }
    
    const newAccessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      companyId: user.company_id,
      role: user.role,
    });
    
    const newRefreshToken = generateRefreshToken({
      id: user.id,
      email: user.email,
      companyId: user.company_id,
    });
    
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}

export async function getCurrentUser(userId) {
  const user = await authRepository.findUserById(userId);
  
  if (!user) {
    throw new BadRequestError('User not found');
  }
  
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar_url: user.avatar_url,
    role: user.role,
    language: user.language,
    timezone: user.timezone,
    is_active: user.is_active,
    last_login_at: user.last_login_at,
    company: {
      id: user.company.id,
      name: user.company.name,
      trade_name: user.company.trade_name,
      logo_url: user.company.logo_url,
    },
  };
}

export default {
  login,
  register,
  refreshTokens,
  getCurrentUser,
};
