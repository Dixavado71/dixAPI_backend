import * as repository from '../repositories/productRepository.js';
import { NotFoundError } from '../../../shared/errors/AppError.js';

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
  return repository.deleteProduct(companyId, id);
}

export async function getProduct(companyId, id) {
  const product = await repository.findProductById(id, companyId);
  if (!product) throw new NotFoundError('Product');
  return product;
}
