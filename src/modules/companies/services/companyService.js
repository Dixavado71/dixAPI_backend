import { NotFoundError, ConflictError } from '../../../shared/errors/AppError.js';
import * as companyRepository from '../repositories/companyRepository.js';

function mapCompany(c) {
  if (!c) return c;
  return {
    id: c.id,
    name: c.name,
    cnpj: c.cnpj,
    website: c.website,
    description: c.description,
    status: c.status,
    tradeName: c.trade_name,
    logoUrl: c.logo_url,
    addressStreet: c.address_street,
    addressNumber: c.address_number,
    addressComplement: c.address_complement,
    addressCity: c.address_city,
    addressState: c.address_state,
    addressZip: c.address_zip,
    isActive: c.is_active,
    companyType: c.company_type,
    createdBy: c.created_by,
    resellerId: c.reseller_id,
    legalName: c.legal_name,
    stateRegistration: c.state_registration,
    supportEmail: c.support_email,
    supportPhone: c.support_phone,
    whatsappEnabled: c.whatsapp_enabled,
    ecommerceEnabled: c.ecommerce_enabled,
    defaultCurrency: c.default_currency,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

export async function getAll(companyId, options) {
  const result = await companyRepository.findAll(companyId, options);
  return { ...result, companies: result.companies.map(mapCompany) };
}

export async function getById(id, companyId) {
  const company = await companyRepository.findById(id, companyId);
  if (!company) throw new NotFoundError('Company');
  return mapCompany(company);
}

export async function create(data) {
  const existing = await companyRepository.findByCnpj(data.cnpj);
  if (existing) throw new ConflictError('CNPJ already registered');
  return mapCompany(await companyRepository.create(data));
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
  return mapCompany(await companyRepository.findById(id, companyId));
}

export async function remove(id, companyId) {
  const company = await companyRepository.findById(id, companyId);
  if (!company) throw new NotFoundError('Company');
  return companyRepository.remove(id, companyId);
}

export default { getAll, getById, create, update, remove };
