import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 7171,
  
  databaseUrl: process.env.DATABASE_URL,
  
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  
  logLevel: process.env.LOG_LEVEL || 'info',
  
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123',
  defaultManagerPassword: process.env.DEFAULT_MANAGER_PASSWORD || 'Manager@123',
  defaultOperatorPassword: process.env.DEFAULT_OPERATOR_PASSWORD || 'Operator@123',
};

export function validateEnv() {
  const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
