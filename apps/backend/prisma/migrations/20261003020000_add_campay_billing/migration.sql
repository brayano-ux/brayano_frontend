CREATE TYPE "BillingPaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
CREATE TYPE "BillingSubscriptionStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "billing_payments" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "provider_reference" TEXT,
  "external_reference" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "status" "BillingPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "billing_payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "billing_subscriptions" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "message_limit" INTEGER NOT NULL,
  "status" "BillingSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "billing_subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "billing_payments_provider_reference_key" ON "billing_payments"("provider_reference");
CREATE UNIQUE INDEX "billing_payments_external_reference_key" ON "billing_payments"("external_reference");
CREATE INDEX "billing_payments_organization_id_status_idx" ON "billing_payments"("organization_id", "status");
CREATE UNIQUE INDEX "billing_subscriptions_organization_id_key" ON "billing_subscriptions"("organization_id");
