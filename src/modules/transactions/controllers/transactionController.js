import * as transactionService from '../services/transactionService.js';
import { createTransactionSchema } from '../validators/transactionValidators.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const { type, status } = req.query;
  const data = await transactionService.list(req.tenant.companyId, { type, status });
  return successResponse(res, data);
});

export const create = asyncHandler(async (req, res) => {
  const data = createTransactionSchema.parse(req.body);
  const result = await transactionService.create(req.tenant.companyId, req.user.id, data);
  return createdResponse(res, result);
});

export default { list, create };