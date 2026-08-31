import { z } from 'zod';

// Categoria aceita texto livre (ex.: presentes, comemorativas, natal, alimentacao...)
// para permitir CRUD de produtos via chat e categorias personalizadas da loja.
export const categoryEnumSchema = z.string().min(1, 'Categoria é obrigatória').max(50);

export const productParamsSchema = z.object({ id: z.string().uuid() }).strict();

export const productStatusSchema = z.enum(['active', 'inactive', 'low_stock']);

export const productSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório').max(120),
  description: z.string().max(500).optional(),
  category: categoryEnumSchema,
  price: z.number().finite().nonnegative('Preço deve ser ≥ 0'),
  cost: z.number().finite().nonnegative('Custo deve ser ≥ 0').optional(),
  stock: z.number().int().nonnegative('Stock deve ser ≥ 0'),
  minStock: z.number().int().nonnegative('Min. stock deve ser ≥ 0'),
  imageUrl: z.string().url('URL inválida').optional(),
  status: productStatusSchema.optional(),
}).strict();

export const productUpdateSchema = productSchema.partial();