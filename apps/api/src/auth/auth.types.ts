import type { AuthenticationAssuranceLevel } from '../generated/prisma/enums';
import type { StaffAccess } from '../platform/staff-policy';

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string | null;
  platformAdmin: boolean;
  sessionId: string;
  assuranceLevel: AuthenticationAssuranceLevel;
  platformStaff?: StaffAccess;
  supportReason?: string;
}
