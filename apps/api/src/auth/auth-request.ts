import type { Request } from 'express';
import type { AuthenticatedUser } from './auth.types';

export type AuthenticatedRequest = Request & { user: AuthenticatedUser };
