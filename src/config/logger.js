import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.logLevel,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    env: env.nodeEnv,
  },
});

export default logger;
