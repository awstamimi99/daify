CREATE TYPE "PlatformStaffRole" AS ENUM ('MANAGER', 'SUPERVISOR', 'SUPPORT', 'SALES');
CREATE TYPE "PlatformStaffStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');

CREATE TABLE "platform_staff" (
  "id" UUID NOT NULL,
  "userId" UUID,
  "email" VARCHAR(320) NOT NULL,
  "role" "PlatformStaffRole" NOT NULL,
  "status" "PlatformStaffStatus" NOT NULL DEFAULT 'INVITED',
  "permissions" TEXT[] NOT NULL,
  "allOrganizations" BOOLEAN NOT NULL DEFAULT false,
  "organizationIds" UUID[] NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "invitedById" UUID NOT NULL,
  "invitationExpiresAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "platform_staff_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "platform_staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "platform_staff_email_normalized" CHECK ("email" = lower(trim("email"))),
  CONSTRAINT "platform_staff_active_user" CHECK ("status" <> 'ACTIVE' OR "userId" IS NOT NULL),
  CONSTRAINT "platform_staff_sales_permissions" CHECK ("role" <> 'SALES' OR "permissions" <@ ARRAY['customers.read', 'billing.read', 'templates.read']::text[])
);
CREATE UNIQUE INDEX "platform_staff_userId_key" ON "platform_staff"("userId");
CREATE UNIQUE INDEX "platform_staff_email_key" ON "platform_staff"("email");
CREATE INDEX "platform_staff_status_id_idx" ON "platform_staff"("status", "id");
