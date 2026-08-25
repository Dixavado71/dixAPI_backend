import { describe, expect, it } from 'vitest';
import { calculateNextAttempt, canRetry, MAX_ATTEMPTS } from '../src/modules/communications/services/deliveryRetryService.js';

describe('communication delivery retry', () => {
  it('uses exponential backoff', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    expect(calculateNextAttempt(0, now).getTime()).toBe(now.getTime() + 30000);
    expect(calculateNextAttempt(1, now).getTime()).toBe(now.getTime() + 60000);
  });

  it('stops retrying at the maximum', () => {
    expect(calculateNextAttempt(MAX_ATTEMPTS)).toBeNull();
    expect(canRetry('failed', MAX_ATTEMPTS)).toBe(false);
    expect(canRetry('delivered', 0)).toBe(false);
  });
});
