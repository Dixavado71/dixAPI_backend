import { z } from 'zod';
import { idParamSchema } from '../../../shared/validators/commonSchemas.js';

export const companyParamsSchema = idParamSchema;

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

export const updateCompanySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  trade_name: z.string().optional(),
  cnpj: z.string().regex(/^\d{14}$/, 'CNPJ must have 14 digits').optional(),
  address_street: z.string().optional(),
  address_number: z.string().optional(),
  address_complement: z.string().optional(),
  address_city: z.string().optional(),
  address_state: z.string().optional(),
  address_zip: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')).optional(),
  description: z.string().optional(),
  logo_url: z.string().url().optional().or(z.literal('')).optional(),
  legal_name: z.string().optional(),
  state_registration: z.string().optional(),
  support_email: z.string().email('Support e-mail must be valid').optional().or(z.literal('')),
  support_phone: z.string().optional(),
  whatsapp_enabled: z.boolean().optional(),
  ecommerce_enabled: z.boolean().optional(),
  default_currency: z.string().min(3).max(3).optional(),
  is_active: z.boolean().optional(),
});

export default {
  createCompanySchema,
  updateCompanySchema,
};
