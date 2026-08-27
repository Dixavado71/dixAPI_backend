import * as service from '../services/deliveryService.js';
import { idParamsSchema, settingsSchema, driverSchema, deliverySchema, statusSchema, paymentSchema } from '../validators/deliveryValidators.js';
import { createdResponse, successResponse } from '../../../shared/utils/response.js';

export async function settings(req, res, next) { try { return successResponse(res, await service.getSettings(req.tenant.companyId)); } catch (error) { next(error); } }
export async function updateSettings(req, res, next) { try { return successResponse(res, await service.saveSettings(req.tenant.companyId, settingsSchema.parse(req.body))); } catch (error) { next(error); } }
export async function drivers(req, res, next) { try { return successResponse(res, await service.listDrivers(req.tenant.companyId)); } catch (error) { next(error); } }
export async function createDriver(req, res, next) { try { return createdResponse(res, await service.createDriver(req.tenant.companyId, driverSchema.parse(req.body))); } catch (error) { next(error); } }
export async function deliveries(req, res, next) { try { return successResponse(res, await service.listDeliveries(req.tenant.companyId, req.query.status)); } catch (error) { next(error); } }
export async function createDelivery(req, res, next) { try { return createdResponse(res, await service.createDelivery(req.tenant.companyId, deliverySchema.parse(req.body))); } catch (error) { next(error); } }
export async function showDelivery(req, res, next) { try { const { id } = idParamsSchema.parse(req.params); return successResponse(res, await service.getDelivery(req.tenant.companyId, id)); } catch (error) { return next(error); } }
export async function updateStatus(req, res, next) { try { const { id } = idParamsSchema.parse(req.params); return successResponse(res, await service.updateStatus(req.tenant.companyId, id, statusSchema.parse(req.body))); } catch (error) { return next(error); } }
export async function markAtLocation(req, res, next) { try { const { id } = idParamsSchema.parse(req.params); return successResponse(res, await service.markAtLocation(req.tenant.companyId, id)); } catch (error) { return next(error); } }
export async function createPayment(req, res, next) { try { return createdResponse(res, await service.registerPayment(req.tenant.companyId, paymentSchema.parse(req.body))); } catch (error) { return next(error); } }
export async function confirmPayment(req, res, next) { try { const { id } = idParamsSchema.parse(req.params); return successResponse(res, await service.confirmPayment(req.tenant.companyId, id, { amount_received: req.body.amount_received })); } catch (error) { return next(error); } }

export default { settings, updateSettings, drivers, createDriver, deliveries, createDelivery, showDelivery, updateStatus, markAtLocation, createPayment, confirmPayment };
