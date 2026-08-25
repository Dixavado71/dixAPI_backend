import { NotFoundError } from '../../../shared/errors/AppError.js';
import * as repository from '../repositories/consentRepository.js';

export async function createConsent(companyId, data) {
  const consent = await repository.createConsent(companyId, data);
  if (!consent) throw new NotFoundError('Customer');
  return consent;
}

export async function listConsents(companyId, customerId) {
  const consents = await repository.listConsents(companyId, customerId);
  const customerExists = await repository.customerExists(companyId, customerId);
  if (!customerExists) throw new NotFoundError('Customer');
  return consents;
}
