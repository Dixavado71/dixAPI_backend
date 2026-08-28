import { z } from 'zod';

export const createStoreSchema = z.object({
  companyName: z.string().min(2, 'Nome da loja deve ter pelo menos 2 caracteres.'),
  companyTradeName: z.string().max(120).optional(),
  cnpj: z.string().optional(),
  adminName: z.string().min(2, 'Nome do administrador deve ter pelo menos 2 caracteres.'),
  email: z.string().email('Digite um e-mail válido.'),
  phone: z.string().optional(),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.').regex(/[A-Z]/, 'Use ao menos uma letra maiúscula.').regex(/[a-z]/, 'Use ao menos uma letra minúscula.').regex(/\d/, 'Use ao menos um número.'),
  planCode: z.enum(['simple', 'silver', 'diamond']).optional(),
}).strict();

export default { createStoreSchema };