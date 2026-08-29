import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().uuid('ID inválido.') }).strict();

export const customerIdParamSchema = z.object({ customerId: z.string().uuid('ID inválido.') }).strict();

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
}).strict();

export const destinationSchema = z.string().regex(/^(\d{10,15}|[^@\s]+@(lid|s\.whatsapp\.net|c\.us|g\.us))$/, 'Destino inválido.');

export default { idParamSchema, customerIdParamSchema, paginationQuerySchema, destinationSchema };