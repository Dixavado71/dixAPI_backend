import { z } from 'zod';

export const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  paymentMethod: z.enum(['cash_on_delivery', 'card_on_delivery', 'whatsapp_pay']),
  couponCode: z.string().trim().min(1).max(100).optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive('Quantidade deve ser ≥ 1'),
  })).min(1, 'Pedido deve ter pelo menos um item'),
}).strict();

export const updateOrderSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'cancelled']),
}).strict();