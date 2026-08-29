import * as dashboardService from '../services/dashboardService.js';
import { overviewQuerySchema } from '../validators/dashboardValidators.js';
import { successResponse } from '../../../shared/utils/response.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const overview = asyncHandler(async (req, res) => {
  const { from, to } = overviewQuerySchema.parse(req.query);
  const data = await dashboardService.getOverview(req.tenant.companyId, { from, to });
  return successResponse(res, data);
});

export default { overview };
