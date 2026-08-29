import * as adminService from '../services/adminService.js';
import { createStoreSchema } from '../validators/adminValidators.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const overview = asyncHandler(async (req, res) => {
  return successResponse(res, await adminService.getOverview());
});

export const stores = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 100;
  return successResponse(res, await adminService.listStores(page, limit));
});

export const payments = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 100;
  return successResponse(res, await adminService.listPayments(page, limit));
});

export const plans = asyncHandler(async (req, res) => {
  return successResponse(res, await adminService.listPlans());
});

export const users = asyncHandler(async (req, res) => {
  return successResponse(res, await adminService.listUsers());
});

export const createStore = asyncHandler(async (req, res) => {
  const data = createStoreSchema.parse(req.body);
  if (req.user.role === 'reseller') {
    return createdResponse(res, await adminService.createResellerStore(req.user.id, data));
  }
  return createdResponse(res, await adminService.createStore(req.user.id, data));
});

/* ===== Reseller ===== */

export const resellerOverview = asyncHandler(async (req, res) => {
  return successResponse(res, await adminService.getResellerOverview(req.user.id));
});

export const resellerStores = asyncHandler(async (req, res) => {
  return successResponse(res, await adminService.listResellerStores(req.user.id));
});

export const resellerCommissions = asyncHandler(async (req, res) => {
  return successResponse(res, await adminService.listResellerCommissions(req.user.id));
});

export const resellerPayments = asyncHandler(async (req, res) => {
  return successResponse(res, await adminService.listResellerPayments(req.user.id));
});

export const resellerCreateStore = asyncHandler(async (req, res) => {
  const data = createStoreSchema.parse(req.body);
  return createdResponse(res, await adminService.createResellerStore(req.user.id, data));
});

export default { overview, stores, payments, plans, users, createStore, resellerOverview, resellerStores, resellerCommissions, resellerPayments, resellerCreateStore };
