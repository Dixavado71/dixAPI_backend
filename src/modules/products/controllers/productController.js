import * as service from '../services/productService.js';
import { createdResponse, successResponse } from '../../../shared/utils/response.js';
import { productParamsSchema, productSchema, productUpdateSchema } from '../validators/productValidators.js';

export async function list(req, res, next) {
  try { return successResponse(res, await service.listProducts(req.tenant.companyId, req.query.status)); } catch (error) { return next(error); }
}

export async function get(req, res, next) {
  try {
    const { id } = productParamsSchema.parse(req.params);
    return successResponse(res, await service.getProduct(req.tenant.companyId, id));
  } catch (error) { return next(error); }
}

export async function create(req, res, next) {
  try {
    return createdResponse(res, await service.createProduct(req.tenant.companyId, productSchema.parse(req.body)));
  } catch (error) { return next(error); }
}

export async function update(req, res, next) {
  try {
    const { id } = productParamsSchema.parse(req.params);
    return successResponse(res, await service.updateProduct(req.tenant.companyId, id, productUpdateSchema.parse(req.body)));
  } catch (error) { return next(error); }
}

export async function remove(req, res, next) {
  try {
    const { id } = productParamsSchema.parse(req.params);
    await service.deleteProduct(req.tenant.companyId, id);
    return res.status(204).send();
  } catch (error) { return next(error); }
}
