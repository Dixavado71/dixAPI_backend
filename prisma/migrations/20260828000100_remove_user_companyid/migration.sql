-- Remove coluna companyId da tabela users (nunca foi criada, safe no-op)
ALTER TABLE users DROP CONSTRAINT IF EXISTS "users_companyId_fkey";
ALTER TABLE users DROP COLUMN IF EXISTS "companyId";