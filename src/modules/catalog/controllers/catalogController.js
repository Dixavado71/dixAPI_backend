import * as service from '../services/catalogService.js';
import { catalogQuerySchema, companyCategorySchema, companyServiceSchema } from '../validators/catalogValidators.js';
import { createdResponse, successResponse } from '../../../shared/utils/response.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const categories = asyncHandler(async (req, res) => {
  const query = catalogQuerySchema.parse(req.query);
  return successResponse(res, await service.listCategories(query.kind));
});

export const services = asyncHandler(async (req, res) => {
  const query = catalogQuerySchema.parse(req.query);
  return successResponse(res, await service.listServices(query.categoryId));
});

export const companyCategories = asyncHandler(async (req, res) => {
  return successResponse(res, await service.listCompanyCategories(req.tenant.companyId));
});

export const companyServices = asyncHandler(async (req, res) => {
  return successResponse(res, await service.listCompanyServices(req.tenant.companyId));
});

export const addCategory = asyncHandler(async (req, res) => {
  return createdResponse(res, await service.addCompanyCategory(req.tenant.companyId, companyCategorySchema.parse(req.body)));
});

export const addService = asyncHandler(async (req, res) => {
  return createdResponse(res, await service.addCompanyService(req.tenant.companyId, companyServiceSchema.parse(req.body)));
});
