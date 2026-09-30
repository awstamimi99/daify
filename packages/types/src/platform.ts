export interface PlatformOrganization { id: string; name: string; slug: string; status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'; }
export interface PlatformUser { id: string; email: string; displayName: string | null; status: 'ACTIVE' | 'PENDING' | 'DISABLED'; platformAdmin: boolean; createdAt: string; lastLoginAt: string | null; }
export interface PlatformAudit { id: string; type: string; actorUserId: string | null; organizationId: string | null; targetType: string | null; targetId: string | null; outcome: string; reason: string | null; requestId: string | null; createdAt: string; }
export interface PlatformSubscription { id: string; name: string; plan: import('./billing').BillingPlan; status: string; periodEnd: string; cancelAtEnd: boolean; override: { limits: import('./billing').BillingLimits; expiresAt: string } | null; }
export interface PlatformTemplate { id: string; name: string; category: string; }
