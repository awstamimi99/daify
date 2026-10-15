'use client';
import { useState } from 'react';
import Link from 'next/link';
import styles from './admin-workspace.module.css';
import { labels, roles, type StaffRole } from '@/lib/staff-labels';
export function StaffInvitation({ email, mfa }: { email: string; mfa: boolean }) {
  const [error, setError] = useState(''), [done, setDone] = useState(false), [pending, setPending] = useState(false);
  const [invitation, setInvitation] = useState<{ role: StaffRole; permissions: string[]; allOrganizations: boolean; organizationIds: string[] } | null>(null);
  async function request(accept = false) {
    setPending(true); setError('');
    try {
      const response = await fetch(`/api/platform/staff/${accept ? 'accept' : 'invitation'}`, { method: accept ? 'POST' : 'GET', headers: { 'content-type': 'application/json' }, ...(accept ? { body: '{}' } : {}), cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? 'Could not load your invitation.');
      if (!data) throw new Error('No active invitation for this email. Ask your manager to check or renew it.');
      if (accept) setDone(true); else setInvitation(data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Please retry.'); } finally { setPending(false); }
  }
  return <main id="main-content" className={styles.workspace}><section className={styles.panel}><h1>Join the DAIFY team · الانضمام إلى فريق ضيفي</h1><p>{email}</p><p>Use the email that received the invitation. Verify your email and enable two-step verification before accepting. استخدم البريد المدعو وفعّل المصادقة الثنائية قبل القبول.</p>
    {!mfa && <p><Link href="/dashboard/security">Set up MFA · إعداد المصادقة الثنائية</Link>. Then sign in again and return to this page.</p>}
    {error && <p role="alert">{error}</p>}{done ? <p role="status"><Link href="/admin">Open your employee workspace · افتح مساحة عملك</Link></p> : <><button disabled={pending} onClick={() => void request()}>Review invitation · مراجعة الدعوة</button>{invitation && <><p>{roles[invitation.role]?.join(' · ') ?? invitation.role} · {invitation.allOrganizations ? 'All customers' : `${invitation.organizationIds.length} assigned customers`}</p><ul>{invitation.permissions.map(p => <li key={p}>{labels[p]?.join(' · ') ?? 'Additional permission · صلاحية إضافية'}</li>)}</ul><button className={styles.primary} disabled={pending || !mfa} onClick={() => void request(true)}>Accept invitation · قبول الدعوة</button></>}</>}</section></main>;
}
