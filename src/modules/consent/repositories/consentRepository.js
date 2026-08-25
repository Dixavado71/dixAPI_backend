import prisma from '../../../infrastructure/database/prismaClient.js';

export function createConsent(companyId, data) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findFirst({ where: { id: data.customerId, company_id: companyId } });
    if (!customer) return null;
    return tx.customerConsent.create({
      data: { company_id: companyId, customer_id: data.customerId, status: data.status, source: data.source, purpose: data.purpose, retention_until: data.retentionUntil, evidence_ref: data.evidenceRef },
    });
  });
}

export function customerExists(companyId, customerId) {
  return prisma.customer.count({ where: { id: customerId, company_id: companyId } }).then(count => count > 0);
}

export function listConsents(companyId, customerId) {
  return prisma.customerConsent.findMany({ where: { company_id: companyId, customer_id: customerId }, orderBy: { occurred_at: 'desc' } });
}
