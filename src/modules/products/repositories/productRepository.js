import prisma from '../../../infrastructure/database/prismaClient.js';

export function listProducts(companyId, kind) {
  return prisma.product.findMany({
    where: { company_id: companyId, ...(kind ? { status: kind } : {}), status: 'active' },
    orderBy: { name: 'asc' },
  });
}

export function listAllProducts(companyId) {
  return prisma.product.findMany({ where: { company_id: companyId }, orderBy: { name: 'asc' } });
}

export function findProductById(id, companyId) {
  return prisma.product.findFirst({ where: { id, company_id: companyId } });
}

export function createProduct(companyId, data) {
  return prisma.product.create({ data: { company_id: companyId, ...data } });
}

export function updateProduct(companyId, id, data) {
  return prisma.product.update({ where: { id, company_id: companyId }, data });
}

export function deleteProduct(companyId, id) {
  return prisma.product.delete({ where: { id, company_id: companyId } });
}