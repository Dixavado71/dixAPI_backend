-- Add at_location to DeliveryStatus enum
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'at_location';

-- CreateTable: order_notification_logs
CREATE TABLE "order_notification_logs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "order_id" UUID,
    "delivery_id" UUID,
    "event" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "recipient_phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_notification_logs_company_id_id_key" ON "order_notification_logs"("company_id", "id");

-- CreateIndex
CREATE INDEX "order_notification_logs_company_id_created_at_idx" ON "order_notification_logs"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "order_notification_logs_company_id_event_idx" ON "order_notification_logs"("company_id", "event");

-- AddForeignKey
ALTER TABLE "order_notification_logs" ADD CONSTRAINT "order_notification_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
