import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
}).strict();

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character'),
  phone: z.string().optional(),
}).strict();

export const registerStoreSchema = z.object({
  companyName: z.string().min(2, 'Nome da loja deve ter pelo menos 2 caracteres.').max(80),
  companyTradeName: z.string().max(120).optional(),
  cnpj: z.string().optional(),
  adminName: z.string().min(2, 'Nome do administrador deve ter pelo menos 2 caracteres.'),
  email: z.string().email('Digite um e-mail válido.'),
  phone: z.string().optional(),
  password: z.string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres.')
    .regex(/[A-Z]/, 'Use ao menos uma letra maiúscula.')
    .regex(/[a-z]/, 'Use ao menos uma letra minúscula.')
    .regex(/\d/, 'Use ao menos um número.'),
  planCode: z.enum(['simple', 'silver', 'diamond']).optional(),
  affiliateCode: z.string().optional(),
}).strict();

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Digite um e-mail válido.'),
}).strict();

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório.'),
  password: z.string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres.')
    .regex(/[A-Z]/, 'Use ao menos uma letra maiúscula.')
    .regex(/[a-z]/, 'Use ao menos uma letra minúscula.')
    .regex(/\d/, 'Use ao menos um número.'),
}).strict();

export const switchCompanySchema = z.object({
  companyId: z.string().uuid('ID da loja inválido.'),
}).strict();

export default {
  loginSchema,
  registerSchema,
  registerStoreSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  switchCompanySchema,
};
