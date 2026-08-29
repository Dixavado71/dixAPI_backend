import * as repo from '../repositories/customerRepository.js';
import { NotFoundError } from '../../../shared/errors/AppError.js';

function toCustomerDTO(customer) {
  if (!customer) return customer;
  return {
    id: customer.id,
    companyId: customer.company_id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    segment: customer.segment,
    status: customer.status,
    totalOrders: customer.total_orders,
    totalSpent: customer.total_spent,
    lastPurchaseDate: customer.last_purchase_date,
    registeredAt: customer.registered_at,
    createdAt: customer.created_at,
    updatedAt: customer.updated_at,
  };
}

export async function listCustomers(companyId, params) {
  const result = await repo.findAll(companyId, params);
  return { ...result, customers: result.customers.map(toCustomerDTO) };
}

export async function findCustomerById(companyId, id) {
  const customer = await repo.findById(companyId, id);
  return toCustomerDTO(customer);
}

export async function createCustomer(companyId, data) {
  const customer = await repo.create(companyId, data);
  return toCustomerDTO(customer);
}

export async function updateCustomer(companyId, id, data) {
  const customer = await repo.findById(companyId, id);
  if (!customer) throw new NotFoundError('Customer');
  const updated = await repo.updateMany(companyId, id, data);
  if (!updated.count) throw new NotFoundError('Customer');
  const refreshed = await repo.findById(companyId, id);
  return toCustomerDTO(refreshed);
}

export async function deleteCustomer(companyId, id) {
  const customer = await repo.findById(companyId, id);
  if (!customer) throw new NotFoundError('Customer');
  const deleted = await repo.deleteMany(companyId, id);
  return deleted.count > 0;
}
