import * as service from '../services/communicationService.js';
import { communicationSchema } from '../validators/communicationValidators.js';
import { createdResponse, successResponse } from '../../../shared/utils/response.js';

export async function list(req, res, next) {
  try { return successResponse(res, await service.listCommunications(req.tenant.companyId)); } catch (error) { next(error); }
}

export async function create(req, res, next) {
  try { return createdResponse(res, await service.createCommunication(req.tenant.companyId, req.user.id, communicationSchema.parse(req.body))); } catch (error) { next(error); }
}
