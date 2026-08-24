import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  avatar_url: z.string().url().optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'manager', 'operator']).default('operator'),
  language: z.string().default('pt-BR'),
  timezone: z.string().default('America/Sao_Paulo'),
  is_active: z.boolean().default(true),
});

export const updateUserSchema = createUserSchema.partial();

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export default {
  createUserSchema,
  updateUserSchema,
  loginSchema,
};
