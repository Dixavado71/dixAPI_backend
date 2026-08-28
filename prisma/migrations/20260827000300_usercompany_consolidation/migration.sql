-- Consolidação UserCompany: remove o campo redundante users.company_id.
-- A tenancy/role de loja passa a ser exclusivamente via user_companies.
-- users.role permanece para roles de plataforma (master/reseller).
-- users.email passa a ser único globalmente (um usuário, vários memberships).
-- As FKs compostas tenant-safe (conversations.assignee, quick_replies.created_by,
-- notifications.user_id) deixam de referenciar [company_id, id] do users e passam
-- a referenciar users.id diretamente (a segurança tenant continua na aplicação via
-- user_companies).

BEGIN;

-- 1) Backfill: garante membership para todo usuário que ainda não tem
INSERT INTO user_companies (id, user_id, company_id, role, is_primary, status, joined_at, created_at, updated_at)
SELECT gen_random_uuid(), u.id, u.company_id,
       CASE u.role
         WHEN 'admin' THEN 'admin'::"AccountRole"
         WHEN 'manager' THEN 'manager'::"AccountRole"
         ELSE 'operator'::"AccountRole"
       END,
       TRUE,
       CASE WHEN u.is_active THEN 'active'::"UserStatus" ELSE 'inactive'::"UserStatus" END,
       u.created_at,
       now(), now()
FROM users u
WHERE u.company_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_companies uc WHERE uc.user_id = u.id AND uc.company_id = u.company_id
  );

-- 2) Deduplicação: mescla usuários com o mesmo e-mail em diferentes empresas.
-- Mantém o usuário mais antigo como canônico e move referências para ele.
DO $$
DECLARE
  dup RECORD;
  canonical_id uuid;
  dup_id uuid;
BEGIN
  FOR dup IN
    SELECT email, array_agg(id ORDER BY created_at ASC, id ASC) AS ids
    FROM users
    GROUP BY email
    HAVING count(*) > 1
  LOOP
    canonical_id := dup.ids[1];
    FOREACH dup_id IN ARRAY dup.ids[2:]
    LOOP
      UPDATE user_companies SET user_id = canonical_id
      WHERE user_id = dup_id
        AND NOT EXISTS (SELECT 1 FROM user_companies uc2 WHERE uc2.user_id = canonical_id AND uc2.company_id = user_companies.company_id);
      DELETE FROM user_companies WHERE user_id = dup_id;
      UPDATE refresh_tokens SET user_id = canonical_id WHERE user_id = dup_id;
      UPDATE notifications SET user_id = canonical_id WHERE user_id = dup_id;
      UPDATE conversations SET assigned_to = canonical_id WHERE assigned_to = dup_id;
      UPDATE quick_replies SET created_by = canonical_id WHERE created_by = dup_id;
      UPDATE audit_logs SET user_id = canonical_id WHERE user_id = dup_id;
      DELETE FROM users WHERE id = dup_id;
    END LOOP;
  END LOOP;
END $$;

-- 3) Remove FKs compostas que dependem de users.company_id.
--    Busca FKs cujas colunas de referência (confkey) correspondem
--    às colunas da unique constraint users_company_id_id_key.
DO $$
DECLARE
  r RECORD;
  key_cols int2[];
BEGIN
  SELECT conkey INTO key_cols FROM pg_constraint WHERE conname = 'users_company_id_id_key';
  FOR r IN
    SELECT conrelid::regclass AS tbl, conname
    FROM pg_constraint
    WHERE contype = 'f'
      AND confrelid = 'users'::regclass
      AND confkey = key_cols
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.tbl, r.conname);
  END LOOP;
END $$;

-- 4) Remove constraints/índices antigos e a coluna company_id
ALTER TABLE users DROP CONSTRAINT IF EXISTS "users_company_id_fkey";
ALTER TABLE users DROP CONSTRAINT IF EXISTS "users_company_id_email_key";
ALTER TABLE users DROP CONSTRAINT IF EXISTS "users_company_id_id_key";
DROP INDEX IF EXISTS "users_company_id_idx";
DROP INDEX IF EXISTS "users_company_id_role_is_active_idx";
ALTER TABLE users DROP COLUMN IF EXISTS company_id;

-- 5) FKs simples para users.id (mantém integridade referencial; tenant na aplicação)
ALTER TABLE conversations ADD CONSTRAINT "conversations_assigned_to_fkey"
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE quick_replies ADD CONSTRAINT "quick_replies_created_by_fkey"
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE notifications ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 6) Unique global de e-mail
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON users(email);

COMMIT;
