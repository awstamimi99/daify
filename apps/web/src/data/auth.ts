export const authModes = ["login", "signup", "forgot-password", "reset-password", "resend-verification"] as const;
export type AuthMode = (typeof authModes)[number];
export function isAuthMode(value: string): value is AuthMode { return authModes.some(mode => mode === value); }
