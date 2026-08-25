import { createClient } from 'redis';
import { env } from '../../config/env.js';
import logger from '../../config/logger.js';

const redis = createClient({
  url: env.redisUrl,
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
  },
});

redis.on('error', (error) => {
  logger.error({ error: error.message }, 'Redis client error');
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

export async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect();
  }
}

export async function disconnectRedis() {
  if (redis.isOpen) {
    await redis.quit();
    logger.info('Redis disconnected');
  }
}

export default redis;
