import { ConflictError, NotFoundError, UnauthorizedError } from '../../../shared/errors/AppError.js';
import prisma from '../../../infrastructure/database/prismaClient.js';
import * as paymentRepository from '../repositories/paymentRepository.js';

const STATUS_BY_EVENT = {
  paid: { status: 'paid', timestampField: 'confirmed_at' },
  authorized: { status: 'authorized', timestampField: 'authorized_at' },
  refunded: { status: 'refunded', timestampField: 'refunded_at' },
  failed: { status: 'failed' },
  cancelled: { status: 'cancelled' },
};

export async function processPaymentEvent({ companyId, paymentId, provider, providerEventId, eventType, signatureValid, providerTimestamp, payloadHash }) {
  if (!signatureValid) throw new UnauthorizedError('Invalid payment signature');
  return prisma.$transaction(async (tx) => {
    const payment = await paymentRepository.findPaymentRecord(tx, paymentId, companyId);
    if (!payment) throw new NotFoundError('Payment');
    const existing = await paymentRepository.findPaymentEvent(tx, companyId, provider, providerEventId);
    if (existing) return existing;
    try {
      const event = await paymentRepository.createPaymentEvent(tx, {
        company_id: companyId,
        payment_id: paymentId,
        provider,
        provider_event_id: providerEventId,
        event_type: eventType,
        signature_valid: true,
        provider_timestamp: providerTimestamp,
        payload_hash: payloadHash,
        status: 'processed',
        processed_at: new Date(),
      });
      const recordUpdate = STATUS_BY_EVENT[eventType];
      if (recordUpdate) {
        const fields = {
          provider_event_id: providerEventId,
          ...(recordUpdate.timestampField ? { [recordUpdate.timestampField]: providerTimestamp ?? new Date() } : {}),
          ...(eventType === 'paid' ? { amount_received: payment.amount } : {}),
          ...(eventType === 'failed' ? { failure_code: eventType, failure_reason: 'Payment failed by provider' } : {}),
        };
        await paymentRepository.updatePaymentRecordStatus(tx, paymentId, companyId, recordUpdate.status, fields);
      }
      return event;
    } catch (error) {
      if (error.code === 'P2002') throw new ConflictError('Payment event already processed');
      throw error;
    }
  });
}
