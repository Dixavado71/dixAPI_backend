import { z } from 'zod';

export const catalogQuerySchema = z.object({
  kind: z.enum(['store_category', 'service_category']).optional(),
  categoryId: z.string().uuid().optional(),
}).strict();

export const categoryParamsSchema = z.object({ id: z.string().uuid() }).strict();
export const serviceParamsSchema = z.object({ id: z.string().uuid() }).strict();

export const companyCategorySchema = z.object({
  categoryId: z.string().uuid(),
  customName: z.string().trim().min(1).max(120).optional(),
  isPrimary: z.boolean().optional(),
}).strict();

export const companyServiceSchema = z.object({
  serviceId: z.string().uuid(),
  customName: z.string().trim().min(1).max(120).optional(),
  enabled: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
}).strict();
