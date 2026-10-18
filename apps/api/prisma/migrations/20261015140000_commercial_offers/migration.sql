-- CreateEnum
CREATE TYPE "PricingQuoteStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ACCEPTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "sales_discount_allowances" (
    "staffId" UUID NOT NULL,
    "maxPercent" INTEGER NOT NULL DEFAULT 25,
    "maxMonths" INTEGER NOT NULL DEFAULT 3,
    "freeMonths" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedById" UUID NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sales_discount_allowances_pkey" PRIMARY KEY ("staffId")
);

-- CreateTable
CREATE TABLE "discount_coupons" (
    "id" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "percent" INTEGER NOT NULL,
    "months" INTEGER NOT NULL,
    "maxRedemptions" INTEGER NOT NULL,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "organizationId" UUID,
    "createdById" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "reason" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_quotes" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "amount" DECIMAL(12,3) NOT NULL,
    "renewalAmount" DECIMAL(12,3) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "months" INTEGER NOT NULL,
    "limits" JSONB NOT NULL,
    "status" "PricingQuoteStatus" NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" UUID NOT NULL,
    "approvedById" UUID,
    "decidedAt" TIMESTAMPTZ(3),
    "decisionReason" VARCHAR(500),
    "reason" VARCHAR(500) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "pricing_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commercial_acceptances" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "couponId" UUID,
    "quoteId" UUID,
    "planId" UUID NOT NULL,
    "amount" DECIMAL(12,3) NOT NULL,
    "renewalAmount" DECIMAL(12,3) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "months" INTEGER NOT NULL,
    "limits" JSONB NOT NULL,
    "acceptedById" UUID NOT NULL,
    "acceptedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commercial_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discount_coupons_code_key" ON "discount_coupons"("code");

-- CreateIndex
CREATE INDEX "discount_coupons_organizationId_id_idx" ON "discount_coupons"("organizationId", "id");

-- CreateIndex
CREATE INDEX "discount_coupons_createdById_id_idx" ON "discount_coupons"("createdById", "id");

-- CreateIndex
CREATE INDEX "pricing_quotes_organizationId_id_idx" ON "pricing_quotes"("organizationId", "id");

-- CreateIndex
CREATE INDEX "pricing_quotes_status_id_idx" ON "pricing_quotes"("status", "id");

-- CreateIndex
CREATE INDEX "pricing_quotes_createdById_id_idx" ON "pricing_quotes"("createdById", "id");

-- CreateIndex
CREATE INDEX "pricing_quotes_planId_idx" ON "pricing_quotes"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "commercial_acceptances_organizationId_key" ON "commercial_acceptances"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "commercial_acceptances_quoteId_key" ON "commercial_acceptances"("quoteId");

-- CreateIndex
CREATE INDEX "commercial_acceptances_couponId_idx" ON "commercial_acceptances"("couponId");

-- CreateIndex
CREATE INDEX "commercial_acceptances_planId_idx" ON "commercial_acceptances"("planId");

-- CreateIndex
CREATE INDEX "commercial_acceptances_acceptedById_idx" ON "commercial_acceptances"("acceptedById");

-- AddForeignKey
ALTER TABLE "sales_discount_allowances" ADD CONSTRAINT "sales_discount_allowances_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "platform_staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_coupons" ADD CONSTRAINT "discount_coupons_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_coupons" ADD CONSTRAINT "discount_coupons_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_quotes" ADD CONSTRAINT "pricing_quotes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_quotes" ADD CONSTRAINT "pricing_quotes_planId_fkey" FOREIGN KEY ("planId") REFERENCES "billing_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_quotes" ADD CONSTRAINT "pricing_quotes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_acceptances" ADD CONSTRAINT "commercial_acceptances_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_acceptances" ADD CONSTRAINT "commercial_acceptances_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "discount_coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_acceptances" ADD CONSTRAINT "commercial_acceptances_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "pricing_quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_acceptances" ADD CONSTRAINT "commercial_acceptances_planId_fkey" FOREIGN KEY ("planId") REFERENCES "billing_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commercial_acceptances" ADD CONSTRAINT "commercial_acceptances_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Financial boundaries also apply to direct database writes.
ALTER TABLE platform_staff DROP CONSTRAINT platform_staff_sales_permissions;
ALTER TABLE platform_staff ADD CONSTRAINT platform_staff_sales_permissions CHECK (
  role <> 'SALES' OR permissions <@ ARRAY['customers.read','billing.read','templates.read','offers.read','offers.create']::text[]
);
ALTER TABLE sales_discount_allowances ADD CONSTRAINT sales_allowance_bounds CHECK (
  "maxPercent" BETWEEN 0 AND 100 AND "maxMonths" BETWEEN 0 AND 12 AND "freeMonths" BETWEEN 0 AND 12
  AND (("maxPercent" = 0) = ("maxMonths" = 0)) AND version >= 1
);
ALTER TABLE discount_coupons ADD CONSTRAINT coupon_bounds CHECK (
  percent BETWEEN 1 AND 100 AND months BETWEEN 1 AND 12 AND "maxRedemptions" BETWEEN 1 AND 100000
  AND "redeemedCount" BETWEEN 0 AND "maxRedemptions" AND code = upper(trim(code))
);
ALTER TABLE pricing_quotes ADD CONSTRAINT quote_bounds CHECK (
  amount >= 0 AND amount <= "renewalAmount" AND "renewalAmount" > 0 AND months BETWEEN 1 AND 12 AND version >= 1
  AND (status NOT IN ('APPROVED','ACCEPTED') OR "approvedById" IS NOT NULL)
);
ALTER TABLE commercial_acceptances ADD CONSTRAINT acceptance_source CHECK (
  ("couponId" IS NOT NULL) <> ("quoteId" IS NOT NULL)
);
ALTER TABLE commercial_acceptances ADD CONSTRAINT acceptance_bounds CHECK (
  amount >= 0 AND amount <= "renewalAmount" AND "renewalAmount" > 0 AND months BETWEEN 1 AND 12
);
-- Application access stays behind the API; no public Data API grants.
REVOKE ALL ON sales_discount_allowances, discount_coupons, pricing_quotes, commercial_acceptances FROM PUBLIC;
DO $$ DECLARE api_role text; BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON sales_discount_allowances, discount_coupons, pricing_quotes, commercial_acceptances FROM %I', api_role);
    END IF;
  END LOOP;
END $$;
