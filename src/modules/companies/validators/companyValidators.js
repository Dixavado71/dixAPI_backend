import { z } from 'zod';

export const companyParamsSchema = z.object({ id: z.string().uuid() }).strict();

export const createCompanySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  trade_name: z.string().optional(),
  cnpj: z.string().regex(/^\d{14}$/, 'CNPJ must have 14 digits'),
  address_street: z.string().optional(),
  address_number: z.string().optional(),
  address_complement: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  logo_url: z.string().url().optional().or(z.literal('')),
  is_active: z.boolean().default(true),
});

export const updateCompanySchema = createCompanySchema.partial();

export default {
  createCompanySchema,
  updateCompanySchema,
};
