import * as service from '../services/catalogService.js';
import { catalogQuerySchema, companyCategorySchema, companyServiceSchema } from '../validators/catalogValidators.js';
import { createdResponse, successResponse } from '../../../shared/utils/response.js';

export async function categories(req, res, next) {
  try { const query = catalogQuerySchema.parse(req.query); return successResponse(res, await service.listCategories(query.kind)); } catch (error) { next(error); }
}

export async function services(req, res, next) {
  try { const query = catalogQuerySchema.parse(req.query); return successResponse(res, await service.listServices(query.categoryId)); } catch (error) { next(error); }
}

export async function companyCategories(req, res, next) {
  try { return successResponse(res, await service.listCompanyCategories(req.tenant.companyId)); } catch (error) { next(error); }
}

export async function companyServices(req, res, next) {
  try { return successResponse(res, await service.listCompanyServices(req.tenant.companyId)); } catch (error) { next(error); }
}

export async function addCategory(req, res, next) {
  try { return createdResponse(res, await service.addCompanyCategory(req.tenant.companyId, companyCategorySchema.parse(req.body))); } catch (error) { next(error); }
}

export async function addService(req, res, next) {
  try { return createdResponse(res, await service.addCompanyService(req.tenant.companyId, companyServiceSchema.parse(req.body))); } catch (error) { next(error); }
}
