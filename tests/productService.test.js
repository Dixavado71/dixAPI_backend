import { describe, it, expect, vi, beforeEach } from 'vitest';

const repo = {
  listProducts: vi.fn(),
  findProductById: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  listAllProducts: vi.fn(),
};
vi.mock('../src/modules/products/repositories/productRepository.js', () => repo);
vi.mock('../src/modules/notifications/services/notificationService.js', () => ({
  dispatchEvent: vi.fn().mockResolvedValue({ dispatched: 0 }),
  dispatchEventAsync: vi.fn(),
}));

const service = await import('../src/modules/products/services/productService.js');

const rawProduct = {
  id: 'p1',
  company_id: 'c1',
  name: 'Produto A',
  description: 'Desc',
  category: 'alimentacao',
  price: '10.00',
  cost: '5.00',
  stock: 3,
  min_stock: 5,
  total_sales: 2,
  total_revenue: '20.00',
  status: 'active',
  image_url: 'https://img.com/a.png',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
};

describe('productService DTO (camelCase)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps listProducts to camelCase', async () => {
    repo.listProducts.mockResolvedValue([rawProduct]);
    const result = await service.listProducts('c1');
    expect(result[0]).toMatchObject({
      id: 'p1',
      companyId: 'c1',
      minStock: 5,
      totalSales: 2,
      totalRevenue: '20.00',
      imageUrl: 'https://img.com/a.png',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result[0].min_stock).toBeUndefined();
    expect(result[0].image_url).toBeUndefined();
  });

  it('converts camelCase payload to Prisma snake_case on create', async () => {
    repo.createProduct.mockImplementation((companyId, data) => Promise.resolve({ ...rawProduct, company_id: companyId, ...data }));
    await service.createProduct('c1', { name: 'Produto A', category: 'alimentacao', price: 10, stock: 3, minStock: 5, imageUrl: 'https://img.com/a.png' });
    expect(repo.createProduct).toHaveBeenCalledWith('c1', expect.objectContaining({
      min_stock: 5,
      image_url: 'https://img.com/a.png',
    }));
  });

  it('dispatches stock_low when stock <= min_stock', async () => {
    const { dispatchEventAsync } = await import('../src/modules/notifications/services/notificationService.js');
    repo.createProduct.mockResolvedValue(rawProduct);
    await service.createProduct('c1', { name: 'Produto A', category: 'alimentacao', price: 10, stock: 3 });
    expect(dispatchEventAsync).toHaveBeenCalledWith(expect.objectContaining({ event: 'stock_low', companyId: 'c1' }));
  });
});