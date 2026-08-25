import * as paymentEventService from '../services/paymentEventService.js';
import { paymentEventSchema } from '../validators/paymentEventValidators.js';
import { createdResponse } from '../../../shared/utils/response.js';

export async function process(req, res, next) {
  try {
    const data = paymentEventSchema.parse(req.body);
    const event = await paymentEventService.processPaymentEvent({ ...data, companyId: req.tenant.companyId });
    return createdResponse(res, event);
  } catch (error) {
    next(error);
  }
}
