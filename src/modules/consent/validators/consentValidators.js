import { z } from 'zod';
import { customerIdParamSchema } from '../../../shared/validators/commonSchemas.js';

export const customerParamsSchema = customerIdParamSchema;

export const consentSchema = z.object({
  customerId: z.string().uuid(),
  status: z.enum(['unknown', 'opted_in', 'opted_out']),
  source: z.string().trim().min(1).max(100),
  purpose: z.string().trim().min(1).max(160),
  retentionUntil: z.coerce.date().optional(),
  evidenceRef: z.string().trim().max(255).optional(),
}).strict();
