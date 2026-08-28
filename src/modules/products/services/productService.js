import * as repository from '../repositories/productRepository.js';
import { NotFoundError, ConflictError } from '../../../shared/errors/AppError.js';

export const listProducts = (companyId, kind) => repository.listProducts(companyId, kind);
export const listAllProducts = (companyId) => repository.listAllProducts(companyId);

export function createProduct(companyId, data) {
  return repository.createProduct(companyId, data);
}

export async function updateProduct(companyId, id, data) {
  const product = await repository.findProductById(id, companyId);
  if (!product) throw new NotFoundError('Product');
  return repository.updateProduct(companyId, id, data);
}

export async function deleteProduct(companyId, id) {
  const product = await repository.findProductById(id, companyId);
  if (!product) throw new NotFoundError('Product');
  try {
    return await repository.deleteProduct(companyId, id);
  } catch (err) {
    const code = err?.code;
    const message = String(err?.message ?? '');
    const isForeignKeyViolation =
      code === 'P2003' || code === '23001'
      || /foreign key constraint|RESTRICT|restrict|23001/i.test(message);
    if (isForeignKeyViolation) {
      throw new ConflictError('Este produto possui vendas ou pedidos vinculados e não pode ser excluído. Desative o produto em vez disso.');
    }
    throw err;
  }
}

export async function getProduct(companyId, id) {
  const product = await repository.findProductById(id, companyId);
  if (!product) throw new NotFoundError('Product');
  return product;
}
