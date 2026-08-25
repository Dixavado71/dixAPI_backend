import { z } from 'zod';

const dateField = z.coerce.date().optional();
export const promotionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(1000).optional(),
  type: z.enum(['percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y']),
  value: z.number().finite().nonnegative(),
  minimumAmount: z.number().finite().nonnegative().optional(),
  startsAt: dateField,
  endsAt: dateField,
  usageLimit: z.number().int().positive().optional(),
  rules: z.record(z.unknown()).optional(),
}).strict();

export const couponAdminSchema = z.object({
  promotionId: z.string().uuid().optional(),
  code: z.string().trim().min(3).max(64).regex(/^[A-Za-z0-9_-]+$/),
  description: z.string().max(1000).optional(),
  discountType: z.enum(['percentage', 'fixed_amount', 'free_shipping']),
  discountValue: z.number().finite().nonnegative(),
  minimumAmount: z.number().finite().nonnegative().optional(),
  maxDiscount: z.number().finite().nonnegative().optional(),
  usageLimit: z.number().int().positive().optional(),
  perCustomerLimit: z.number().int().positive().optional(),
  startsAt: dateField,
  endsAt: dateField,
}).strict();

export const idSchema = z.object({ id: z.string().uuid() }).strict();
