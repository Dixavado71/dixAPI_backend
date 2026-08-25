import { describe, expect, it, vi } from 'vitest';

const repository = { createCommunication: vi.fn() };
vi.mock('../src/modules/communications/repositories/communicationRepository.js', () => repository);
const { createCommunication } = await import('../src/modules/communications/services/communicationService.js');

describe('communication service', () => {
  it('rejects schedules in the past', async () => {
    await expect(createCommunication('company-1', 'user-1', { title: 'Notice', body: 'Body', audience: 'employees', channel: 'in_app', scheduledAt: new Date(Date.now() - 1000) })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});
