import * as service from '../services/productService.js';
import { createdResponse, successResponse } from '../../../shared/utils/response.js';
import { productParamsSchema, productSchema, productUpdateSchema } from '../validators/productValidators.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => successResponse(res, await service.listProducts(req.tenant.companyId, req.query.status)));

export const get = asyncHandler(async (req, res) => {
  const { id } = productParamsSchema.parse(req.params);
  return successResponse(res, await service.getProduct(req.tenant.companyId, id));
});

export const create = asyncHandler(async (req, res) => {
  return createdResponse(res, await service.createProduct(req.tenant.companyId, productSchema.parse(req.body)));
});

export const update = asyncHandler(async (req, res) => {
  const { id } = productParamsSchema.parse(req.params);
  return successResponse(res, await service.updateProduct(req.tenant.companyId, id, productUpdateSchema.parse(req.body)));
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = productParamsSchema.parse(req.params);
  await service.deleteProduct(req.tenant.companyId, id);
  return res.status(204).send();
});
