import * as paymentEventService from '../services/paymentEventService.js';
import { paymentEventSchema } from '../validators/paymentEventValidators.js';
import { createdResponse } from '../../../shared/utils/response.js';
import { asyncHandler } from '../../../shared/utils/asyncHandler.js';

export const process = asyncHandler(async (req, res) => {
  const data = paymentEventSchema.parse(req.body);
  const event = await paymentEventService.processPaymentEvent({ ...data, companyId: req.tenant.companyId });
  return createdResponse(res, event);
});
