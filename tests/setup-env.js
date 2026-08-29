process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dixapi_test?sslmode=disable';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test-access-secret-min-32-characters-long!!';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-min-32-characters-long!';
process.env.EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
process.env.EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'test-key';
