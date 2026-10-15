// This cookie supplies an audit reason, never identity or authorization.
// Every API request still checks current employee permissions and customer scope.
export function supportContextReason(headers: Headers, organizationId: string): string {
  const raw = headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith('daify_support='))?.slice('daify_support='.length);
  if (!raw) return '';
  try {
    const context = JSON.parse(decodeURIComponent(raw)) as { organizationId?: string; reason?: string; expiresAt?: number };
    if (context.organizationId !== organizationId || typeof context.reason !== 'string' || context.reason.length < 10 || context.reason.length > 500 || typeof context.expiresAt !== 'number' || context.expiresAt <= Date.now()) return '';
    return `uri:${encodeURIComponent(context.reason)}`;
  } catch { return ''; }
}
