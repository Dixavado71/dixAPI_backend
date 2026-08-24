import { PrismaClient } from '@prisma/client';
import { logger } from '../../config/logger.js';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
});

prisma.$on('query', (e) => {
  logger.debug({ query: e.query, params: e.params, duration: e.duration }, 'Prisma Query');
});

prisma.$on('info', (e) => {
  logger.info(e);
});

prisma.$on('warn', (e) => {
  logger.warn(e);
});

prisma.$on('error', (e) => {
  logger.error(e);
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
