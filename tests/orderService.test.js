import { describe, it, expect, vi, beforeEach } from 'vitest';

const repo = {
  listOrders: vi.fn(),
  findOrderById: vi.fn(),
  createOrder: vi.fn(),
  updateOrder: vi.fn(),
  findUpdatedOrder: vi.fn(),
};
vi.mock('../src/modules/orders/repositories/orderRepository.js', () => repo);
vi.mock('../src/modules/notifications/services/orderNotificationService.js', () => ({ handleOrderEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../src/modules/notifications/services/notificationService.js', () => ({
  dispatchEvent: vi.fn().mockResolvedValue({ dispatched: 0 }),
  dispatchEventAsync: vi.fn(),
}));

const service = await import('../src/modules/orders/services/orderService.js');

const rawOrder = {
  id: 'o1',
  order_number: 'ORD-123',
  company_id: 'c1',
  customer_id: 'cust1',
  status: 'pending',
  payment_method: 'pix',
  subtotal: '100.00',
  discount: '0',
  shipping_cost: '10.00',
  total: '110.00',
  shipping_address: 'Rua A',
  notes: null,
  order_date: '2026-01-01T00:00:00.000Z',
  completed_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  order_items: [
    { id: 'i1', order_id: 'o1', product_id: 'p1', quantity: 2, unit_price: '50.00', unit_cost: '20.00', subtotal: '100.00', product: { id: 'p1', name: 'Produto' } },
  ],
  customer: { id: 'cust1', name: 'Maria' },
  payments: [],
};

describe('orderService DTO (camelCase) + dispatchEvent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps order to camelCase', async () => {
    repo.listOrders.mockResolvedValue([rawOrder]);
    const result = await service.listOrders('c1');
    expect(result[0]).toMatchObject({
      orderNumber: 'ORD-123',
      paymentMethod: 'pix',
      shippingCost: '10.00',
      orderDate: '2026-01-01T00:00:00.000Z',
    });
    expect(result[0].orderItems[0]).toMatchObject({ unitPrice: '50.00', unitCost: '20.00' });
    expect(result[0].order_items).toBeUndefined();
    expect(result[0].order_number).toBeUndefined();
  });

  it('dispatches order_created event', async () => {
    const { dispatchEventAsync } = await import('../src/modules/notifications/services/notificationService.js');
    repo.createOrder.mockResolvedValue(rawOrder);
    await service.createOrder('c1', { customerId: 'cust1', paymentMethod: 'pix', items: [{ productId: 'p1', quantity: 2 }] });
    expect(dispatchEventAsync).toHaveBeenCalledWith(expect.objectContaining({ event: 'order_created', companyId: 'c1' }));
  });
});