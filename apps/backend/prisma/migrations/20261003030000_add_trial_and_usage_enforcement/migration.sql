ALTER TABLE "organizations"
  ADD COLUMN "free_ai_responses_remaining" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "trial_upgrade_email_sent_at" TIMESTAMP(3);

ALTER TABLE "billing_subscriptions"
  ADD COLUMN "messages_used" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "period_started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
