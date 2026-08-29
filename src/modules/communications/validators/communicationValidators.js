import { z } from 'zod';

export const communicationSchema = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(10000),
  audience: z.enum(['store', 'employees', 'customers', 'drivers', 'resellers', 'administrators']),
  channel: z.enum(['in_app', 'email', 'whatsapp', 'sms']),
  priority: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  scheduledAt: z.coerce.date().optional(),
}).strict();

export const communicationIdSchema = z.object({ id: z.string().uuid() }).strict();
