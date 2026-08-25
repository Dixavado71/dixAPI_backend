import { z } from 'zod';

export const customerParamsSchema = z.object({ id: z.string().uuid() }).strict();

export const customerSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório').max(120),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(10, 'Telefone é obrigatório').max(20),
  segment: z.enum(['VIP', 'FREQUENTE', 'OCASIONAL', 'NOVO']).default('NOVO'),
  status: z.enum(['ATIVO', 'INATIVO']).default('ATIVO'),
  address: z.string().max(255).optional(),
  notes: z.string().max(500).optional(),
}).strict();

export const customerUpdateSchema = customerSchema.partial();