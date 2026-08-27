-- CreateEnum
CREATE TYPE "ForwardRuleMode" AS ENUM ('fixed', 'operator', 'group', 'round_robin');

-- CreateEnum
CREATE TYPE "MessageLogDirection" AS ENUM ('inbound', 'outbound', 'forward');

-- CreateEnum
CREATE TYPE "MessageLogEvent" AS ENUM ('group_forward', 'media_forward', 'flow_action', 'alert', 'unknown');

-- CreateEnum
CREATE TYPE "NotificationTriggerChannel" AS ENUM ('app', 'whatsapp', 'both');

-- CreateTable: whatsapp_linked_groups
CREATE TABLE "whatsapp_linked_groups" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "whatsapp_number_id" UUID NOT NULL,
    "remote_jid" TEXT NOT NULL,
    "subject" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "flow_id" UUID,
    "forward_rule" JSONB,
    "forward_media" BOOLEAN NOT NULL DEFAULT true,
    "forward_prefix" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_linked_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable: message_logs
CREATE TABLE "message_logs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "whatsapp_number_id" UUID,
    "event" "MessageLogEvent" NOT NULL,
    "direction" "MessageLogDirection" NOT NULL,
    "message_type" TEXT,
    "content" TEXT,
    "media_url" TEXT,
    "recipient" TEXT,
    "remote_jid" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "error" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: notification_triggers
CREATE TABLE "notification_triggers" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "event" TEXT NOT NULL,
    "channel" "NotificationTriggerChannel" NOT NULL DEFAULT 'app',
    "recipient_rule" JSONB,
    "template" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: whatsapp_linked_groups
CREATE UNIQUE INDEX "whatsapp_linked_groups_whatsapp_number_id_remote_jid_key" ON "whatsapp_linked_groups"("whatsapp_number_id", "remote_jid");
CREATE INDEX "whatsapp_linked_groups_company_id_is_active_idx" ON "whatsapp_linked_groups"("company_id", "is_active");
CREATE INDEX "whatsapp_linked_groups_company_id_flow_id_idx" ON "whatsapp_linked_groups"("company_id", "flow_id");

-- CreateIndex: message_logs
CREATE INDEX "message_logs_company_id_event_created_at_idx" ON "message_logs"("company_id", "event", "created_at");
CREATE INDEX "message_logs_company_id_whatsapp_number_id_created_at_idx" ON "message_logs"("company_id", "whatsapp_number_id", "created_at");
CREATE INDEX "message_logs_company_id_status_idx" ON "message_logs"("company_id", "status");

-- CreateIndex: notification_triggers
CREATE UNIQUE INDEX "notification_triggers_company_id_event_channel_key" ON "notification_triggers"("company_id", "event", "channel");
CREATE INDEX "notification_triggers_company_id_is_active_idx" ON "notification_triggers"("company_id", "is_active");

-- AddForeignKey: whatsapp_linked_groups
ALTER TABLE "whatsapp_linked_groups" ADD CONSTRAINT "whatsapp_linked_groups_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "whatsapp_linked_groups" ADD CONSTRAINT "whatsapp_linked_groups_whatsapp_number_id_fkey" FOREIGN KEY ("whatsapp_number_id") REFERENCES "whatsapp_numbers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: message_logs
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "message_logs" ADD CONSTRAINT "message_logs_whatsapp_number_id_fkey" FOREIGN KEY ("whatsapp_number_id") REFERENCES "whatsapp_numbers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: notification_triggers
ALTER TABLE "notification_triggers" ADD CONSTRAINT "notification_triggers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
