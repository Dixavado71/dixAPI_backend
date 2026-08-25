import prisma from '../../../infrastructure/database/prismaClient.js';

export function listCustomers(companyId) {
  return prisma.customer.findMany({ where: { company_id: companyId }, orderBy: { name: 'asc' } });
}

export function findCustomerById(companyId, id) {
  return prisma.customer.findFirst({ where: { id, company_id: companyId } });
}

export function createCustomer(companyId, data) {
  return prisma.customer.create({ data: { company_id: companyId, ...data } });
}

export function updateCustomer(companyId, id, data) {
  return prisma.customer.update({ where: { id, company_id: companyId }, data });
}

export function deleteCustomer(companyId, id) {
  return prisma.customer.delete({ where: { id, company_id: companyId } });
}