import logger from '../../config/logger.js';
import redis from '../cache/redisClient.js';

const QUEUE_KEY = 'diix:notifications:queue';
const RETRY_LIMIT = 3;
const RETRY_BASE_DELAY_MS = 1000;
let processing = false;
let inMemoryQueue = [];

export function enqueueNotification(job) {
  if (redis.isReady) {
    redis.rPush(QUEUE_KEY, JSON.stringify({ ...job, attempts: 0, queuedAt: Date.now() })).catch(() => {
      inMemoryQueue.push({ ...job, attempts: 0, queuedAt: Date.now() });
      scheduleProcessing();
    });
  } else {
    inMemoryQueue.push({ ...job, attempts: 0, queuedAt: Date.now() });
  }
  scheduleProcessing();
}

function scheduleProcessing() {
  if (processing) return;
  processing = true;
  setImmediate(() => {
    processNext().finally(() => { processing = false; });
  });
}

async function processNext() {
  let job = null;
  if (redis.isReady) {
    const raw = await redis.lPop(QUEUE_KEY).catch(() => null);
    if (raw) {
      try { job = JSON.parse(raw); } catch { job = null; }
    }
  }
  if (!job) {
    job = inMemoryQueue.shift() ?? null;
  }
  if (!job) return;

  try {
    await executeJob(job);
  } catch (error) {
    logger.error({ err: error.message, type: job.type, event: job.event }, 'fila: falha ao processar notificacao');
    await retryJob(job);
  }
}

async function executeJob(job) {
  switch (job.type) {
    case 'dispatch_event': {
      const { dispatchEvent } = await import('../../modules/notifications/services/notificationService.js');
      await dispatchEvent(job.payload);
      return;
    }
    case 'notify_attendants': {
      const { notifyAttendants } = await import('../../modules/notifications/services/notificationService.js');
      await notifyAttendants(job.payload);
      return;
    }
    default:
      logger.warn({ type: job.type }, 'fila: tipo de job desconhecido');
  }
}

async function retryJob(job) {
  job.attempts = (job.attempts ?? 0) + 1;
  if (job.attempts > RETRY_LIMIT) {
    logger.error({ event: job.event, type: job.type, attempts: job.attempts }, 'fila: desistindo apos retries');
    return;
  }
  const delay = RETRY_BASE_DELAY_MS * 2 ** (job.attempts - 1);
  setTimeout(() => {
    if (redis.isReady) {
      redis.rPush(QUEUE_KEY, JSON.stringify(job)).catch(() => { inMemoryQueue.push(job); });
    } else {
      inMemoryQueue.push(job);
    }
  }, delay);
}

export async function flushQueueForTests() {
  inMemoryQueue = [];
  if (redis.isReady) await redis.del(QUEUE_KEY).catch(() => null);
}

export default { enqueueNotification, flushQueueForTests };