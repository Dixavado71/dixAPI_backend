import { beforeEach, describe, expect, it, vi } from 'vitest';

const repository = {
  findSettings: vi.fn(),
  findDeliveryByOrderId: vi.fn(),
  findOrder: vi.fn(),
  createDelivery: vi.fn(),
  findDelivery: vi.fn(),
  updateDelivery: vi.fn(),
  findPayment: vi.fn(),
  createPayment: vi.fn(),
  updatePayment: vi.fn(),
};

vi.mock('../src/modules/delivery/repositories/deliveryRepository.js', () => repository);

const { createDelivery, registerPayment, confirmPayment, updateStatus } = await import('../src/modules/delivery/services/deliveryService.js');

describe('delivery service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects delivery when the company has disabled the service', async () => {
    repository.findSettings.mockResolvedValue({ enabled: false, pickup_enabled: true });

    await expect(createDelivery('company-1', { mode: 'delivery', order_id: 'order-1' }))
      .rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('rejects delivery when the order is outside the tenant', async () => {
    repository.findSettings.mockResolvedValue({ enabled: true, pickup_enabled: true });
    repository.findOrder.mockResolvedValue(null);
    await expect(createDelivery('company-1', { mode: 'delivery', order_id: 'order-1' })).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
  });

  it('rejects invalid delivery status transitions', async () => {
    repository.findDelivery.mockResolvedValue({ id: 'delivery-1', status: 'delivered' });
    await expect(updateStatus('company-1', 'delivery-1', { status: 'pending' })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('requires a failure reason for failed deliveries', async () => {
    repository.findDelivery.mockResolvedValue({ id: 'delivery-1', status: 'in_transit' });
    await expect(updateStatus('company-1', 'delivery-1', { status: 'failed' })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('calculates change and keeps cash payment pending until driver confirmation', async () => {
    repository.findSettings.mockResolvedValue({ enabled: true, pickup_enabled: true });
    repository.findOrder.mockResolvedValue({ id: 'order-1', status: 'pending' });
    repository.findDeliveryByOrderId.mockResolvedValue(null);
    repository.createDelivery.mockResolvedValue({ id: 'delivery-1' });
    repository.createPayment.mockImplementation(async (_companyId, { amount_received, change_amount, status }) => ({ amount_received, change_amount, status }));

    const result = await registerPayment('company-1', {
      order_id: 'order-1',
      method: 'cash_on_delivery',
      channel: 'delivery_cash',
      amount: 35,
      amount_received: 50,
      confirmed_by_driver: false,
    });

    expect(result).toEqual({ amount_received: 50, change_amount: 15, status: 'pending' });
  });

  it('rejects cash payment with insufficient amount', async () => {
    await expect(registerPayment('company-1', {
      order_id: 'order-1',
      method: 'cash_on_delivery',
      channel: 'delivery_cash',
      amount: 35,
      amount_received: 30,
    })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('confirms cash payment and calculates change', async () => {
    repository.findPayment.mockResolvedValue({ id: 'payment-1', method: 'cash_on_delivery', amount: 35 });
    repository.updatePayment.mockResolvedValue({ count: 1 });
    repository.findPayment.mockResolvedValueOnce({ id: 'payment-1', method: 'cash_on_delivery', amount: 35 }).mockResolvedValueOnce({ status: 'paid', change_amount: 15 });

    const result = await confirmPayment('company-1', 'payment-1', { amount_received: 50 });

    expect(repository.updatePayment).toHaveBeenCalledWith('company-1', 'payment-1', expect.objectContaining({ change_amount: 15, confirmed_by_driver: true }));
    expect(result).toEqual({ status: 'paid', change_amount: 15 });
  });
});
