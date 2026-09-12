import type { AuthenticationAssuranceLevel } from '../generated/prisma/enums';

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string | null;
  platformAdmin: boolean;
  sessionId: string;
  assuranceLevel: AuthenticationAssuranceLevel;
}
