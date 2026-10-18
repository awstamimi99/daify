'use client';
import { useI18n, LanguageSwitcher } from '@/components/i18n/language-provider';
import Link from 'next/link';
import { AdminBilling } from './admin-billing';
import { SupportWorkspace } from '../support/support-workspace';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { PlatformAudit, PlatformOrganization, PlatformUser } from '@daify/types';
import { DaifyLogo } from '@/components/brand/daify-logo';
import styles from './admin-workspace.module.css';

type Section = 'organizations' | 'users' | 'audit' | 'billing' | 'support';
type Rows = (PlatformOrganization | PlatformUser | PlatformAudit)[];
type Change = { section: 'organizations' | 'users'; id: string; label: string; expectedStatus: string; status: string };
export function AdminWorkspace({ email, permissions = null }: { email: string; permissions?: string[] | null }) {
  const [section, setSection] = useState<Section>(() => permissions === null ? 'organizations' : permissions.includes('customers.read') ? 'organizations' : permissions.includes('support.manage') ? 'support' : permissions.includes('users.read') ? 'users' : permissions.includes('audit.read') ? 'audit' : 'billing');
  const [reason, setReason] = useState(''), [search, setSearch] = useState(''), [organizationId, setOrganizationId] = useState('');
  const [rows, setRows] = useState<Rows>([]), [loaded, setLoaded] = useState(false), [pending, setPending] = useState(false);
  const [error, setError] = useState(''), [message, setMessage] = useState(false), [change, setChange] = useState<Change | null>(null), [changeReason, setChangeReason] = useState('');
  const [cursors, setCursors] = useState<string[]>([]), [page, setPage] = useState(0);
  const filter = useRef({ reason: '', search: '', organizationId: '' });
  const { t, arabic, errorMessage } = useI18n();
  const can = (permission: string) => permissions === null || permissions.includes(permission);
  const sectionPermission = { organizations: 'customers.read', users: 'users.read', audit: 'audit.read', billing: 'billing.read', support: 'support.manage' };
  const labels = { organizations: t('Organizations', 'المؤسسات'), users: t('Users', 'المستخدمون'), audit: t('Audit log', 'سجل التدقيق'), billing: t('Billing & templates', 'الاشتراكات والقوالب'), support: t('Support', 'الدعم') };
  const status = (value: string) => arabic ? ({ ACTIVE: 'نشط', SUSPENDED: 'موقوف', ARCHIVED: 'مؤرشف', DISABLED: 'معطّل', PENDING: 'بانتظار التحقق', SUCCESS: 'ناجح' }[value] ?? value) : value.toLowerCase();
  const date = (value: string) => new Intl.DateTimeFormat(arabic ? 'ar-KW' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

  async function load(index: number, after?: string) {
    setPending(true); setError('');
    try {
      const query = new URLSearchParams({ limit: '25' });
      if (filter.current.search) query.set('search', filter.current.search);
      if (section === 'audit' && filter.current.organizationId) query.set('organizationId', filter.current.organizationId);
      if (after) query.set('after', after);
      const response = await fetch(`/api/platform/${section}?${query}`, { headers: { 'x-support-reason': `uri:${encodeURIComponent(filter.current.reason)}` }, cache: 'no-store' });
      const result = await response.json() as Rows & { detail?: string | string[] };
      if (!response.ok) throw new Error(Array.isArray(result.detail) ? result.detail.join(' ') : result.detail ?? t('Could not load records.', 'تعذر تحميل السجلات.'));
      setRows(result); setPage(index); setLoaded(true);
    } catch (error) { setError(error instanceof Error ? error.message : t('Please retry.', 'يرجى المحاولة مجددًا.')); }
    finally { setPending(false); }
  }
  function submit(event: FormEvent) {
    event.preventDefault(); filter.current = { reason: reason.trim(), search: search.trim(), organizationId: organizationId.trim() };
    setCursors([]); setChange(null); setMessage(false); void load(0);
  }
  function select(next: Section) { setSection(next); setRows([]); setLoaded(false); setCursors([]); setPage(0); setError(''); setMessage(false); setChange(null); }
  async function mutate(event: FormEvent) {
    event.preventDefault(); if (!change) return;
    setPending(true); setError(''); setMessage(false);
    try {
      const response = await fetch(`/api/platform/${change.section}/${change.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: change.status, expectedStatus: change.expectedStatus, reason: changeReason.trim() }) });
      const result = await response.json() as { status: string; detail?: string | string[] };
      if (!response.ok) throw new Error(Array.isArray(result.detail) ? result.detail.join(' ') : result.detail ?? t('Change failed.', 'تعذر حفظ التغيير.'));
      setChange(null); setMessage(true);
      await load(page, page ? cursors[page - 1] : undefined);
    } catch (error) { setError(error instanceof Error ? error.message : t('Please retry.', 'يرجى المحاولة مجددًا.')); }
    finally { setPending(false); }
  }
  function prepare(value: Change) { setChange(value); setChangeReason(''); setMessage(false); setError(''); requestAnimationFrame(() => document.getElementById('change-reason')?.focus()); }

  return <main id="main-content" className={styles.workspace} lang={arabic ? 'ar' : 'en'} dir={arabic ? 'rtl' : 'ltr'}>
    <header className={styles.heading}><div><DaifyLogo /><h1>{t('Platform workspace.', 'إدارة المنصة.')}</h1><p>{email}</p></div><div className={styles.tools}><Link href="/dashboard">{t('Your dashboard', 'لوحة التحكم')}</Link><LanguageSwitcher /></div></header>
    {can('offers.read') && <Link href="/admin/offers">{t('Coupons & quotes', 'الكوبونات وعروض الأسعار')}</Link>}
    {can('staff.manage') && <Link href="/admin/employees">{t('Employees & permissions', 'الموظفون والصلاحيات')}</Link>}{can('menus.read') && <Link href="/admin/assistance">{t('Help a client with their menus', 'مساعدة عميل في قوائمه')}</Link>}
    <nav className={styles.tabs} aria-label={t('Administration', 'إدارة المنصة')}>{(['organizations', 'users', 'audit', 'billing', 'support'] as const).filter(key => can(sectionPermission[key]) || key === 'billing' && can('templates.read')).map(key => <button key={key} disabled={pending} aria-pressed={section === key} onClick={() => select(key)}>{labels[key]}</button>)}</nav>
    {section === 'billing' ? <AdminBilling arabic={arabic} owner={permissions === null} permissions={permissions ?? []} /> : section === 'support' ? <SupportWorkspace arabic={arabic} /> : <><section className={styles.panel}><h2>{labels[section]}</h2><p>{t('Enter the support case or operational reason for accessing these records. Each read and change is recorded.', 'أدخل رقم حالة الدعم أو سبب الاطلاع على هذه السجلات. يتم تسجيل كل عملية اطلاع أو تعديل.')}</p>
      <form className={styles.filters} onSubmit={submit}><label className={styles.field}>{t('Access reason', 'سبب الاطلاع')}<input required minLength={10} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label><label className={styles.field}>{t(section === 'audit' ? 'Search reason' : 'Search name or identifier', section === 'audit' ? 'البحث في السبب' : 'البحث بالاسم أو المعرّف')}<input maxLength={100} value={search} onChange={e => setSearch(e.target.value)} /></label>
        {section === 'audit' && <label className={styles.field}>{t('Organization ID (optional)', 'معرّف المؤسسة (اختياري)')}<input value={organizationId} onChange={e => setOrganizationId(e.target.value)} /></label>}<button className={styles.primary} disabled={pending || reason.trim().length < 10}>{pending ? t('Loading…', 'جارٍ التحميل…') : t('Load records', 'تحميل السجلات')}</button></form>
    </section>
    {error && <p role="alert" className={styles.error}>{errorMessage(error)}</p>}{message && <p role="status" className={styles.success}>{t('Status updated and recorded in the audit log.', 'تم تحديث الحالة وتسجيلها في سجل التدقيق.')}</p>}
    {change && <form onSubmit={mutate} className={`${styles.panel} ${styles.confirmation}`} aria-label={t('Confirm status change', 'تأكيد تغيير الحالة')}><h2>{change.label} → {status(change.status)}</h2><p>{change.section === 'users' ? t('Disabling blocks sign-in and revokes existing sessions. Restoring requires a new sign-in.', 'التعطيل يمنع تسجيل الدخول وينهي الجلسات الحالية. تتطلب الاستعادة تسجيل دخول جديد.') : t('Suspension blocks workspace access and public menus. Saved content and published versions remain available after restoration.', 'الإيقاف يمنع الوصول إلى مساحة العمل والقوائم العامة. يبقى المحتوى والإصدارات محفوظة للاستعادة.')}</p><label className={styles.field}>{t('Change reason', 'سبب التغيير')}<textarea id="change-reason" required minLength={10} maxLength={500} value={changeReason} onChange={e => setChangeReason(e.target.value)} /></label><div className={styles.tools}><button className={styles.primary} disabled={pending || changeReason.trim().length < 10}>{t('Confirm change', 'تأكيد التغيير')}</button><button type="button" disabled={pending} onClick={() => setChange(null)}>{t('Cancel', 'إلغاء')}</button></div></form>}
    <section className={styles.panel} aria-label={labels[section]} aria-busy={pending}>
      {!loaded ? <p className={styles.empty}>{t('Choose a reason, then load records to begin.', 'أدخل سبب الاطلاع ثم حمّل السجلات للبدء.')}</p> : !rows.length ? <p className={styles.empty}>{t('No matching records.', 'لا توجد سجلات مطابقة.')}</p> : <ul className={styles.list}>{rows.map(row => <li key={row.id} className={`${styles.row} ${section === 'audit' ? styles.audit : ''}`}>
        {'name' in row ? <><div><strong>{row.name}</strong><p>{row.slug} · <span className={styles.badge}>{status(row.status)}</span></p><small>{row.id}</small></div>{can('customers.manage') && row.status !== 'ARCHIVED' && <button disabled={pending} onClick={() => prepare({ section: 'organizations', id: row.id, label: row.name, expectedStatus: row.status, status: row.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })}>{row.status === 'ACTIVE' ? t('Suspend organization', 'إيقاف المؤسسة') : t('Restore organization', 'استعادة المؤسسة')}</button>}</> : 'email' in row ? <><div><strong>{row.displayName ?? row.email}</strong><p>{row.email} · <span className={styles.badge}>{status(row.status)}</span>{row.platformAdmin && ` · ${t('Platform administrator', 'مسؤول المنصة')}`}</p><small>{row.id}</small></div>{can('users.manage') && !row.platformAdmin && row.status !== 'PENDING' && <button disabled={pending} onClick={() => prepare({ section: 'users', id: row.id, label: row.email, expectedStatus: row.status, status: row.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' })}>{row.status === 'ACTIVE' ? t('Disable user', 'تعطيل المستخدم') : t('Restore user', 'استعادة المستخدم')}</button>}</> : <><strong>{row.reason ?? row.type}</strong><p>{date(row.createdAt)} · {row.type} · {status(row.outcome)}</p><small>{t('Actor', 'المنفّذ')}: {row.actorUserId ?? '—'} · {t('Target', 'الهدف')}: {row.targetType ?? '—'} {row.targetId ?? ''}</small><small>{t('Request', 'الطلب')}: {row.requestId ?? '—'}</small></>}
      </li>)}</ul>}
      {loaded && <footer className={styles.footer}><span>{t('Page', 'الصفحة')} {page + 1} · {rows.length} {t('records', 'سجل')}</span><div className={styles.tools}><button disabled={pending || page === 0} onClick={() => void load(page - 1, page > 1 ? cursors[page - 2] : undefined)}>{t('Previous', 'السابق')}</button><button disabled={pending || rows.length < 25} onClick={() => { const after = rows.at(-1)!.id; setCursors(previous => [...previous.slice(0, page), after]); void load(page + 1, after); }}>{t('Next', 'التالي')}</button></div></footer>}
    </section></>}
  </main>;
}
