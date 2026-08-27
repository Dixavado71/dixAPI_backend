import * as authService from '../services/authService.js';
import { loginSchema, registerSchema, registerStoreSchema, refreshTokenSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/authValidators.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';

export async function login(req, res, next) {
  try {
    const validatedData = loginSchema.parse(req.body);
    
    const result = await authService.login(validatedData.email, validatedData.password);
    
    return successResponse(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function registerStore(req, res, next) {
  try {
    const validatedData = registerStoreSchema.parse(req.body);
    const result = await authService.registerStore(validatedData);
    return createdResponse(res, result);
  } catch (error) {
    next(error);
  }
}

export async function register(req, res, next) {
  try {
    const validatedData = registerSchema.parse(req.body);
    
    const result = await authService.register(validatedData, req.user.companyId);
    
    return createdResponse(res, result);
  } catch (error) {
    next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const validatedData = refreshTokenSchema.parse(req.body);
    
    const tokens = await authService.refreshTokens(validatedData.refreshToken);
    
    return successResponse(res, tokens);
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const validatedData = refreshTokenSchema.parse(req.body);
    await authService.logout(validatedData.refreshToken);
    return successResponse(res, { message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(req, res, next) {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    
    return successResponse(res, user);
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const result = await authService.forgotPassword(email);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const result = await authService.resetPassword(token, password);
    return successResponse(res, result);
  } catch (error) {
    next(error);
  }
}

export default {
  login,
  registerStore,
  register,
  refresh,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword,
};
