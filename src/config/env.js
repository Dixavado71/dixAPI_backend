import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number.parseInt(process.env.PORT, 10) || 7171,
  databaseUrl: process.env.DATABASE_URL,
  databaseConnectionLimit: Number.parseInt(process.env.DATABASE_CONNECTION_LIMIT, 10) || 10,
  databasePoolTimeout: Number.parseInt(process.env.DATABASE_POOL_TIMEOUT, 10) || 10,
  redisUrl: process.env.REDIS_URL,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  jwtIssuer: process.env.JWT_ISSUER || 'dixapi',
  jwtAudience: process.env.JWT_AUDIENCE || 'dixapi-api',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  logLevel: process.env.LOG_LEVEL || 'info',
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD,
  defaultManagerPassword: process.env.DEFAULT_MANAGER_PASSWORD,
  defaultOperatorPassword: process.env.DEFAULT_OPERATOR_PASSWORD,
};

export function validateEnv() {
  const required = ['DATABASE_URL', 'REDIS_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (env.nodeEnv === 'production') {
    const weakSecrets = [env.jwtAccessSecret, env.jwtRefreshSecret].some(secret => !secret || secret.length < 32);
    if (weakSecrets) throw new Error('JWT secrets must contain at least 32 characters in production');
    if (env.corsOrigin === '*') throw new Error('CORS_ORIGIN cannot be wildcard in production');
    const redisUsesInternalRailwayNetwork = env.redisUrl?.startsWith('redis://') && env.redisUrl.includes('.railway.internal');
    if (env.redisUrl && !env.redisUrl.startsWith('rediss://') && !redisUsesInternalRailwayNetwork) throw new Error('Redis TLS is required in production');
    const databaseUsesInternalRailwayNetwork = env.databaseUrl?.includes('postgres.railway.internal');
    if (env.databaseUrl && !env.databaseUrl.includes('sslmode=require') && !databaseUsesInternalRailwayNetwork) throw new Error('PostgreSQL TLS is required in production');
  }
}
