import * as dashboardService from '../services/dashboardService.js';
import { successResponse } from '../../../shared/utils/response.js';

export async function overview(req, res, next) {
  try {
    const { from, to } = req.query;
    const data = await dashboardService.getOverview(req.tenant.companyId, { from, to });
    return successResponse(res, data);
  } catch (error) { return next(error); }
}

export default { overview };
