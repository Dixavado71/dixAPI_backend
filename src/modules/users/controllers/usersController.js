import * as usersService from '../services/usersService.js';
import { createUserSchema, updateUserSchema, listUsersQuerySchema } from '../validators/usersValidators.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';

export async function list(req, res, next) {
  try {
    const query = listUsersQuerySchema.parse(req.query);
    const data = await usersService.listUsers(req.tenant.companyId, query);
    return successResponse(res, data);
  } catch (error) { return next(error); }
}

export async function getById(req, res, next) {
  try {
    const data = await usersService.findUserById(req.tenant.companyId, req.params.id);
    return successResponse(res, data);
  } catch (error) { return next(error); }
}

export async function create(req, res, next) {
  try {
    const data = createUserSchema.parse(req.body);
    const result = await usersService.createUser(req.tenant.companyId, req.user.role, data);
    return createdResponse(res, result);
  } catch (error) { return next(error); }
}

export async function update(req, res, next) {
  try {
    const data = updateUserSchema.parse(req.body);
    const result = await usersService.updateUser(req.tenant.companyId, req.user.role, req.params.id, data);
    return successResponse(res, result);
  } catch (error) { return next(error); }
}

export async function remove(req, res, next) {
  try {
    const result = await usersService.removeUser(req.tenant.companyId, req.user.role, req.params.id);
    return successResponse(res, result);
  } catch (error) { return next(error); }
}

export default { list, getById, create, update, remove };