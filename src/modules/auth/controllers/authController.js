import * as authService from '../services/authService.js';
import { loginSchema, registerSchema, registerStoreSchema, refreshTokenSchema, forgotPasswordSchema, resetPasswordSchema, switchCompanySchema } from '../validators/authValidators.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const login = asyncHandler(async (req, res) => {
  const validatedData = loginSchema.parse(req.body);
  
  const result = await authService.login(validatedData.email, validatedData.password);
  
  return successResponse(res, result, 200);
});

export const registerStore = asyncHandler(async (req, res) => {
  const validatedData = registerStoreSchema.parse(req.body);
  const result = await authService.registerStore(validatedData);
  return createdResponse(res, result);
});

export const register = asyncHandler(async (req, res) => {
  const validatedData = registerSchema.parse(req.body);
  
  const result = await authService.register(validatedData, req.user.companyId);
  
  return createdResponse(res, result);
});

export const refresh = asyncHandler(async (req, res) => {
  const validatedData = refreshTokenSchema.parse(req.body);
  
  const tokens = await authService.refreshTokens(validatedData.refreshToken);
  
  return successResponse(res, tokens);
});

export const logout = asyncHandler(async (req, res) => {
  const validatedData = refreshTokenSchema.parse(req.body);
  await authService.logout(validatedData.refreshToken);
  return successResponse(res, { message: 'Logged out successfully' });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);
  
  return successResponse(res, user);
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = forgotPasswordSchema.parse(req.body);
  const result = await authService.forgotPassword(email);
  return successResponse(res, result);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = resetPasswordSchema.parse(req.body);
  const result = await authService.resetPassword(token, password);
  return successResponse(res, result);
});

export const switchCompany = asyncHandler(async (req, res) => {
  const { companyId } = switchCompanySchema.parse(req.body);
  const result = await authService.switchCompany(req.user.id, companyId);
  return successResponse(res, result);
});

export default {
  login,
  registerStore,
  register,
  refresh,
  logout,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  switchCompany,
};
