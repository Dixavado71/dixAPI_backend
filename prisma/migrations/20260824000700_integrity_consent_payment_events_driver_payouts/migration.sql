-- Integrity and compliance expansion: consent, payment events and driver payouts.
-- Intentionally not applied. Validate existing data and review in staging first.

CREATE TYPE "ConsentStatus" AS ENUM ('unknown', 'opted_in', 'opted_out');
CREATE TYPE "PaymentEventStatus" AS ENUM ('received', 'processed', 'ignored', 'failed');
CREATE TYPE "DriverPayoutStatus" AS ENUM ('pending', 'approved', 'paid', 'cancelled');

ALTER TABLE "transactions" ADD COLUMN "idempotency_key" TEXT, ADD COLUMN "created_by" UUID;
ALTER TABLE "payment_records" ADD COLUMN "idempotency_key" TEXT, ADD COLUMN "provider_event_id" TEXT, ADD COLUMN "failure_code" TEXT, ADD COLUMN "failure_reason" TEXT, ADD COLUMN "authorized_at" TIMESTAMP(3), ADD COLUMN "refunded_at" TIMESTAMP(3), ADD COLUMN "created_by" UUID;
ALTER TABLE "whatsapp_contacts" ADD COLUMN "consent_status" "ConsentStatus" NOT NULL DEFAULT 'unknown', ADD COLUMN "consent_source" TEXT, ADD COLUMN "consented_at" TIMESTAMP(3), ADD COLUMN "opted_out_at" TIMESTAMP(3), ADD COLUMN "retention_until" TIMESTAMP(3), ADD COLUMN "anonymized_at" TIMESTAMP(3), ADD COLUMN "marketing_opt_in" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "whatsapp_messages" ADD COLUMN "provider_timestamp" TIMESTAMP(3), ADD COLUMN "content_hash" TEXT, ADD COLUMN "retention_until" TIMESTAMP(3), ADD COLUMN "redacted_at" TIMESTAMP(3);
CREATE UNIQUE INDEX "transactions_company_id_idempotency_key_key" ON "transactions"("company_id", "idempotency_key");
CREATE UNIQUE INDEX "payment_records_company_id_idempotency_key_key" ON "payment_records"("company_id", "idempotency_key");
CREATE UNIQUE INDEX "payment_records_provider_event_id_key" ON "payment_records"("provider_event_id");

CREATE TABLE "customer_consents" ("id" UUID NOT NULL, "company_id" UUID NOT NULL, "customer_id" UUID NOT NULL, "status" "ConsentStatus" NOT NULL, "source" TEXT NOT NULL, "purpose" TEXT NOT NULL, "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "retention_until" TIMESTAMP(3), "evidence_ref" TEXT, CONSTRAINT "customer_consents_pkey" PRIMARY KEY ("id"));
CREATE INDEX "customer_consents_company_id_customer_id_occurred_at_idx" ON "customer_consents"("company_id", "customer_id", "occurred_at");
ALTER TABLE "customer_consents" ADD CONSTRAINT "customer_consents_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT "customer_consents_company_id_customer_id_fkey" FOREIGN KEY ("company_id", "customer_id") REFERENCES "customers"("company_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "payment_events" ("id" UUID NOT NULL, "company_id" UUID NOT NULL, "payment_id" UUID NOT NULL, "provider" TEXT NOT NULL, "provider_event_id" TEXT NOT NULL, "event_type" TEXT NOT NULL, "status" "PaymentEventStatus" NOT NULL DEFAULT 'received', "signature_valid" BOOLEAN NOT NULL DEFAULT false, "provider_timestamp" TIMESTAMP(3), "payload_hash" TEXT NOT NULL, "processed_at" TIMESTAMP(3), "failure_reason" TEXT, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "payment_events_provider_provider_event_id_key" ON "payment_events"("provider", "provider_event_id");
CREATE INDEX "payment_events_company_id_payment_id_created_at_idx" ON "payment_events"("company_id", "payment_id", "created_at");
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT "payment_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payment_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "driver_payouts" ("id" UUID NOT NULL, "company_id" UUID NOT NULL, "driver_id" UUID NOT NULL, "delivery_id" UUID, "amount" DECIMAL(12,2) NOT NULL, "status" "DriverPayoutStatus" NOT NULL DEFAULT 'pending', "period_start" TIMESTAMP(3) NOT NULL, "period_end" TIMESTAMP(3) NOT NULL, "approved_at" TIMESTAMP(3), "paid_at" TIMESTAMP(3), "created_by" UUID, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "driver_payouts_pkey" PRIMARY KEY ("id"));
CREATE INDEX "driver_payouts_company_id_driver_id_status_period_end_idx" ON "driver_payouts"("company_id", "driver_id", "status", "period_end");
ALTER TABLE "driver_payouts" ADD CONSTRAINT "driver_payouts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT "driver_payouts_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "driver_payouts" ADD CONSTRAINT "driver_payouts_amount_period_valid" CHECK ("amount" >= 0 AND "period_end" > "period_start");
