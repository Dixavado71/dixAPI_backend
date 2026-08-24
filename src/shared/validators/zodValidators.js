import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.string().optional().transform(v => parseInt(v, 10) || 1),
  limit: z.string().optional().transform(v => Math.min(100, Math.max(1, parseInt(v, 10) || 20))),
});

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export default {
  paginationSchema,
  idParamSchema,
  loginSchema,
  refreshSchema,
};
