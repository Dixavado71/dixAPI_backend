import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './infrastructure/database/prismaClient.js';
import { connectRedis, disconnectRedis } from './infrastructure/cache/redisClient.js';
import logger from './config/logger.js';

let server;
let shuttingDown = false;

const SHUTDOWN_TIMEOUT_MS = 10000;

async function startServer() {
  await connectDatabase();
  await connectRedis();

  server = app.listen(env.port, () => {
    logger.info({ port: env.port }, 'HTTP server started');
  });
}

async function closeDependencies() {
  await Promise.allSettled([disconnectRedis(), disconnectDatabase()]);
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Shutdown signal received');

  const forceExit = setTimeout(() => {
    logger.error('Shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  if (!server) {
    await closeDependencies();
    process.exit(0);
    return;
  }

  server.close(async () => {
    await closeDependencies();
    clearTimeout(forceExit);
    process.exit(0);
  });
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error({ error: reason instanceof Error ? reason.message : reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (error) => {
  logger.error({ error: error.message }, 'Uncaught exception');
  void shutdown('uncaughtException');
});

startServer().catch(async (error) => {
  logger.error({ error: error.message }, 'Failed to start server');
  await disconnectRedis();
  await disconnectDatabase();
  process.exit(1);
});
