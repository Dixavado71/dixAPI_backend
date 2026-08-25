-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('master', 'reseller', 'admin', 'manager', 'operator', 'visitor');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('pending', 'active', 'inactive', 'suspended');

-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('store', 'demo', 'internal');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('pending', 'active', 'suspended', 'cancelled');

-- CreateEnum
CREATE TYPE "AccountRole" AS ENUM ('owner', 'admin', 'manager', 'operator', 'driver', 'viewer', 'visitor');

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('simple', 'silver', 'diamond');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'suspended', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "FeatureValueType" AS ENUM ('boolean', 'integer', 'decimal', 'text', 'json');

-- CreateEnum
CREATE TYPE "PlatformTransactionType" AS ENUM ('subscription', 'setup_fee', 'refund', 'adjustment', 'commission');

-- CreateEnum
CREATE TYPE "PlatformTransactionStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded', 'cancelled');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('pending', 'approved', 'paid', 'cancelled');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('pending', 'processing', 'paid', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'delete', 'login', 'logout', 'activate', 'suspend', 'cancel', 'payment', 'refund');

-- CreateEnum
CREATE TYPE "CustomerSegment" AS ENUM ('vip', 'frequent', 'occasional', 'new');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('active', 'inactive', 'low_stock');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'processing', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('credit_card', 'debit_card', 'pix', 'boleto', 'whatsapp_pay', 'cash_on_delivery', 'card_on_delivery');

-- CreateEnum
CREATE TYPE "ConversationChannel" AS ENUM ('whatsapp', 'instagram', 'facebook', 'site');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('open', 'closed', 'waiting');

-- CreateEnum
CREATE TYPE "MessageSenderType" AS ENUM ('user', 'customer', 'bot');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'image', 'file', 'audio');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('sent', 'delivered', 'read');

-- CreateEnum
CREATE TYPE "AutomationFlowType" AS ENUM ('vendas', 'suporte', 'marketing');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('income', 'expense');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('pending', 'completed');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('order', 'message', 'payment', 'stock', 'automation');

-- CreateEnum
CREATE TYPE "DeliveryMode" AS ENUM ('delivery', 'pickup');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('pending', 'confirmed', 'preparing', 'ready_for_pickup', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'failed');

-- CreateEnum
CREATE TYPE "DeliveryProviderType" AS ENUM ('own', 'partner', 'marketplace');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('available', 'unavailable', 'inactive');

-- CreateEnum
CREATE TYPE "PaymentRecordStatus" AS ENUM ('pending', 'authorized', 'paid', 'failed', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "PaymentChannel" AS ENUM ('online', 'whatsapp_manual', 'whatsapp_api', 'delivery_cash', 'delivery_card', 'delivery_pix');

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "trade_name" TEXT,
    "cnpj" TEXT,
    "address_street" TEXT,
    "address_number" TEXT,
    "address_complement" TEXT,
    "address_city" TEXT,
    "address_state" TEXT,
    "address_zip" TEXT,
    "website" TEXT,
    "description" TEXT,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "company_type" "CompanyType" NOT NULL DEFAULT 'store',
    "status" "CompanyStatus" NOT NULL DEFAULT 'pending',
    "reseller_id" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "avatar_url" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'operator',
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "segment" "CustomerSegment" NOT NULL DEFAULT 'new',
    "status" "CustomerStatus" NOT NULL DEFAULT 'active',
    "total_orders" INTEGER NOT NULL DEFAULT 0,
    "total_spent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "last_purchase_date" DATE,
    "registered_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "min_stock" INTEGER NOT NULL DEFAULT 5,
    "total_sales" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "ProductStatus" NOT NULL DEFAULT 'active',
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_number" TEXT NOT NULL,
    "company_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "payment_method" "PaymentMethod" NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "shipping_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "shipping_address" TEXT,
    "notes" TEXT,
    "order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "unit_cost" DECIMAL(10,2),
    "subtotal" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "customer_id" UUID,
    "channel" "ConversationChannel" NOT NULL,
    "contact_name" TEXT NOT NULL,
    "contact_phone" TEXT,
    "last_message" TEXT,
    "last_message_at" TIMESTAMP(3),
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "assigned_to" UUID,
    "status" "ConversationStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_type" "MessageSenderType" NOT NULL,
    "sender_id" UUID,
    "message_type" "MessageType" NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL,
    "media_url" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'sent',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_flows" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AutomationFlowType" NOT NULL,
    "description" TEXT,
    "icon_emoji" TEXT,
    "messages_count" INTEGER NOT NULL DEFAULT 0,
    "total_conversions" INTEGER NOT NULL DEFAULT 0,
    "conversion_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "growth_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "order_id" UUID,
    "description" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "category" TEXT NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'pending',
    "payment_method" "PaymentMethod",
    "transaction_date" DATE NOT NULL,
    "due_date" DATE,
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "attachment_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_replies" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "shortcut" TEXT NOT NULL,
    "message_text" TEXT NOT NULL,
    "created_by" UUID,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quick_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "related_entity_type" TEXT,
    "related_entity_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_companies" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "role" "AccountRole" NOT NULL DEFAULT 'operator',
    "permissions" JSONB,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "invited_by" UUID,
    "joined_at" TIMESTAMP(3),
    "removed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resellers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "document" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "commission_type" TEXT NOT NULL DEFAULT 'percentage',
    "commission_value" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resellers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "code" "PlanCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthly_price" DECIMAL(12,2) NOT NULL,
    "yearly_price" DECIMAL(12,2) NOT NULL,
    "trial_days" INTEGER NOT NULL DEFAULT 0,
    "max_users" INTEGER,
    "max_products" INTEGER,
    "max_orders_month" INTEGER,
    "max_drivers" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_features" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "value_type" "FeatureValueType" NOT NULL,
    "boolean_value" BOOLEAN,
    "integer_value" INTEGER,
    "decimal_value" DECIMAL(12,2),
    "text_value" TEXT,
    "json_value" JSONB,

    CONSTRAINT "plan_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_subscriptions" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'trialing',
    "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'monthly',
    "price" DECIMAL(12,2) NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "trial_ends_at" TIMESTAMP(3),
    "grace_ends_at" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMP(3),
    "external_customer_id" TEXT,
    "external_subscription_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_events" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "previous_status" "SubscriptionStatus",
    "new_status" "SubscriptionStatus",
    "previous_plan_id" UUID,
    "new_plan_id" UUID,
    "metadata" JSONB,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_transactions" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "reseller_id" UUID,
    "subscription_id" UUID,
    "type" "PlatformTransactionType" NOT NULL,
    "status" "PlatformTransactionStatus" NOT NULL DEFAULT 'pending',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "external_reference" TEXT,
    "paid_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" UUID NOT NULL,
    "reseller_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "platform_transaction_id" UUID,
    "type" TEXT NOT NULL,
    "rate" DECIMAL(7,4) NOT NULL,
    "base_amount" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'pending',
    "approved_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL,
    "reseller_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'pending',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "external_reference" TEXT,
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_status_history" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "from_status" "CompanyStatus",
    "to_status" "CompanyStatus" NOT NULL,
    "reason" TEXT,
    "changed_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "user_id" UUID,
    "action" "AuditAction" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "before_data" JSONB,
    "after_data" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliverySettings" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "pickup_enabled" BOOLEAN NOT NULL DEFAULT true,
    "minimum_order_value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "default_delivery_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estimated_min_minutes" INTEGER NOT NULL DEFAULT 30,
    "estimated_max_minutes" INTEGER NOT NULL DEFAULT 60,
    "service_start" TEXT,
    "service_end" TEXT,
    "accepted_payments" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliverySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_zones" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "postal_codes" TEXT[],
    "neighborhoods" TEXT[],
    "delivery_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "minimum_order" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "estimated_min" INTEGER NOT NULL DEFAULT 30,
    "estimated_max" INTEGER NOT NULL DEFAULT 60,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_drivers" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "document" TEXT,
    "vehicle_type" TEXT,
    "vehicle_plate" TEXT,
    "status" "DriverStatus" NOT NULL DEFAULT 'unavailable',
    "provider_type" "DeliveryProviderType" NOT NULL DEFAULT 'own',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "zone_id" UUID,
    "driver_id" UUID,
    "mode" "DeliveryMode" NOT NULL DEFAULT 'delivery',
    "status" "DeliveryStatus" NOT NULL DEFAULT 'pending',
    "recipient_name" TEXT NOT NULL,
    "recipient_phone" TEXT NOT NULL,
    "address_street" TEXT,
    "address_number" TEXT,
    "address_complement" TEXT,
    "address_neighborhood" TEXT,
    "address_city" TEXT,
    "address_state" TEXT,
    "address_zip" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "delivery_fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "change_for" DECIMAL(10,2),
    "delivery_notes" TEXT,
    "dispatched_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_records" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "delivery_id" UUID,
    "method" "PaymentMethod" NOT NULL,
    "channel" "PaymentChannel" NOT NULL,
    "status" "PaymentRecordStatus" NOT NULL DEFAULT 'pending',
    "amount" DECIMAL(12,2) NOT NULL,
    "amount_received" DECIMAL(12,2),
    "change_amount" DECIMAL(12,2),
    "external_reference" TEXT,
    "provider" TEXT,
    "proof_url" TEXT,
    "confirmed_by_driver" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_cnpj_key" ON "companies"("cnpj");

-- CreateIndex
CREATE INDEX "companies_cnpj_idx" ON "companies"("cnpj");

-- CreateIndex
CREATE INDEX "companies_is_active_idx" ON "companies"("is_active");

-- CreateIndex
CREATE INDEX "users_company_id_idx" ON "users"("company_id");

-- CreateIndex
CREATE INDEX "users_company_id_role_is_active_idx" ON "users"("company_id", "role", "is_active");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "users_company_id_email_key" ON "users"("company_id", "email");

-- CreateIndex
CREATE INDEX "customers_company_id_idx" ON "customers"("company_id");

-- CreateIndex
CREATE INDEX "customers_company_id_segment_status_idx" ON "customers"("company_id", "segment", "status");

-- CreateIndex
CREATE INDEX "customers_company_id_email_phone_idx" ON "customers"("company_id", "email", "phone");

-- CreateIndex
CREATE INDEX "customers_segment_idx" ON "customers"("segment");

-- CreateIndex
CREATE INDEX "customers_status_idx" ON "customers"("status");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_email_idx" ON "customers"("email");

-- CreateIndex
CREATE INDEX "products_company_id_idx" ON "products"("company_id");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "orders_company_id_idx" ON "orders"("company_id");

-- CreateIndex
CREATE INDEX "orders_customer_id_idx" ON "orders"("customer_id");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_order_date_idx" ON "orders"("order_date");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "conversations_company_id_idx" ON "conversations"("company_id");

-- CreateIndex
CREATE INDEX "conversations_channel_idx" ON "conversations"("channel");

-- CreateIndex
CREATE INDEX "conversations_status_idx" ON "conversations"("status");

-- CreateIndex
CREATE INDEX "conversations_assigned_to_idx" ON "conversations"("assigned_to");

-- CreateIndex
CREATE INDEX "conversations_customer_id_idx" ON "conversations"("customer_id");

-- CreateIndex
CREATE INDEX "messages_conversation_id_idx" ON "messages"("conversation_id");

-- CreateIndex
CREATE INDEX "messages_sender_type_idx" ON "messages"("sender_type");

-- CreateIndex
CREATE INDEX "messages_created_at_idx" ON "messages"("created_at");

-- CreateIndex
CREATE INDEX "automation_flows_company_id_idx" ON "automation_flows"("company_id");

-- CreateIndex
CREATE INDEX "automation_flows_type_idx" ON "automation_flows"("type");

-- CreateIndex
CREATE INDEX "automation_flows_is_active_idx" ON "automation_flows"("is_active");

-- CreateIndex
CREATE INDEX "transactions_company_id_idx" ON "transactions"("company_id");

-- CreateIndex
CREATE INDEX "transactions_order_id_idx" ON "transactions"("order_id");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_transaction_date_idx" ON "transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "quick_replies_company_id_idx" ON "quick_replies"("company_id");

-- CreateIndex
CREATE INDEX "quick_replies_shortcut_idx" ON "quick_replies"("shortcut");

-- CreateIndex
CREATE UNIQUE INDEX "quick_replies_company_id_shortcut_key" ON "quick_replies"("company_id", "shortcut");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_company_id_idx" ON "notifications"("company_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "user_companies_company_id_role_status_idx" ON "user_companies"("company_id", "role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "user_companies_user_id_company_id_key" ON "user_companies"("user_id", "company_id");

-- CreateIndex
CREATE UNIQUE INDEX "resellers_user_id_key" ON "resellers"("user_id");

-- CreateIndex
CREATE INDEX "resellers_status_idx" ON "resellers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "plan_features_plan_id_key_key" ON "plan_features"("plan_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "company_subscriptions_company_id_key" ON "company_subscriptions"("company_id");

-- CreateIndex
CREATE INDEX "company_subscriptions_status_current_period_end_idx" ON "company_subscriptions"("status", "current_period_end");

-- CreateIndex
CREATE INDEX "subscription_events_subscription_id_created_at_idx" ON "subscription_events"("subscription_id", "created_at");

-- CreateIndex
CREATE INDEX "platform_transactions_company_id_status_created_at_idx" ON "platform_transactions"("company_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "platform_transactions_reseller_id_status_idx" ON "platform_transactions"("reseller_id", "status");

-- CreateIndex
CREATE INDEX "commissions_reseller_id_status_idx" ON "commissions"("reseller_id", "status");

-- CreateIndex
CREATE INDEX "commissions_company_id_status_idx" ON "commissions"("company_id", "status");

-- CreateIndex
CREATE INDEX "payouts_reseller_id_status_period_end_idx" ON "payouts"("reseller_id", "status", "period_end");

-- CreateIndex
CREATE INDEX "company_status_history_company_id_created_at_idx" ON "company_status_history"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_company_id_created_at_idx" ON "audit_logs"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_revoked_at_idx" ON "refresh_tokens"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "DeliverySettings_company_id_key" ON "DeliverySettings"("company_id");

-- CreateIndex
CREATE INDEX "delivery_zones_company_id_is_active_idx" ON "delivery_zones"("company_id", "is_active");

-- CreateIndex
CREATE INDEX "delivery_drivers_company_id_status_is_active_idx" ON "delivery_drivers"("company_id", "status", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_order_id_key" ON "deliveries"("order_id");

-- CreateIndex
CREATE INDEX "deliveries_company_id_status_idx" ON "deliveries"("company_id", "status");

-- CreateIndex
CREATE INDEX "deliveries_driver_id_status_idx" ON "deliveries"("driver_id", "status");

-- CreateIndex
CREATE INDEX "payment_records_company_id_status_method_idx" ON "payment_records"("company_id", "status", "method");

-- CreateIndex
CREATE INDEX "payment_records_order_id_idx" ON "payment_records"("order_id");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_reseller_id_fkey" FOREIGN KEY ("reseller_id") REFERENCES "resellers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_flows" ADD CONSTRAINT "automation_flows_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_replies" ADD CONSTRAINT "quick_replies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_replies" ADD CONSTRAINT "quick_replies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resellers" ADD CONSTRAINT "resellers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_subscriptions" ADD CONSTRAINT "company_subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_subscriptions" ADD CONSTRAINT "company_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "company_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_transactions" ADD CONSTRAINT "platform_transactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_transactions" ADD CONSTRAINT "platform_transactions_reseller_id_fkey" FOREIGN KEY ("reseller_id") REFERENCES "resellers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_transactions" ADD CONSTRAINT "platform_transactions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "company_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_reseller_id_fkey" FOREIGN KEY ("reseller_id") REFERENCES "resellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_platform_transaction_id_fkey" FOREIGN KEY ("platform_transaction_id") REFERENCES "platform_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_reseller_id_fkey" FOREIGN KEY ("reseller_id") REFERENCES "resellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_status_history" ADD CONSTRAINT "company_status_history_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliverySettings" ADD CONSTRAINT "DeliverySettings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_drivers" ADD CONSTRAINT "delivery_drivers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "delivery_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "delivery_drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
