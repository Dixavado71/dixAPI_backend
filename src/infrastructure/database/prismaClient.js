import { PrismaClient } from '@prisma/client';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

const databaseUrl = env.databaseUrl ? new URL(env.databaseUrl) : null;
if (databaseUrl) {
  databaseUrl.searchParams.set('connection_limit', String(env.databaseConnectionLimit));
  databaseUrl.searchParams.set('pool_timeout', String(env.databasePoolTimeout));
}

const prisma = new PrismaClient({
  ...(databaseUrl ? { datasources: { db: { url: databaseUrl.toString() } } } : {}),
  log: [
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
});

prisma.$on('warn', (event) => {
  logger.warn({ message: event.message }, 'Database warning');
});

prisma.$on('error', (event) => {
  logger.error({ message: event.message }, 'Database error');
});

export async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to connect to database');
    throw error;
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

export default prisma;
