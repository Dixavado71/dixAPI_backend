import { NotFoundError, BadRequestError } from '../../../shared/errors/AppError.js';
import * as billingRepository from '../repositories/billingRepository.js';

function mapPlan(plan) {
  if (!plan) return plan;
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description,
    monthlyPrice: plan.monthly_price,
    yearlyPrice: plan.yearly_price,
    trialDays: plan.trial_days,
    maxUsers: plan.max_users,
    maxProducts: plan.max_products,
    maxOrdersMonth: plan.max_orders_month,
    maxDrivers: plan.max_drivers,
    isActive: plan.is_active,
    createdAt: plan.created_at,
    updatedAt: plan.updated_at,
  };
}

function mapSubscription(subscription) {
  if (!subscription) return subscription;
  return {
    id: subscription.id,
    companyId: subscription.company_id,
    planId: subscription.plan_id,
    status: subscription.status,
    billingCycle: subscription.billing_cycle,
    price: subscription.price,
    startedAt: subscription.started_at,
    currentPeriodStart: subscription.current_period_start,
    currentPeriodEnd: subscription.current_period_end,
    trialEndsAt: subscription.trial_ends_at,
    graceEndsAt: subscription.grace_ends_at,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    cancelledAt: subscription.cancelled_at,
    externalCustomerId: subscription.external_customer_id,
    externalSubscriptionId: subscription.external_subscription_id,
    createdAt: subscription.created_at,
    updatedAt: subscription.updated_at,
    plan: mapPlan(subscription.plan),
  };
}

export async function getMySubscription(companyId) {
  const subscription = await billingRepository.findSubscription(companyId);
  if (!subscription) throw new NotFoundError('Subscription');
  return mapSubscription(subscription);
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
