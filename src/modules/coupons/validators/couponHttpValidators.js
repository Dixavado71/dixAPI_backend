import { z } from 'zod';

export const couponValidationSchema = z.object({
  code: z.string().trim().min(1).max(64),
  customerId: z.string().uuid().optional(),
  subtotal: z.number().finite().nonnegative(),
}).strict();

export const couponRedemptionSchema = couponValidationSchema.extend({
  orderId: z.string().uuid(),
  discountAmount: z.number().finite().nonnegative(),
}).strict();
