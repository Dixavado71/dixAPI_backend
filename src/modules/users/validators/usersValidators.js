import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres.').max(255),
  email: z.string().email('E-mail inválido.'),
  phone: z.string().max(20).nullable().optional(),
  avatarUrl: z.string().url('URL inválida.').nullable().optional(),
  password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres.'),
  role: z.enum(['admin', 'manager', 'operator']),
  isActive: z.boolean().optional(),
  language: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
}).strict();

export const updateUserSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  phone: z.string().max(20).nullable().optional(),
  avatarUrl: z.string().url('URL inválida.').nullable().optional(),
  role: z.enum(['admin', 'manager', 'operator']).optional(),
  isActive: z.boolean().optional(),
  language: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
}).strict();

export const listUsersQuerySchema = z.object({
  role: z.enum(['admin', 'manager', 'operator']).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
}).strict();

export default { createUserSchema, updateUserSchema, listUsersQuerySchema };