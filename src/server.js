import app from './app.js';
import { env, validateEnv } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './infrastructure/database/prismaClient.js';
import { connectRedis, disconnectRedis } from './infrastructure/cache/redisClient.js';
import logger from './config/logger.js';

let server;

async function startServer() {
  validateEnv();
  await connectDatabase();
  await connectRedis();

  server = app.listen(env.port, () => {
    logger.info({ port: env.port }, 'HTTP server started');
  });
}

async function shutdown(signal) {
  logger.info({ signal }, 'Shutdown signal received');

  if (!server) {
    await disconnectRedis();
    await disconnectDatabase();
    return;
  }

  server.close(async () => {
    await disconnectRedis();
    await disconnectDatabase();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer().catch(async (error) => {
  logger.error({ error: error.message }, 'Failed to start server');
  await disconnectRedis();
  await disconnectDatabase();
  process.exit(1);
});
