ALTER TYPE "SecurityEventType" ADD VALUE 'MFA_SETUP_STARTED';
ALTER TYPE "SecurityEventType" ADD VALUE 'MFA_ENABLED';
ALTER TYPE "SecurityEventType" ADD VALUE 'MFA_RECOVERY_USED';
ALTER TABLE "users"
  ADD COLUMN "mfaLastCounter" INTEGER,
  ADD COLUMN "mfaRecoveryHashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "mfaPendingSecret" TEXT,
  ADD COLUMN "mfaPendingSessionId" UUID,
  ADD COLUMN "mfaPendingExpiresAt" TIMESTAMPTZ(3);
