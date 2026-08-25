import prisma from '../../../infrastructure/database/prismaClient.js';
import { NotFoundError } from '../../../shared/errors/AppError.js';

export function listCustomers(companyId) {
  return prisma.customer.findMany({ where: { company_id: companyId }, orderBy: { name: 'asc' } });
}

export function findCustomerById(companyId, id) {
  return prisma.customer.findFirst({ where: { id, company_id: companyId } });
}

export function createCustomer(companyId, data) {
  return prisma.customer.create({ data: { company_id: companyId, ...data } });
}

export async function updateCustomer(companyId, id, data) {
  const customer = await findCustomerById(companyId, id);
  if (!customer) throw new NotFoundError('Customer');
  return prisma.customer.update({ where: { id }, data });
}

export async function deleteCustomer(companyId, id) {
  const customer = await findCustomerById(companyId, id);
  if (!customer) throw new NotFoundError('Customer');
  return prisma.customer.delete({ where: { id } });
}
