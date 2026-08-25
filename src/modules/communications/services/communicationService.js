import { BadRequestError } from '../../../shared/errors/AppError.js';
import * as repository from '../repositories/communicationRepository.js';

export const listCommunications = (companyId) => repository.listCommunications(companyId);

export async function createCommunication(companyId, senderId, data) {
  if (data.scheduledAt && data.scheduledAt <= new Date()) throw new BadRequestError('Scheduled time must be in the future');
  return repository.createCommunication(companyId, senderId, data);
}
