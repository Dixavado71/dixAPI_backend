-- Tenant-safe order/customer relationship.
-- Validate existing cross-tenant rows before applying in a controlled database.

ALTER TABLE "customers"
  ADD CONSTRAINT "customers_company_id_id_key" UNIQUE ("company_id", "id");

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_company_id_id_key" UNIQUE ("company_id", "id");

ALTER TABLE "orders"
  DROP CONSTRAINT IF EXISTS "orders_customer_id_fkey";

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_company_id_customer_id_fkey"
  FOREIGN KEY ("company_id", "customer_id")
  REFERENCES "customers" ("company_id", "id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
