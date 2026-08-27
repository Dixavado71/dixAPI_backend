import * as service from '../services/orderService.js';
import { createdResponse, successResponse } from '../../../shared/utils/response.js';
import { createOrderSchema } from '../validators/orderValidators.js';

export async function list(req, res, next) {
  try { return successResponse(res, await service.listOrders(req.tenant.companyId, req.query.status)); } catch (error) { next(error); }
}

export async function get(req, res, next) {
  try { return successResponse(res, await service.getOrder(req.tenant.companyId, req.params.id)); } catch (error) { next(error); }
}

export async function create(req, res, next) {
  try {
    const order = await service.createOrder(req.tenant.companyId, createOrderSchema.parse(req.body));
    return createdResponse(res, order);
  } catch (error) {
    return next(error);
  }
}

export async function updateStatus(req, res, next) {
  try {
    const order = await service.updateOrderStatus(req.tenant.companyId, req.params.id, req.body.status);
    return successResponse(res, order);
  } catch (error) {
    return next(error);
  }
}

export default { list, get, create, updateStatus };