import { createClient } from 'redis';
import { env } from '../../config/env.js';
import logger from '../../config/logger.js';

const redis = createClient({
  url: env.redisUrl,
  socket: {
    connectTimeout: 10000,
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    // TLS configuration for Railway Redis
    tls: env.redisUrl.startsWith('rediss://') ? {
      rejectUnauthorized: false, // Railway uses self-signed certs
    } : undefined,
  },
});

redis.on('error', (error) => {
  logger.error({ error: error.message, stack: error.stack }, 'Redis client error');
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

redis.on('reconnecting', () => {
  logger.warn('Redis reconnecting...');
});

redis.on('ready', () => {
  logger.info('Redis ready');
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
