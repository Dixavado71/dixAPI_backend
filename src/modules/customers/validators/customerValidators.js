import { z } from 'zod';

export const customerParamsSchema = z.object({ id: z.string().uuid() }).strict();

export const customerSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório').max(120),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().min(10, 'Telefone é obrigatório').max(20),
  segment: z.enum(['vip', 'frequent', 'occasional', 'new']).default('new'),
  status: z.enum(['active', 'inactive']).default('active'),
}).strict();

export const customerUpdateSchema = customerSchema.partial();