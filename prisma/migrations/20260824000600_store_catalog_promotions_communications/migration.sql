-- Store catalog, services, customization, promotions, coupons and communications.
-- Intentionally not applied; validate existing data and review in staging first.

CREATE TYPE "CatalogKind" AS ENUM ('store_category', 'service_category');
CREATE TYPE "PromotionType" AS ENUM ('percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y');
CREATE TYPE "PromotionStatus" AS ENUM ('draft', 'scheduled', 'active', 'paused', 'expired', 'cancelled');
CREATE TYPE "CouponDiscountType" AS ENUM ('percentage', 'fixed_amount', 'free_shipping');
CREATE TYPE "CouponStatus" AS ENUM ('active', 'paused', 'expired', 'exhausted');
CREATE TYPE "CommunicationAudience" AS ENUM ('store', 'employees', 'customers', 'drivers', 'resellers', 'administrators');
CREATE TYPE "CommunicationChannel" AS ENUM ('in_app', 'email', 'whatsapp', 'sms');
CREATE TYPE "CommunicationStatus" AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled');
CREATE TYPE "MessagePriority" AS ENUM ('low', 'normal', 'high', 'critical');

CREATE TABLE "catalog_categories" ("id" UUID NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "kind" "CatalogKind" NOT NULL, "description" TEXT, "is_active" BOOLEAN NOT NULL DEFAULT true, "is_system" BOOLEAN NOT NULL DEFAULT false, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "catalog_categories_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "catalog_categories_slug_key" ON "catalog_categories"("slug");
CREATE INDEX "catalog_categories_kind_is_active_idx" ON "catalog_categories"("kind", "is_active");

CREATE TABLE "company_categories" ("id" UUID NOT NULL, "company_id" UUID NOT NULL, "category_id" UUID NOT NULL, "custom_name" TEXT, "is_primary" BOOLEAN NOT NULL DEFAULT false, CONSTRAINT "company_categories_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "company_categories_company_id_category_id_key" ON "company_categories"("company_id", "category_id");
CREATE INDEX "company_categories_company_id_is_primary_idx" ON "company_categories"("company_id", "is_primary");

CREATE TABLE "service_catalog" ("id" UUID NOT NULL, "category_id" UUID NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "description" TEXT, "is_active" BOOLEAN NOT NULL DEFAULT true, "is_system" BOOLEAN NOT NULL DEFAULT false, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "service_catalog_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "service_catalog_slug_key" ON "service_catalog"("slug");
CREATE INDEX "service_catalog_category_id_is_active_idx" ON "service_catalog"("category_id", "is_active");

CREATE TABLE "company_services" ("id" UUID NOT NULL, "company_id" UUID NOT NULL, "service_id" UUID NOT NULL, "custom_name" TEXT, "enabled" BOOLEAN NOT NULL DEFAULT true, "config" JSONB, CONSTRAINT "company_services_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "company_services_company_id_service_id_key" ON "company_services"("company_id", "service_id");

CREATE TABLE "company_customizations" ("id" UUID NOT NULL, "company_id" UUID NOT NULL, "brand_name" TEXT, "primary_color" TEXT, "secondary_color" TEXT, "logo_url" TEXT, "banner_url" TEXT, "favicon_url" TEXT, "website_slug" TEXT, "whatsapp_greeting" TEXT, "whatsapp_fallback" TEXT, "storefront_config" JSONB, "bot_config" JSONB, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "company_customizations_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "company_customizations_company_id_key" ON "company_customizations"("company_id");
CREATE UNIQUE INDEX "company_customizations_website_slug_key" ON "company_customizations"("website_slug");

CREATE TABLE "promotions" ("id" UUID NOT NULL, "company_id" UUID NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "type" "PromotionType" NOT NULL, "status" "PromotionStatus" NOT NULL DEFAULT 'draft', "value" DECIMAL(12,2) NOT NULL, "minimum_amount" DECIMAL(12,2), "starts_at" TIMESTAMP(3), "ends_at" TIMESTAMP(3), "usage_limit" INTEGER, "usage_count" INTEGER NOT NULL DEFAULT 0, "rules" JSONB, "created_by" UUID, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "promotions_pkey" PRIMARY KEY ("id"));
CREATE INDEX "promotions_company_id_status_starts_at_ends_at_idx" ON "promotions"("company_id", "status", "starts_at", "ends_at");

CREATE TABLE "coupons" ("id" UUID NOT NULL, "company_id" UUID NOT NULL, "promotion_id" UUID, "code" TEXT NOT NULL, "description" TEXT, "discount_type" "CouponDiscountType" NOT NULL, "discount_value" DECIMAL(12,2) NOT NULL, "minimum_amount" DECIMAL(12,2), "max_discount" DECIMAL(12,2), "usage_limit" INTEGER, "usage_count" INTEGER NOT NULL DEFAULT 0, "per_customer_limit" INTEGER, "status" "CouponStatus" NOT NULL DEFAULT 'active', "starts_at" TIMESTAMP(3), "ends_at" TIMESTAMP(3), CONSTRAINT "coupons_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "coupons_company_id_code_key" ON "coupons"("company_id", "code");
CREATE INDEX "coupons_company_id_status_starts_at_ends_at_idx" ON "coupons"("company_id", "status", "starts_at", "ends_at");

CREATE TABLE "coupon_redemptions" ("id" UUID NOT NULL, "company_id" UUID NOT NULL, "coupon_id" UUID NOT NULL, "customer_id" UUID, "order_id" UUID NOT NULL, "discount_amount" DECIMAL(12,2) NOT NULL, "redeemed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "coupon_redemptions_coupon_id_order_id_key" ON "coupon_redemptions"("coupon_id", "order_id");
CREATE INDEX "coupon_redemptions_company_id_customer_id_redeemed_at_idx" ON "coupon_redemptions"("company_id", "customer_id", "redeemed_at");

CREATE TABLE "communications" ("id" UUID NOT NULL, "company_id" UUID, "sender_id" UUID, "title" TEXT NOT NULL, "body" TEXT NOT NULL, "audience" "CommunicationAudience" NOT NULL, "channel" "CommunicationChannel" NOT NULL, "priority" "MessagePriority" NOT NULL DEFAULT 'normal', "status" "CommunicationStatus" NOT NULL DEFAULT 'draft', "scheduled_at" TIMESTAMP(3), "sent_at" TIMESTAMP(3), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMP(3) NOT NULL, CONSTRAINT "communications_pkey" PRIMARY KEY ("id"));
CREATE INDEX "communications_company_id_audience_status_scheduled_at_idx" ON "communications"("company_id", "audience", "status", "scheduled_at");

CREATE TABLE "communication_targets" ("id" UUID NOT NULL, "communication_id" UUID NOT NULL, "company_id" UUID, "user_id" UUID, "customer_id" UUID, "driver_id" UUID, "delivered_at" TIMESTAMP(3), "read_at" TIMESTAMP(3), "failed_at" TIMESTAMP(3), "error_code" TEXT, CONSTRAINT "communication_targets_pkey" PRIMARY KEY ("id"));
CREATE INDEX "communication_targets_company_id_delivered_at_read_at_idx" ON "communication_targets"("company_id", "delivered_at", "read_at");

CREATE TABLE "notification_events" ("id" UUID NOT NULL, "company_id" UUID, "actor_id" UUID, "event_type" TEXT NOT NULL, "entity_type" TEXT NOT NULL, "entity_id" TEXT, "payload" JSONB, "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id"));
CREATE INDEX "notification_events_company_id_event_type_created_at_idx" ON "notification_events"("company_id", "event_type", "created_at");
CREATE INDEX "notification_events_entity_type_entity_id_idx" ON "notification_events"("entity_type", "entity_id");

ALTER TABLE "company_categories" ADD CONSTRAINT "company_categories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT "company_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "catalog_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "service_catalog" ADD CONSTRAINT "service_catalog_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "catalog_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "company_services" ADD CONSTRAINT "company_services_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT "company_services_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "service_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "company_customizations" ADD CONSTRAINT "company_customizations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE, ADD CONSTRAINT "coupons_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communications" ADD CONSTRAINT "communications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communication_targets" ADD CONSTRAINT "communication_targets_communication_id_fkey" FOREIGN KEY ("communication_id") REFERENCES "communications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "promotions" ADD CONSTRAINT "promotions_amounts_valid" CHECK ("value" >= 0 AND ("minimum_amount" IS NULL OR "minimum_amount" >= 0) AND ("usage_limit" IS NULL OR "usage_limit" >= 0));
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_amounts_valid" CHECK ("discount_value" >= 0 AND ("minimum_amount" IS NULL OR "minimum_amount" >= 0) AND ("max_discount" IS NULL OR "max_discount" >= 0) AND ("usage_limit" IS NULL OR "usage_limit" >= 0) AND ("per_customer_limit" IS NULL OR "per_customer_limit" >= 0));
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_discount_non_negative" CHECK ("discount_amount" >= 0);
