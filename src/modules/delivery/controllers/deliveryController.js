import * as service from '../services/deliveryService.js';
import { idParamsSchema, settingsSchema, driverSchema, deliverySchema, statusSchema, paymentSchema, confirmPaymentSchema } from '../validators/deliveryValidators.js';
import { createdResponse, successResponse } from '../../../shared/utils/response.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const settings = asyncHandler(async (req, res) => successResponse(res, await service.getSettings(req.tenant.companyId)));
export const updateSettings = asyncHandler(async (req, res) => successResponse(res, await service.saveSettings(req.tenant.companyId, settingsSchema.parse(req.body))));
export const drivers = asyncHandler(async (req, res) => successResponse(res, await service.listDrivers(req.tenant.companyId)));
export const createDriver = asyncHandler(async (req, res) => createdResponse(res, await service.createDriver(req.tenant.companyId, driverSchema.parse(req.body))));
export const deliveries = asyncHandler(async (req, res) => successResponse(res, await service.listDeliveries(req.tenant.companyId, req.query.status)));
export const createDelivery = asyncHandler(async (req, res) => createdResponse(res, await service.createDelivery(req.tenant.companyId, deliverySchema.parse(req.body))));
export const showDelivery = asyncHandler(async (req, res) => { const { id } = idParamsSchema.parse(req.params); return successResponse(res, await service.getDelivery(req.tenant.companyId, id)); });
export const updateStatus = asyncHandler(async (req, res) => { const { id } = idParamsSchema.parse(req.params); return successResponse(res, await service.updateStatus(req.tenant.companyId, id, statusSchema.parse(req.body))); });
export const markAtLocation = asyncHandler(async (req, res) => { const { id } = idParamsSchema.parse(req.params); return successResponse(res, await service.markAtLocation(req.tenant.companyId, id)); });
export const createPayment = asyncHandler(async (req, res) => createdResponse(res, await service.registerPayment(req.tenant.companyId, paymentSchema.parse(req.body))));
export const confirmPayment = asyncHandler(async (req, res) => { const { id } = idParamsSchema.parse(req.params); const { amount_received } = confirmPaymentSchema.parse(req.body); return successResponse(res, await service.confirmPayment(req.tenant.companyId, id, { amount_received })); });

export default { settings, updateSettings, drivers, createDriver, deliveries, createDelivery, showDelivery, updateStatus, markAtLocation, createPayment, confirmPayment };
