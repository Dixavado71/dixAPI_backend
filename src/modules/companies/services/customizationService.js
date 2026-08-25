import * as repository from '../../../modules/promotions/repositories/promotionRepository.js';

export const getCustomization = (companyId) => repository.getCustomization(companyId);
export const updateCustomization = (companyId, data) => repository.upsertCustomization(companyId, data);
