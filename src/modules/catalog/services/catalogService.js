import { BadRequestError, NotFoundError } from '../../../shared/errors/AppError.js';
import * as repository from '../repositories/catalogRepository.js';

export const listCategories = (kind) => repository.listCategories(kind);
export const listServices = (categoryId) => repository.listServices(categoryId);
export const listCompanyCategories = (companyId) => repository.listCompanyCategories(companyId);
export const listCompanyServices = (companyId) => repository.listCompanyServices(companyId);

export async function addCompanyCategory(companyId, data) {
  const category = await repository.findCategoryForCompany(companyId, data.categoryId);
  if (!category) throw new NotFoundError('Catalog category');
  return repository.upsertCompanyCategory(companyId, data);
}

export async function addCompanyService(companyId, data) {
  const service = await repository.findServiceForCompany(data.serviceId);
  if (!service) throw new NotFoundError('Catalog service');
  return repository.upsertCompanyService(companyId, data);
}
