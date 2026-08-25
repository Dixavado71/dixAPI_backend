-- Tenant-safe cross-tenant relationships.
-- Validate existing cross-tenant rows before applying in a controlled database.

ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_company_id_id_key" UNIQUE ("company_id", "id");

ALTER TABLE "delivery_zones"
  ADD CONSTRAINT "delivery_zones_company_id_id_key" UNIQUE ("company_id", "id");

ALTER TABLE "delivery_drivers"
  ADD CONSTRAINT "delivery_drivers_company_id_id_key" UNIQUE ("company_id", "id");

ALTER TABLE "deliveries"
  ADD CONSTRAINT "deliveries_company_id_id_key" UNIQUE ("company_id", "id");

ALTER TABLE "conversations"
  DROP CONSTRAINT IF EXISTS "conversations_customer_id_fkey";

ALTER TABLE "conversations"
  ADD CONSTRAINT "conversations_company_id_customer_id_fkey"
  FOREIGN KEY ("company_id", "customer_id")
  REFERENCES "customers" ("company_id", "id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE "deliveries"
  DROP CONSTRAINT IF EXISTS "deliveries_zone_id_fkey",
  DROP CONSTRAINT IF EXISTS "deliveries_driver_id_fkey";

ALTER TABLE "deliveries"
  ADD CONSTRAINT "deliveries_company_id_zone_id_fkey"
  FOREIGN KEY ("company_id", "zone_id")
  REFERENCES "delivery_zones" ("company_id", "id")
  ON DELETE SET NULL
  ON UPDATE CASCADE,
  ADD CONSTRAINT "deliveries_company_id_driver_id_fkey"
  FOREIGN KEY ("company_id", "driver_id")
  REFERENCES "delivery_drivers" ("company_id", "id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "payment_records"
  DROP CONSTRAINT IF EXISTS "payment_records_order_id_fkey",
  DROP CONSTRAINT IF EXISTS "payment_records_delivery_id_fkey";

ALTER TABLE "payment_records"
  ADD CONSTRAINT "payment_records_company_id_order_id_fkey"
  FOREIGN KEY ("company_id", "order_id")
  REFERENCES "orders" ("company_id", "id")
  ON DELETE CASCADE
  ON UPDATE CASCADE,
  ADD CONSTRAINT "payment_records_company_id_delivery_id_fkey"
  FOREIGN KEY ("company_id", "delivery_id")
  REFERENCES "deliveries" ("company_id", "id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
