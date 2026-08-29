import { z } from 'zod';

export const paymentEventSchema = z.object({
  paymentId: z.string().uuid(),
  provider: z.string().trim().min(1).max(64),
  providerEventId: z.string().trim().min(1).max(255),
  eventType: z.enum(['paid', 'authorized', 'refunded', 'failed', 'cancelled']),
  providerTimestamp: z.coerce.date().optional(),
  payloadHash: z.string().regex(/^[a-f0-9]{64}$/i),
}).strict();
