-- CreateTable
CREATE TABLE "billing_webhook_events" (
    "id" UUID NOT NULL,
    "checkoutId" UUID NOT NULL,
    "fingerprint" CHAR(64) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_webhook_events_fingerprint_key" ON "billing_webhook_events"("fingerprint");

-- CreateIndex
CREATE INDEX "billing_webhook_events_processedAt_nextAttemptAt_idx" ON "billing_webhook_events"("processedAt", "nextAttemptAt");

-- AddForeignKey
ALTER TABLE "billing_webhook_events" ADD CONSTRAINT "billing_webhook_events_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "billing_checkouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
