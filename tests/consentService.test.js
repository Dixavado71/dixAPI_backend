import { describe, expect, it, vi } from 'vitest';

const repository = { createConsent: vi.fn() };
vi.mock('../src/modules/consent/repositories/consentRepository.js', () => repository);
const { createConsent } = await import('../src/modules/consent/services/consentService.js');

describe('consent service', () => {
  it('rejects consent for a customer outside the tenant', async () => {
    repository.createConsent.mockResolvedValue(null);
    await expect(createConsent('company-1', { customerId: 'customer-1', status: 'opted_in', source: 'whatsapp', purpose: 'marketing' })).rejects.toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
  });
});
