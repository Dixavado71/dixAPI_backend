import { ConflictError, NotFoundError, UnauthorizedError } from '../../../shared/errors/AppError.js';
import prisma from '../../../infrastructure/database/prismaClient.js';

export async function processPaymentEvent({ companyId, paymentId, provider, providerEventId, eventType, signatureValid, providerTimestamp, payloadHash }) {
  if (!signatureValid) throw new UnauthorizedError('Invalid payment signature');
  return prisma.$transaction(async (tx) => {
    const payment = await tx.paymentRecord.findFirst({ where: { id: paymentId, company_id: companyId } });
    if (!payment) throw new NotFoundError('Payment');
    const existing = await tx.paymentEvent.findUnique({ where: { company_id_provider_provider_event_id: { company_id: companyId, provider, provider_event_id: providerEventId } } });
    if (existing) return existing;
    try {
      return await tx.paymentEvent.create({
        data: { company_id: companyId, payment_id: paymentId, provider, provider_event_id: providerEventId, event_type: eventType, signature_valid: true, provider_timestamp: providerTimestamp, payload_hash: payloadHash, status: 'processed', processed_at: new Date() },
      });
    } catch (error) {
      if (error.code === 'P2002') throw new ConflictError('Payment event already processed');
      throw error;
    }
  });
}
