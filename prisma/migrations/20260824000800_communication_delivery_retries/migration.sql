-- Communication delivery state and retry scheduling.
-- Intentionally not applied; validate in staging first.

CREATE TYPE "CommunicationTargetStatus" AS ENUM ('pending', 'queued', 'sending', 'delivered', 'failed', 'cancelled');

ALTER TABLE "communication_targets"
  ADD COLUMN "provider_message_id" TEXT,
  ADD COLUMN "status" "CommunicationTargetStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN "attempt_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "next_attempt_at" TIMESTAMP(3),
  ADD COLUMN "last_attempt_at" TIMESTAMP(3);

CREATE INDEX "communication_targets_status_next_attempt_at_idx"
  ON "communication_targets"("status", "next_attempt_at");
