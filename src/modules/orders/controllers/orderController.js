import * as service from '../services/orderService.js';
import { createdResponse, successResponse } from '../../../shared/utils/response.js';
import { createOrderSchema, updateOrderSchema } from '../validators/orderValidators.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => successResponse(res, await service.listOrders(req.tenant.companyId, req.query.status)));

export const get = asyncHandler(async (req, res) => successResponse(res, await service.getOrder(req.tenant.companyId, req.params.id)));

export const create = asyncHandler(async (req, res) => {
  const order = await service.createOrder(req.tenant.companyId, createOrderSchema.parse(req.body));
  return createdResponse(res, order);
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { status } = updateOrderSchema.parse(req.body);
  const order = await service.updateOrderStatus(req.tenant.companyId, req.params.id, status);
  return successResponse(res, order);
});

export default { list, get, create, updateStatus };
