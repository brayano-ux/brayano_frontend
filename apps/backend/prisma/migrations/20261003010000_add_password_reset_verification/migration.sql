CREATE TABLE "password_reset_verifications" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "code_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "last_sent_at" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "password_reset_verifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "password_reset_verifications_email_key"
  ON "password_reset_verifications"("email");

CREATE INDEX "password_reset_verifications_expires_at_idx"
  ON "password_reset_verifications"("expires_at");
