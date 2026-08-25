DROP INDEX IF EXISTS "payment_events_provider_provider_event_id_key";

CREATE UNIQUE INDEX "payment_events_company_id_provider_provider_event_id_key"
  ON "payment_events"("company_id", "provider", "provider_event_id");
