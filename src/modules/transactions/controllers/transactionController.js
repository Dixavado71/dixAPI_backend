import * as transactionService from '../services/transactionService.js';
import { createTransactionSchema } from '../validators/transactionValidators.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';

export async function list(req, res, next) {
  try {
    const { type, status } = req.query;
    const data = await transactionService.list(req.tenant.companyId, { type, status });
    return successResponse(res, data);
  } catch (error) { return next(error); }
}

export async function create(req, res, next) {
  try {
    const data = createTransactionSchema.parse(req.body);
    const result = await transactionService.create(req.tenant.companyId, req.user.id, data);
    return createdResponse(res, result);
  } catch (error) { return next(error); }
}

export default { list, create };