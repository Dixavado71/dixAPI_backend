import * as userService from '../services/userService.js';
import { createUserSchema, updateUserSchema } from '../validators/userValidators.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';
import { buildPaginationOptions, buildPaginationResponse } from '../../../shared/pagination/pagination.js';

export async function index(req, res, next) {
  try {
    const { page, limit, search, role, is_active } = req.query;
    const companyId = req.user.companyId;
    
    const pagination = buildPaginationOptions(page, limit);
    
    const filters = {
      skip: pagination.skip,
      take: pagination.take,
      search,
      role,
      isActive: is_active !== undefined ? is_active === 'true' : undefined,
    };
    
    const { users, total } = await userService.getAll(companyId, filters);
    
    return successResponse(res, buildPaginationResponse(users, total, pagination.page, pagination.limit));
  } catch (error) {
    next(error);
  }
}

export async function show(req, res, next) {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    
    const user = await userService.getById(id, companyId);
    
    return successResponse(res, user);
  } catch (error) {
    next(error);
  }
}

export async function store(req, res, next) {
  try {
    const validatedData = createUserSchema.parse(req.body);
    const companyId = req.user.companyId;
    
    const user = await userService.create({
      ...validatedData,
      company_id: companyId,
    });
    
    return createdResponse(res, user);
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const validatedData = updateUserSchema.parse(req.body);
    const companyId = req.user.companyId;
    
    const user = await userService.update(id, validatedData, companyId);
    
    return successResponse(res, user);
  } catch (error) {
    next(error);
  }
}

export async function destroy(req, res, next) {
  try {
    const { id } = req.params;
    const companyId = req.user.companyId;
    
    await userService.remove(id, companyId);
    
    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export default { index, show, store, update, destroy };
