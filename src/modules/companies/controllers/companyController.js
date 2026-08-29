import * as companyService from '../services/companyService.js';
import { companyParamsSchema, createCompanySchema, updateCompanySchema } from '../validators/companyValidators.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';
import { buildPaginationOptions, buildPaginationResponse } from '../../../shared/pagination/pagination.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const index = asyncHandler(async (req, res) => {
  const { page, limit, search, is_active } = req.query;
  const companyId = req.tenant.companyId;
  
  const pagination = buildPaginationOptions(page, limit);
  
  const filters = {
    skip: pagination.skip,
    take: pagination.take,
    search,
    isActive: is_active !== undefined ? is_active === 'true' : undefined,
  };
  
  const { companies, total } = await companyService.getAll(companyId, filters);
  
  return successResponse(res, buildPaginationResponse(companies, total, pagination.page, pagination.limit));
});

export const show = asyncHandler(async (req, res) => {
  const { id } = companyParamsSchema.parse(req.params);
  const companyId = req.tenant.companyId;
  
  const company = await companyService.getById(id, companyId);
  
  return successResponse(res, company);
});

export const store = asyncHandler(async (req, res) => {
  const validatedData = createCompanySchema.parse(req.body);
  
  const company = await companyService.create(validatedData);
  
  return createdResponse(res, company);
});

export const update = asyncHandler(async (req, res) => {
  const { id } = companyParamsSchema.parse(req.params);
  const validatedData = updateCompanySchema.parse(req.body);
  const company = await companyService.update(id, req.tenant.companyId, validatedData);
  return successResponse(res, company);
});

export const destroy = asyncHandler(async (req, res) => {
  const { id } = companyParamsSchema.parse(req.params);
  await companyService.remove(id, req.tenant.companyId);
  return res.status(204).send();
});

export default { index, show, store, update, destroy };
