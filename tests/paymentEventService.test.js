import { beforeEach, describe, expect, it, vi } from 'vitest';

const transaction = vi.fn();
const prisma = { $transaction: transaction };

vi.mock('../src/infrastructure/database/prismaClient.js', () => ({ default: prisma }));
const { processPaymentEvent } = await import('../src/modules/payments/services/paymentEventService.js');

const payment = { id: 'payment-1', company_id: 'company-1' };
const event = {
  companyId: 'company-1',
  paymentId: 'payment-1',
  provider: 'gateway',
  providerEventId: 'event-1',
  eventType: 'paid',
  signatureValid: true,
  payloadHash: 'a'.repeat(64),
};

function txClient(existing = null) {
  return {
    paymentRecord: { findFirst: vi.fn().mockResolvedValue(payment) },
    paymentEvent: {
      findUnique: vi.fn().mockResolvedValue(existing),
      create: vi.fn().mockResolvedValue({ id: 'event-record-1', ...event }),
    },
  };
}

describe('payment event security', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects invalid signatures before database access', async () => {
    await expect(processPaymentEvent({ ...event, signatureValid: false })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects payment references outside the tenant', async () => {
    const client = txClient();
    client.paymentRecord.findFirst.mockResolvedValue(null);
    transaction.mockImplementation(callback => callback(client));

    await expect(processPaymentEvent(event)).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
  });

  it('returns an existing event during replay', async () => {
    const existing = { id: 'event-record-1', status: 'processed' };
    const client = txClient(existing);
    transaction.mockImplementation(callback => callback(client));

    await expect(processPaymentEvent(event)).resolves.toEqual(existing);
    expect(client.paymentEvent.findUnique).toHaveBeenCalledWith({
      where: { company_id_provider_provider_event_id: { company_id: 'company-1', provider: 'gateway', provider_event_id: 'event-1' } },
    });
    expect(client.paymentEvent.create).not.toHaveBeenCalled();
  });
});
