-- Tenant-safe assignment and notification relationships.
-- Validate existing cross-tenant rows before applying in a controlled database.

ALTER TABLE "users"
  ADD CONSTRAINT "users_company_id_id_key" UNIQUE ("company_id", "id");

ALTER TABLE "conversations"
  DROP CONSTRAINT IF EXISTS "conversations_assigned_to_fkey";

ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_company_id_assigned_to_fkey"
  FOREIGN KEY ("company_id", "assigned_to")
  REFERENCES "users" ("company_id", "id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "quick_replies"
  DROP CONSTRAINT IF EXISTS "quick_replies_created_by_fkey";

ALTER TABLE "quick_replies"
  ADD CONSTRAINT "quick_replies_company_id_created_by_fkey"
  FOREIGN KEY ("company_id", "created_by")
  REFERENCES "users" ("company_id", "id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_company_id_id_key" UNIQUE ("company_id", "id");

ALTER TABLE "notifications"
  DROP CONSTRAINT IF EXISTS "notifications_user_id_fkey";

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_company_id_user_id_fkey"
  FOREIGN KEY ("company_id", "user_id")
  REFERENCES "users" ("company_id", "id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
