import { beforeEach, describe, expect, it, vi } from 'vitest';

const repository = { findCategoryForCompany: vi.fn(), findServiceForCompany: vi.fn(), upsertCompanyCategory: vi.fn(), upsertCompanyService: vi.fn() };
vi.mock('../src/modules/catalog/repositories/catalogRepository.js', () => repository);
const { addCompanyCategory, addCompanyService } = await import('../src/modules/catalog/services/catalogService.js');

describe('catalog service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects attaching an unavailable category', async () => {
    repository.findCategoryForCompany.mockResolvedValue(null);
    await expect(addCompanyCategory('company-1', { categoryId: 'category-1' })).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
  });

  it('rejects attaching an unavailable service', async () => {
    repository.findServiceForCompany.mockResolvedValue(null);
    await expect(addCompanyService('company-1', { serviceId: 'service-1' })).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
  });
});
