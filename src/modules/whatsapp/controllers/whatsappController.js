import * as whatsappService from '../services/whatsappService.js';
import { connectNumberSchema, sendMessageSchema, sendMediaSchema } from '../validators/whatsappValidators.js';
import { successResponse, createdResponse } from '../../../shared/utils/response.js';

export async function listNumbers(req, res, next) {
  try {
    const data = await whatsappService.listNumbers(req.tenant.companyId);
    return successResponse(res, data);
  } catch (error) { return next(error); }
}

export async function connectNumber(req, res, next) {
  try {
    const data = connectNumberSchema.parse(req.body);
    const result = await whatsappService.connectNumber(req.tenant.companyId, data);
    return createdResponse(res, result);
  } catch (error) { return next(error); }
}

export async function getQrCode(req, res, next) {
  try {
    const result = await whatsappService.getQrCode(req.tenant.companyId, req.params.id);
    return successResponse(res, result);
  } catch (error) { return next(error); }
}

export async function getStatus(req, res, next) {
  try {
    const result = await whatsappService.getStatus(req.tenant.companyId, req.params.id);
    return successResponse(res, result);
  } catch (error) { return next(error); }
}

export async function disconnectNumber(req, res, next) {
  try {
    const result = await whatsappService.disconnectNumber(req.tenant.companyId, req.params.id);
    return successResponse(res, result);
  } catch (error) { return next(error); }
}

export async function sendMessage(req, res, next) {
  try {
    const data = sendMessageSchema.parse(req.body);
    const result = await whatsappService.sendMessage(req.tenant.companyId, req.params.id, data);
    return createdResponse(res, result);
  } catch (error) { return next(error); }
}

export async function sendMedia(req, res, next) {
  try {
    const data = sendMediaSchema.parse(req.body);
    const result = await whatsappService.sendMedia(req.tenant.companyId, req.params.id, data);
    return createdResponse(res, result);
  } catch (error) { return next(error); }
}

export async function webhook(req, res, next) {
  try {
    await whatsappService.handleWebhook(req.params.instanceName, req.body);
    return res.status(200).json({ success: true });
  } catch (error) { return next(error); }
}

export default { listNumbers, connectNumber, getQrCode, getStatus, disconnectNumber, sendMessage, sendMedia, webhook };