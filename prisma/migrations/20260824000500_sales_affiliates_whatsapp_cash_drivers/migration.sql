-- Domain expansion for affiliate sales, reseller cash, WhatsApp commerce and shared drivers.
-- This migration is intentionally not applied. Validate existing schema/data in staging first.

CREATE TYPE "AffiliateSaleStatus" AS ENUM ('pending', 'approved', 'cancelled', 'paid');
CREATE TYPE "CashRegisterStatus" AS ENUM ('open', 'closed', 'reconciled');
CREATE TYPE "CashMovementType" AS ENUM ('opening', 'sale', 'expense', 'withdrawal', 'deposit', 'refund', 'adjustment', 'closing');
CREATE TYPE "WhatsAppNumberStatus" AS ENUM ('pending', 'connected', 'disconnected', 'suspended');
CREATE TYPE "WhatsAppMessageDirection" AS ENUM ('inbound', 'outbound');
CREATE TYPE "VehicleType" AS ENUM ('car', 'motorcycle', 'bicycle', 'van', 'other');

ALTER TABLE "companies" ADD COLUMN "legal_name" TEXT, ADD COLUMN "state_registration" TEXT, ADD COLUMN "support_email" TEXT, ADD COLUMN "support_phone" TEXT, ADD COLUMN "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "ecommerce_enabled" BOOLEAN NOT NULL DEFAULT true, ADD COLUMN "default_currency" TEXT NOT NULL DEFAULT 'BRL';

CREATE TABLE "affiliate_codes" (
  "id" UUID NOT NULL,
  "reseller_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "commission_rate" DECIMAL(7,4) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "affiliate_codes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "affiliate_codes_reseller_id_code_key" ON "affiliate_codes"("reseller_id", "code");
CREATE INDEX "affiliate_codes_code_is_active_idx" ON "affiliate_codes"("code", "is_active");

CREATE TABLE "affiliate_sales" (
  "id" UUID NOT NULL,
  "reseller_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "affiliate_code_id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "base_amount" DECIMAL(12,2) NOT NULL,
  "commission_rate" DECIMAL(7,4) NOT NULL,
  "commission_amount" DECIMAL(12,2) NOT NULL,
  "status" "AffiliateSaleStatus" NOT NULL DEFAULT 'pending',
  "approved_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "affiliate_sales_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "affiliate_sales_affiliate_code_id_order_id_key" ON "affiliate_sales"("affiliate_code_id", "order_id");
CREATE INDEX "affiliate_sales_reseller_id_status_created_at_idx" ON "affiliate_sales"("reseller_id", "status", "created_at");
CREATE INDEX "affiliate_sales_company_id_status_created_at_idx" ON "affiliate_sales"("company_id", "status", "created_at");

CREATE TABLE "reseller_cash_movements" (
  "id" UUID NOT NULL,
  "reseller_id" UUID NOT NULL,
  "type" "CashMovementType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "description" TEXT,
  "reference" TEXT,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reseller_cash_movements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "reseller_cash_movements_reseller_id_occurred_at_idx" ON "reseller_cash_movements"("reseller_id", "occurred_at");

CREATE TABLE "cash_registers" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "opened_by" UUID NOT NULL,
  "closed_by" UUID,
  "status" "CashRegisterStatus" NOT NULL DEFAULT 'open',
  "opening_amount" DECIMAL(12,2) NOT NULL,
  "closing_amount" DECIMAL(12,2),
  "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_at" TIMESTAMP(3),
  CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cash_registers_company_id_status_opened_at_idx" ON "cash_registers"("company_id", "status", "opened_at");

CREATE TABLE "cash_movements" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "cash_register_id" UUID NOT NULL,
  "type" "CashMovementType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "order_id" UUID,
  "payment_id" UUID,
  "description" TEXT,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "cash_movements_company_id_created_at_idx" ON "cash_movements"("company_id", "created_at");
CREATE INDEX "cash_movements_cash_register_id_created_at_idx" ON "cash_movements"("cash_register_id", "created_at");

CREATE TABLE "whatsapp_numbers" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "phone_number" TEXT NOT NULL,
  "display_name" TEXT,
  "provider" TEXT,
  "external_account_id" TEXT,
  "status" "WhatsAppNumberStatus" NOT NULL DEFAULT 'pending',
  "is_bot_enabled" BOOLEAN NOT NULL DEFAULT true,
  "webhook_verified" BOOLEAN NOT NULL DEFAULT false,
  "last_connected_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "whatsapp_numbers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "whatsapp_numbers_company_id_phone_number_key" ON "whatsapp_numbers"("company_id", "phone_number");
CREATE INDEX "whatsapp_numbers_company_id_status_idx" ON "whatsapp_numbers"("company_id", "status");

CREATE TABLE "whatsapp_contacts" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "whatsapp_number_id" UUID NOT NULL,
  "customer_id" UUID,
  "phone_number" TEXT NOT NULL,
  "name" TEXT,
  "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3),
  "metadata" JSONB,
  CONSTRAINT "whatsapp_contacts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "whatsapp_contacts_whatsapp_number_id_phone_number_key" ON "whatsapp_contacts"("whatsapp_number_id", "phone_number");
CREATE INDEX "whatsapp_contacts_company_id_phone_number_idx" ON "whatsapp_contacts"("company_id", "phone_number");

CREATE TABLE "whatsapp_messages" (
  "id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "whatsapp_number_id" UUID NOT NULL,
  "customer_id" UUID,
  "external_message_id" TEXT,
  "direction" "WhatsAppMessageDirection" NOT NULL,
  "message_type" TEXT NOT NULL,
  "content" TEXT,
  "status" TEXT,
  "order_id" UUID,
  "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "whatsapp_messages_whatsapp_number_id_external_message_id_key" ON "whatsapp_messages"("whatsapp_number_id", "external_message_id");
CREATE INDEX "whatsapp_messages_company_id_sent_at_idx" ON "whatsapp_messages"("company_id", "sent_at");
CREATE INDEX "whatsapp_messages_company_id_order_id_idx" ON "whatsapp_messages"("company_id", "order_id");

CREATE TABLE "drivers" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "document" TEXT,
  "vehicle_type" "VehicleType" NOT NULL,
  "vehicle_plate" TEXT,
  "license_number" TEXT,
  "status" "DriverStatus" NOT NULL DEFAULT 'unavailable',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "drivers_phone_idx" ON "drivers"("phone");
CREATE INDEX "drivers_status_is_active_idx" ON "drivers"("status", "is_active");

CREATE TABLE "driver_companies" (
  "id" UUID NOT NULL,
  "driver_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "delivery_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "commission_rate" DECIMAL(7,4) NOT NULL DEFAULT 0,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "left_at" TIMESTAMP(3),
  CONSTRAINT "driver_companies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "driver_companies_driver_id_company_id_key" ON "driver_companies"("driver_id", "company_id");
CREATE INDEX "driver_companies_company_id_is_primary_idx" ON "driver_companies"("company_id", "is_primary");

ALTER TABLE "affiliate_codes" ADD CONSTRAINT "affiliate_codes_reseller_id_fkey" FOREIGN KEY ("reseller_id") REFERENCES "resellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "affiliate_sales" ADD CONSTRAINT "affiliate_sales_reseller_id_fkey" FOREIGN KEY ("reseller_id") REFERENCES "resellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE, ADD CONSTRAINT "affiliate_sales_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT "affiliate_sales_affiliate_code_id_fkey" FOREIGN KEY ("affiliate_code_id") REFERENCES "affiliate_codes"("id") ON DELETE RESTRICT ON UPDATE CASCADE, ADD CONSTRAINT "affiliate_sales_company_id_order_id_fkey" FOREIGN KEY ("company_id", "order_id") REFERENCES "orders"("company_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reseller_cash_movements" ADD CONSTRAINT "reseller_cash_movements_reseller_id_fkey" FOREIGN KEY ("reseller_id") REFERENCES "resellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT "cash_movements_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "cash_registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_numbers" ADD CONSTRAINT "whatsapp_numbers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_contacts" ADD CONSTRAINT "whatsapp_contacts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT "whatsapp_contacts_whatsapp_number_id_fkey" FOREIGN KEY ("whatsapp_number_id") REFERENCES "whatsapp_numbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT "whatsapp_messages_whatsapp_number_id_fkey" FOREIGN KEY ("whatsapp_number_id") REFERENCES "whatsapp_numbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_status_check" CHECK ("is_active" = true OR "status" = 'inactive');
ALTER TABLE "driver_companies" ADD CONSTRAINT "driver_companies_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT "driver_companies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "affiliate_sales" ADD CONSTRAINT "affiliate_sales_amounts_non_negative" CHECK ("base_amount" >= 0 AND "commission_rate" >= 0 AND "commission_amount" >= 0);
ALTER TABLE "reseller_cash_movements" ADD CONSTRAINT "reseller_cash_movements_amount_non_negative" CHECK ("amount" >= 0);
ALTER TABLE "cash_registers" ADD CONSTRAINT "cash_registers_amounts_non_negative" CHECK ("opening_amount" >= 0 AND ("closing_amount" IS NULL OR "closing_amount" >= 0));
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_amount_non_negative" CHECK ("amount" >= 0);
ALTER TABLE "driver_companies" ADD CONSTRAINT "driver_companies_amounts_non_negative" CHECK ("delivery_fee" >= 0 AND "commission_rate" >= 0);
