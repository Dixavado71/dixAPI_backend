import * as adminService from '../services/adminService.js';
import { createStoreSchema } from '../validators/adminValidators.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';

export async function overview(req, res, next) {
  try { return successResponse(res, await adminService.getOverview()); } catch (error) { return next(error); }
}

export async function stores(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    return successResponse(res, await adminService.listStores(page, limit));
  } catch (error) { return next(error); }
}

export async function payments(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    return successResponse(res, await adminService.listPayments(page, limit));
  } catch (error) { return next(error); }
}

export async function plans(req, res, next) {
  try { return successResponse(res, await adminService.listPlans()); } catch (error) { return next(error); }
}

export async function users(req, res, next) {
  try { return successResponse(res, await adminService.listUsers()); } catch (error) { return next(error); }
}

export async function createStore(req, res, next) {
  try {
    const data = createStoreSchema.parse(req.body);
    if (req.user.role === 'reseller') {
      return createdResponse(res, await adminService.createResellerStore(req.user.id, data));
    }
    return createdResponse(res, await adminService.createStore(req.user.id, data));
  } catch (error) { return next(error); }
}

/* ===== Reseller ===== */

export async function resellerOverview(req, res, next) {
  try { return successResponse(res, await adminService.getResellerOverview(req.user.id)); } catch (error) { return next(error); }
}

export async function resellerStores(req, res, next) {
  try { return successResponse(res, await adminService.listResellerStores(req.user.id)); } catch (error) { return next(error); }
}

export async function resellerCommissions(req, res, next) {
  try { return successResponse(res, await adminService.listResellerCommissions(req.user.id)); } catch (error) { return next(error); }
}

export async function resellerPayments(req, res, next) {
  try { return successResponse(res, await adminService.listResellerPayments(req.user.id)); } catch (error) { return next(error); }
}

export async function resellerCreateStore(req, res, next) {
  try {
    const data = createStoreSchema.parse(req.body);
    return createdResponse(res, await adminService.createResellerStore(req.user.id, data));
  } catch (error) { return next(error); }
}

export default { overview, stores, payments, plans, users, createStore, resellerOverview, resellerStores, resellerCommissions, resellerPayments, resellerCreateStore };
