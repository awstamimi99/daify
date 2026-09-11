-- M3 authentication, organization access, and security audit foundation.
CREATE TYPE "AuthenticationAssuranceLevel" AS ENUM ('AAL1', 'AAL2');
CREATE TYPE "ActionTokenPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'ORGANIZATION_INVITATION');
CREATE TYPE "SecurityEventType" AS ENUM ('USER_SIGNED_UP', 'LOGIN_SUCCEEDED', 'LOGIN_FAILED', 'LOGOUT', 'EMAIL_VERIFIED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'SESSION_REVOKED', 'ORGANIZATION_CREATED', 'INVITATION_CREATED', 'INVITATION_ACCEPTED', 'MEMBERSHIP_UPDATED', 'PLATFORM_ACCESS');

ALTER TABLE "users"
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "platformAdmin" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mfaSecret" TEXT;

-- M2 contained no production credentials. The non-login sentinel makes the
-- additive migration safe for development rows while requiring password-reset
-- enrollment before they can authenticate.
UPDATE "users" SET "passwordHash" = '$argon2id$v=19$m=65536,t=3,p=4$9t9r7ECRHfZmIbw8bXrKQA$SOvfUGwdMxWL/K5royH18kZgfU3LFPw9aIn9wBdgpLw' WHERE "passwordHash" IS NULL;
ALTER TABLE "users" ALTER COLUMN "passwordHash" SET NOT NULL;
ALTER TABLE "organization_members" ADD COLUMN "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "organization_members" ALTER COLUMN "permissions" DROP DEFAULT;

CREATE TABLE "sessions" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "assuranceLevel" "AuthenticationAssuranceLevel" NOT NULL DEFAULT 'AAL1',
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "absoluteExpiresAt" TIMESTAMPTZ(3) NOT NULL,
  "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMPTZ(3),
  "ipAddress" VARCHAR(64),
  "userAgent" VARCHAR(512),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "action_tokens" (
  "id" UUID NOT NULL,
  "purpose" "ActionTokenPurpose" NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "userId" UUID,
  "organizationId" UUID,
  "email" VARCHAR(320),
  "role" "OrganizationRole",
  "allLocations" BOOLEAN,
  "locationIds" TEXT[],
  "permissions" TEXT[],
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "consumedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "action_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "security_events" (
  "id" UUID NOT NULL,
  "type" "SecurityEventType" NOT NULL,
  "actorUserId" UUID,
  "organizationId" UUID,
  "targetType" VARCHAR(100),
  "targetId" VARCHAR(100),
  "requestId" VARCHAR(128),
  "ipAddress" VARCHAR(64),
  "outcome" VARCHAR(40) NOT NULL,
  "reason" VARCHAR(500),
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");
CREATE INDEX "sessions_userId_revokedAt_expiresAt_idx" ON "sessions"("userId", "revokedAt", "expiresAt");
CREATE UNIQUE INDEX "action_tokens_tokenHash_key" ON "action_tokens"("tokenHash");
CREATE INDEX "action_tokens_userId_purpose_consumedAt_idx" ON "action_tokens"("userId", "purpose", "consumedAt");
CREATE INDEX "action_tokens_organizationId_purpose_consumedAt_idx" ON "action_tokens"("organizationId", "purpose", "consumedAt");
CREATE INDEX "security_events_actorUserId_createdAt_idx" ON "security_events"("actorUserId", "createdAt");
CREATE INDEX "security_events_organizationId_createdAt_idx" ON "security_events"("organizationId", "createdAt");
CREATE INDEX "security_events_type_createdAt_idx" ON "security_events"("type", "createdAt");

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "action_tokens" ADD CONSTRAINT "action_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "action_tokens" ADD CONSTRAINT "action_tokens_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
