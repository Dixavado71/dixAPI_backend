import * as usersService from '../services/usersService.js';
import { createUserSchema, updateUserSchema, listUsersQuerySchema } from '../validators/usersValidators.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) => {
  const query = listUsersQuerySchema.parse(req.query);
  const data = await usersService.listUsers(req.tenant.companyId, query);
  return successResponse(res, data);
});

export const getById = asyncHandler(async (req, res) => {
  const data = await usersService.findUserById(req.tenant.companyId, req.params.id);
  return successResponse(res, data);
});

export const create = asyncHandler(async (req, res) => {
  const data = createUserSchema.parse(req.body);
  const result = await usersService.createUser(req.tenant.companyId, req.user.role, data);
  return createdResponse(res, result);
});

export const update = asyncHandler(async (req, res) => {
  const data = updateUserSchema.parse(req.body);
  const result = await usersService.updateUser(req.tenant.companyId, req.user.role, req.user.id, req.params.id, data);
  return successResponse(res, result);
});

export const remove = asyncHandler(async (req, res) => {
  const result = await usersService.removeUser(req.tenant.companyId, req.user.role, req.user.id, req.params.id);
  return successResponse(res, result);
});

export default { list, getById, create, update, remove };