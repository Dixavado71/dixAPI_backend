import { BadRequestError } from '../../../shared/errors/AppError.js';

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 30_000;

export function calculateNextAttempt(attemptCount, now = new Date()) {
  if (!Number.isInteger(attemptCount) || attemptCount < 0) throw new BadRequestError('Invalid attempt count');
  if (attemptCount >= MAX_ATTEMPTS) return null;
  return new Date(now.getTime() + BASE_DELAY_MS * (2 ** attemptCount));
}

export function canRetry(status, attemptCount) {
  return status === 'failed' && Number.isInteger(attemptCount) && attemptCount < MAX_ATTEMPTS;
}

export { MAX_ATTEMPTS };
