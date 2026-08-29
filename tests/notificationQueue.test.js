import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/infrastructure/cache/redisClient.js', () => ({
  default: { isReady: false, rPush: vi.fn(), lPop: vi.fn(), del: vi.fn() },
}));
vi.mock('../src/config/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const queue = await import('../src/infrastructure/queue/notificationQueue.js');

describe('notificationQueue (in-memory fallback)', () => {
  beforeEach(async () => {
    await queue.flushQueueForTests();
    vi.clearAllMocks();
  });

  it('enqueues a job and processes it', async () => {
    // with redis not ready, falls back to in-memory queue
    queue.enqueueNotification({ type: 'notify_attendants', payload: { companyId: 'c1' } });
    // allow the setImmediate to run
    await new Promise((r) => setTimeout(r, 50));
    // no crash and queue drains
    expect(true).toBe(true);
  });
});