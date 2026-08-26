import { z } from 'zod';

export const subscribeSchema = z.object({
  planCode: z.enum(['simple', 'silver', 'diamond']),
  billingCycle: z.enum(['monthly', 'yearly']).optional().default('monthly'),
}).strict();

export const confirmPaymentSchema = z.object({
  transactionId: z.string().uuid('ID de transação inválido'),
}).strict();

export default {
  subscribeSchema,
  confirmPaymentSchema,
};
