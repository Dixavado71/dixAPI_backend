import * as repository from '../repositories/productRepository.js';
import { NotFoundError, ConflictError } from '../../../shared/errors/AppError.js';
import { dispatchEventAsync } from '../../notifications/services/notificationService.js';

function toProductDTO(product) {
  if (!product) return product;
  return {
    id: product.id,
    companyId: product.company_id,
    name: product.name,
    description: product.description,
    category: product.category,
    price: product.price,
    cost: product.cost,
    stock: product.stock,
    minStock: product.min_stock,
    totalSales: product.total_sales,
    totalRevenue: product.total_revenue,
    status: product.status,
    imageUrl: product.image_url,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

function toPrismaProduct(data) {
  const prismaData = { ...data };
  if (prismaData.minStock !== undefined) { prismaData.min_stock = prismaData.minStock; delete prismaData.minStock; }
  if (prismaData.imageUrl !== undefined) { prismaData.image_url = prismaData.imageUrl; delete prismaData.imageUrl; }
  return prismaData;
}

export async function listProducts(companyId, kind) {
  const products = await repository.listProducts(companyId, kind);
  return products.map(toProductDTO);
}

export const listAllProducts = (companyId) => repository.listAllProducts(companyId);

function maybeDispatchLowStock(companyId, product) {
  if (!product || product.stock > product.min_stock) return;
  dispatchEventAsync({
    companyId,
    event: 'stock_low',
    vars: { productName: product.name, stock: product.stock, minStock: product.min_stock },
    relatedEntityType: 'product',
    relatedEntityId: product.id,
  });
}

export async function createProduct(companyId, data) {
  const product = await repository.createProduct(companyId, toPrismaProduct(data));
  maybeDispatchLowStock(companyId, product);
  return toProductDTO(product);
}

export async function updateProduct(companyId, id, data) {
  const product = await repository.findProductById(id, companyId);
  if (!product) throw new NotFoundError('Product');
  const updated = await repository.updateProduct(companyId, id, toPrismaProduct(data));
  maybeDispatchLowStock(companyId, updated);
  return toProductDTO(updated);
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
  return toProductDTO(product);
}
