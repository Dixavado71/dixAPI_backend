import { NotFoundError, BadRequestError } from '../../../shared/errors/AppError.js';
import * as billingRepository from '../repositories/billingRepository.js';

export async function getMySubscription(companyId) {
  const subscription = await billingRepository.findSubscription(companyId);
  if (!subscription) throw new NotFoundError('Subscription');
  return subscription;
}

export async function subscribe(companyId, userId, data) {
  const result = await billingRepository.subscribeAndBill({
    companyId,
    userId,
    planCode: data.planCode,
    billingCycle: data.billingCycle ?? 'monthly',
  });
  return {
    subscription: result.subscription,
    payment: {
      id: result.transaction.id,
      status: result.transaction.status,
      amount: Number(result.transaction.amount),
      plan: result.plan.name,
    },
  };
}

export async function confirmPayment(companyId, userId, transactionId) {
  const result = await billingRepository.confirmPaymentAndActivate({ companyId, userId, transactionId });
  return {
    paid: !result.alreadyPaid,
    subscription: result.subscription,
    transaction: result.transaction,
  };
}

export default { getMySubscription, subscribe, confirmPayment };
