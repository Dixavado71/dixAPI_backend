import { NotFoundError, ConflictError } from '../../../shared/errors/AppError.js';
import * as companyRepository from '../repositories/companyRepository.js';

export async function getAll(companyId, options) {
  return companyRepository.findAll(companyId, options);
}

export async function getById(id, companyId) {
  const company = await companyRepository.findById(id, companyId);
  if (!company) throw new NotFoundError('Company');
  return company;
}

export async function create(data) {
  const existing = await companyRepository.findByCnpj(data.cnpj);
  if (existing) throw new ConflictError('CNPJ already registered');
  return companyRepository.create(data);
}

export async function update(id, companyId, data) {
  const company = await companyRepository.findById(id, companyId);
  if (!company) throw new NotFoundError('Company');
  
  if (data.cnpj && data.cnpj !== company.cnpj) {
    const existing = await companyRepository.findByCnpj(data.cnpj);
    if (existing) throw new ConflictError('CNPJ already registered');
  }
  
  const result = await companyRepository.update(id, companyId, data);
  if (!result.count) throw new NotFoundError('Company');
  return companyRepository.findById(id, companyId);
}

export async function remove(id, companyId) {
  const company = await companyRepository.findById(id, companyId);
  if (!company) throw new NotFoundError('Company');
  return companyRepository.remove(id, companyId);
}

export default { getAll, getById, create, update, remove };
