import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().min(10, 'Phone must have at least 10 digits'),
  segment: z.enum(['vip', 'frequent', 'occasional', 'new']).default('new'),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export default {
  createCustomerSchema,
  updateCustomerSchema,
};
