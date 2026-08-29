import { z } from 'zod';

export const createTransactionSchema = z.object({
  description: z.string().min(2, 'Descrição deve ter pelo menos 2 caracteres.').max(255),
  type: z.enum(['income', 'expense']),
  category: z.string().min(2).max(100),
  value: z.number().positive('Valor deve ser maior que zero.'),
  status: z.enum(['pending', 'completed']).optional(),
  payment_method: z.enum(['credit_card', 'debit_card', 'pix', 'boleto', 'whatsapp_pay', 'cash_on_delivery', 'card_on_delivery']).optional(),
  transaction_date: z.string().optional(),
  notes: z.string().optional(),
  idempotencyKey: z.string().min(1).max(255).optional(),
}).strict();

export default { createTransactionSchema };
