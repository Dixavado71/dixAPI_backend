import { z } from 'zod';
import { idParamSchema } from '../../../shared/validators/commonSchemas.js';

export const catalogQuerySchema = z.object({
  kind: z.enum(['store_category', 'service_category']).optional(),
  categoryId: z.string().uuid().optional(),
}).strict();

export const categoryParamsSchema = idParamSchema;
export const serviceParamsSchema = idParamSchema;

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
