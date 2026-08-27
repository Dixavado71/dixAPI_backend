import * as repo from '../repositories/dashboardRepository.js';

export async function getOverview(companyId, query) {
  return repo.getOverview(companyId, query);
}

export default { getOverview };