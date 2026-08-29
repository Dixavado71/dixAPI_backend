import { describe, expect, it, vi } from 'vitest';

const findFirst = vi.fn().mockResolvedValue(null);
const findMany = vi.fn().mockResolvedValue([]);
const count = vi.fn().mockResolvedValue(0);
vi.mock('../src/infrastructure/database/prismaClient.js', () => ({
  default: {
    customer: { findFirst, findMany, count },
    product: { findFirst, findMany },
    order: { findFirst, findMany },
  },
}));

const customerService = await import('../src/modules/customers/services/customerService.js');
const productRepository = await import('../src/modules/products/repositories/productRepository.js');
const orderRepository = await import('../src/modules/orders/repositories/orderRepository.js');

describe('tenant repository scope', () => {
  it('scopes customer lookup and listing by company', async () => {
    await customerService.findCustomerById('company-a', 'customer-a');
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'customer-a', company_id: 'company-a' } });
    await customerService.listCustomers('company-a');
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { company_id: 'company-a' } }));
  });

  it('scopes product lookup and listing by company', async () => {
    await productRepository.findProductById('product-a', 'company-a');
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'product-a', company_id: 'company-a' } });
    await productRepository.listAllProducts('company-a');
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { company_id: 'company-a' } }));
  });

  it('scopes order lookup and listing by company', async () => {
    await orderRepository.findOrderById('company-a', 'order-a');
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'order-a', company_id: 'company-a' } }));
    await orderRepository.listOrders('company-a');
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { company_id: 'company-a' } }));
  });
});
