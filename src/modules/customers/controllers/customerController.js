import * as service from '../services/customerService.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';
import { customerParamsSchema, customerSchema, customerUpdateSchema, customerQuerySchema } from '../validators/customerValidators.js';
import { buildPaginationResponse } from '../../../shared/pagination/pagination.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const query = customerQuerySchema.parse(req.query);
  const data = await service.listCustomers(req.tenant.companyId, query);
  return successResponse(res, buildPaginationResponse(data.customers, data.total, data.page, data.limit));
});

export const create = asyncHandler(async (req, res) => {
  return createdResponse(res, await service.createCustomer(req.tenant.companyId, customerSchema.parse(req.body)));
});

export const update = asyncHandler(async (req, res) => {
  const { id } = customerParamsSchema.parse(req.params);
  return successResponse(res, await service.updateCustomer(req.tenant.companyId, id, customerUpdateSchema.parse(req.body)));
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = customerParamsSchema.parse(req.params);
  await service.deleteCustomer(req.tenant.companyId, id);
  return res.status(204).send();
});
