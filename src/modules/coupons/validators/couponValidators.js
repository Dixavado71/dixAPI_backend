import { z } from 'zod';

export const validateCouponSchema = z.object({
  companyId: z.string().uuid(),
  code: z.string().trim().min(1).max(64),
  customerId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  subtotal: z.number().finite().nonnegative(),
}).strict();

export const redeemCouponSchema = validateCouponSchema.extend({
  discountAmount: z.number().finite().nonnegative(),
}).strict();
