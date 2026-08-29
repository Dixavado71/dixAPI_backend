-- Marcenaria do Kelvin: protocolo de atendimento, snapshot de fluxo e agendamento de produção

-- Conversation: protocolo de retomada + snapshot do estado do fluxo
ALTER TABLE "conversations" ADD COLUMN "protocol" TEXT;
ALTER TABLE "conversations" ADD COLUMN "flow_snapshot" JSONB;
CREATE UNIQUE INDEX "conversations_company_id_protocol_key" ON "conversations"("company_id", "protocol");

-- Product: dias estimados de produção
ALTER TABLE "products" ADD COLUMN "estimated_production_days" INTEGER DEFAULT 1;

-- Order: previsão de conclusão e entrega
ALTER TABLE "orders" ADD COLUMN "expected_completion_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "delivery_eta_at" TIMESTAMP(3);

-- ProductionSettings: capacidade diária da marcenaria
CREATE TABLE "production_settings" (
    "id" TEXT NOT NULL,
    "company_id" UUID NOT NULL,
    "daily_capacity" INTEGER NOT NULL DEFAULT 8,
    "working_days" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "production_settings_pkey" PRIMARY KEY ("id")
);

-- ProductionSchedule: agenda encadeada de produção
CREATE TABLE "production_schedules" (
    "id" TEXT NOT NULL,
    "company_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "production_schedules_pkey" PRIMARY KEY ("id")
);

-- Índices e unicidades
CREATE UNIQUE INDEX "production_settings_company_id_key" ON "production_settings"("company_id");
CREATE UNIQUE INDEX "production_schedules_order_id_key" ON "production_schedules"("order_id");
CREATE UNIQUE INDEX "production_schedules_company_id_id_key" ON "production_schedules"("company_id", "id");
CREATE INDEX "production_schedules_company_id_status_idx" ON "production_schedules"("company_id", "status");
CREATE INDEX "production_schedules_scheduled_date_idx" ON "production_schedules"("scheduled_date");

-- FKs
ALTER TABLE "production_settings" ADD CONSTRAINT "production_settings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "production_schedules" ADD CONSTRAINT "production_schedules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "production_schedules" ADD CONSTRAINT "production_schedules_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
