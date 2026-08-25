import * as service from '../services/customerService.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';
import { customerParamsSchema, customerSchema, customerUpdateSchema } from '../validators/customerValidators.js';

export async function list(req, res, next) {
  try { return successResponse(res, await service.listCustomers(req.tenant.companyId)); } catch (error) { return next(error); }
}

export async function create(req, res, next) {
  try { return createdResponse(res, await service.createCustomer(req.tenant.companyId, customerSchema.parse(req.body))); } catch (error) { return next(error); }
}

export async function update(req, res, next) {
  try {
    const { id } = customerParamsSchema.parse(req.params);
    return successResponse(res, await service.updateCustomer(req.tenant.companyId, id, customerUpdateSchema.parse(req.body)));
  } catch (error) { return next(error); }
}

export async function remove(req, res, next) {
  try {
    const { id } = customerParamsSchema.parse(req.params);
    await service.deleteCustomer(req.tenant.companyId, id);
    return res.status(204).send();
  } catch (error) { return next(error); }
}
