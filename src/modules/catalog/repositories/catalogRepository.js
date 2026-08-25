import prisma from '../../../infrastructure/database/prismaClient.js';

export function listCategories(kind) {
  return prisma.catalogCategory.findMany({ where: { is_active: true, ...(kind ? { kind } : {}) }, orderBy: { name: 'asc' } });
}

export function listServices(categoryId) {
  return prisma.serviceCatalog.findMany({ where: { is_active: true, ...(categoryId ? { category_id: categoryId } : {}) }, orderBy: { name: 'asc' } });
}

export function findCategoryForCompany(companyId, categoryId) {
  return prisma.catalogCategory.findFirst({ where: { id: categoryId, is_active: true } });
}

export function findServiceForCompany(serviceId) {
  return prisma.serviceCatalog.findFirst({ where: { id: serviceId, is_active: true } });
}

export function listCompanyCategories(companyId) {
  return prisma.companyCategory.findMany({ where: { company_id: companyId }, include: { category: true }, orderBy: { is_primary: 'desc' } });
}

export function listCompanyServices(companyId) {
  return prisma.companyService.findMany({ where: { company_id: companyId }, include: { service: { include: { category: true } } }, orderBy: { enabled: 'desc' } });
}

export function upsertCompanyCategory(companyId, data) {
  return prisma.companyCategory.upsert({
    where: { company_id_category_id: { company_id: companyId, category_id: data.categoryId } },
    create: { company_id: companyId, category_id: data.categoryId, custom_name: data.customName, is_primary: data.isPrimary ?? false },
    update: { custom_name: data.customName, is_primary: data.isPrimary ?? false },
    include: { category: true },
  });
}

export function upsertCompanyService(companyId, data) {
  return prisma.companyService.upsert({
    where: { company_id_service_id: { company_id: companyId, service_id: data.serviceId } },
    create: { company_id: companyId, service_id: data.serviceId, custom_name: data.customName, enabled: data.enabled ?? true, config: data.config },
    update: { custom_name: data.customName, enabled: data.enabled ?? true, config: data.config },
    include: { service: true },
  });
}
