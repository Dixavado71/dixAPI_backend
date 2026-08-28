import prisma from '../../../infrastructure/database/prismaClient.js';
import { NotFoundError } from '../../../shared/errors/AppError.js';

export function findPlanByCode(code) {
  return prisma.plan.findUnique({ where: { code } });
}

export function findSubscription(companyId) {
  return prisma.companySubscription.findUnique({
    where: { company_id: companyId },
    include: { plan: true },
  });
}

export function findCompanyWithReseller(companyId) {
  return prisma.company.findUnique({
    where: { id: companyId },
    include: { reseller: true },
  });
}

export function subscribeAndBill(data) {
  return prisma.$transaction(async (tx) => {
    const plan = await tx.plan.findUnique({ where: { code: data.planCode } });
    if (!plan) throw new NotFoundError('Plano não encontrado');

    const now = new Date();
    const periodEnd = new Date(now);
    if (data.billingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }
    const price = data.billingCycle === 'yearly' ? plan.yearly_price : plan.monthly_price;

    const subscription = await tx.companySubscription.upsert({
      where: { company_id: data.companyId },
      create: {
        company_id: data.companyId,
        plan_id: plan.id,
        status: 'trialing',
        billing_cycle: data.billingCycle,
        price,
        current_period_start: now,
        current_period_end: periodEnd,
        trial_ends_at: plan.trial_days > 0 ? new Date(now.getTime() + plan.trial_days * 86400000) : null,
      },
      update: {
        plan_id: plan.id,
        billing_cycle: data.billingCycle,
        price,
        current_period_start: now,
        current_period_end: periodEnd,
      },
    });

    const transaction = await tx.platformTransaction.create({
      data: {
        company_id: data.companyId,
        type: 'subscription',
        status: 'pending',
        amount: price,
        currency: 'BRL',
      },
    });

    await tx.subscriptionEvent.create({
      data: {
        subscription_id: subscription.id,
        event_type: 'plan_selected',
        new_plan_id: plan.id,
        metadata: { planCode: data.planCode, billingCycle: data.billingCycle },
        created_by: data.userId,
      },
    });

    return { subscription, transaction, plan };
  });
}

export function confirmPaymentAndActivate(data) {
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.platformTransaction.findFirst({
      where: { id: data.transactionId, company_id: data.companyId },
    });
    if (!transaction) throw new NotFoundError('Transação não encontrada');
    if (transaction.status === 'paid') return { transaction, subscription: await tx.companySubscription.findUnique({ where: { company_id: data.companyId } }), alreadyPaid: true };

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const updatedTransaction = await tx.platformTransaction.update({
      where: { id: transaction.id },
      data: { status: 'paid', paid_at: now },
    });

    const subscription = await tx.companySubscription.update({
      where: { company_id: data.companyId },
      data: { status: 'active', current_period_start: now, current_period_end: periodEnd, trial_ends_at: null },
    });

    const company = await tx.company.findUnique({
      where: { id: data.companyId },
      include: { reseller: true },
    });

    if (company?.reseller_id && company.reseller) {
      const baseAmount = Number(updatedTransaction.amount);
      const commissionAmount = company.reseller.commission_type === 'percentage'
        ? baseAmount * Math.min(Number(company.reseller.commission_value) / 100, 1)
        : 0;
      await tx.commission.create({
        data: {
          reseller_id: company.reseller_id,
          company_id: data.companyId,
          platform_transaction_id: transaction.id,
          type: 'subscription',
          rate: company.reseller.commission_type === 'percentage' ? Math.min(Number(company.reseller.commission_value) / 100, 1) : 0,
          base_amount: updatedTransaction.amount,
          amount: commissionAmount,
          status: 'pending',
        },
      });
    }

    await tx.companyStatusHistory.create({
      data: {
        company_id: data.companyId,
        from_status: null,
        to_status: 'active',
        reason: 'Subscription activated after payment',
        changed_by: data.userId,
      },
    });

    await tx.auditLog.create({
      data: {
        company_id: data.companyId,
        user_id: data.userId,
        action: 'payment',
        entity_type: 'platform_transaction',
        entity_id: transaction.id,
        after_data: { amount: Number(updatedTransaction.amount), status: 'paid' },
      },
    });

    return { transaction: updatedTransaction, subscription, alreadyPaid: false };
  });
}

export default {
  findPlanByCode,
  findSubscription,
  findCompanyWithReseller,
  subscribeAndBill,
  confirmPaymentAndActivate,
};
