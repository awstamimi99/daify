-- AlterEnum
ALTER TYPE "SecurityEventType" ADD VALUE 'BILLING_UPDATED';

-- CreateTable
CREATE TABLE "billing_plans" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "version" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "nameAr" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(12,3) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'KWD',
    "limits" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_subscriptions" (
    "organizationId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "periodStart" TIMESTAMPTZ(3) NOT NULL,
    "periodEnd" TIMESTAMPTZ(3) NOT NULL,
    "graceEnd" TIMESTAMPTZ(3),
    "cancelAtEnd" BOOLEAN NOT NULL DEFAULT false,
    "trialUsed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("organizationId")
);

-- CreateTable
CREATE TABLE "billing_checkouts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "idempotencyKey" UUID NOT NULL,
    "state" VARCHAR(20) NOT NULL,
    "providerInvoiceId" VARCHAR(100),
    "paymentUrl" TEXT,
    "paidAt" TIMESTAMPTZ(3),
    "periodStart" TIMESTAMPTZ(3),
    "periodEnd" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "billing_checkouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_observations" (
    "id" UUID NOT NULL,
    "checkoutId" UUID NOT NULL,
    "fingerprint" CHAR(64) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "observedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_overrides" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "limits" JSONB NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "actorUserId" UUID NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_plans_code_version_key" ON "billing_plans"("code", "version");

-- CreateIndex
CREATE UNIQUE INDEX "billing_checkouts_providerInvoiceId_key" ON "billing_checkouts"("providerInvoiceId");

-- CreateIndex
CREATE INDEX "billing_checkouts_organizationId_createdAt_idx" ON "billing_checkouts"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "billing_checkouts_organizationId_idempotencyKey_key" ON "billing_checkouts"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "billing_observations_checkoutId_fingerprint_key" ON "billing_observations"("checkoutId", "fingerprint");

-- CreateIndex
CREATE INDEX "billing_overrides_organizationId_expiresAt_idx" ON "billing_overrides"("organizationId", "expiresAt");

-- AddForeignKey
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "billing_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_checkouts" ADD CONSTRAINT "billing_checkouts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_checkouts" ADD CONSTRAINT "billing_checkouts_planId_fkey" FOREIGN KEY ("planId") REFERENCES "billing_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_observations" ADD CONSTRAINT "billing_observations_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "billing_checkouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_overrides" ADD CONSTRAINT "billing_overrides_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE billing_plans ADD CONSTRAINT billing_plan_price CHECK (amount > 0 AND currency = 'KWD' AND version > 0);
ALTER TABLE billing_subscriptions ADD CONSTRAINT billing_subscription_state CHECK (status IN ('TRIAL', 'ACTIVE', 'PAST_DUE') AND "periodEnd" > "periodStart");
ALTER TABLE billing_checkouts ADD CONSTRAINT billing_checkout_state CHECK (state IN ('CREATING', 'UNKNOWN', 'READY', 'PAID', 'CANCELED'));
ALTER TABLE billing_overrides ADD CONSTRAINT billing_override_period CHECK ("expiresAt" > "startsAt");

CREATE FUNCTION protect_billing_plan() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(NEW) - 'active') IS DISTINCT FROM (to_jsonb(OLD) - 'active') THEN
    RAISE EXCEPTION 'Billing plan versions are immutable; create a new version';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER billing_plan_immutable BEFORE UPDATE ON billing_plans FOR EACH ROW EXECUTE FUNCTION protect_billing_plan();

CREATE FUNCTION protect_billing_observation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Verified billing observations are immutable';
END;
$$;
CREATE TRIGGER billing_observation_immutable BEFORE UPDATE ON billing_observations FOR EACH ROW EXECUTE FUNCTION protect_billing_observation();
