'use client';
import { useI18n } from '@/components/i18n/language-provider';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import type { Workspace } from '@/lib/workspace';
import type { DraftMenuSummary } from '@daify/types';
import { MenuWorkspace } from '@/components/dashboard/menu-workspace';
import { PublishingWorkspace } from '@/components/dashboard/publishing-workspace';
import styles from './admin-workspace.module.css';
export function AssistanceWorkspace() {
  const { t, errorMessage } = useI18n();
  const [reason, setReason] = useState(''), [customer, setCustomer] = useState(''), [error, setError] = useState(''), [pending, setPending] = useState(false);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]), [workspace, setWorkspace] = useState<Workspace | null>(null), [menus, setMenus] = useState<DraftMenuSummary[]>([]);
  const [mode, setMode] = useState<'edit' | 'design' | 'publish'>('edit');
  async function read<T>(response: Response): Promise<T> { const data = await response.json(); if (!response.ok) throw new Error(data.detail ?? 'Could not load the customer workspace.'); return data; }
  async function run(action: () => Promise<void>) { setPending(true); setError(''); try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Please retry.'); } finally { setPending(false); } }
  async function load(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const rows: { id: string; name: string }[] = []; let after = '';
      do { const page = await read<{ id: string; name: string }[]>(await fetch(`/api/platform/organizations?limit=100${after ? `&after=${after}` : ''}`, { headers: { 'x-support-reason': `uri:${encodeURIComponent(reason.trim())}` }, cache: 'no-store' })); rows.push(...page); after = page.length === 100 ? page.at(-1)!.id : ''; } while (after);
      setCustomers(rows); setCustomer(rows[0]?.id ?? '');
    });
  }
  async function start() {
    await run(async () => {
      const active = await read<Workspace>(await fetch('/api/platform/assistance', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ organizationId: customer, reason: reason.trim() }) }));
      const drafts = active.locations[0] ? await read<DraftMenuSummary[]>(await fetch(`/api/menus/${active.id}/${active.locations[0].id}`, { cache: 'no-store' })) : [];
      setWorkspace(active); setMenus(drafts); setMode('edit');
    });
  }
  async function switchMode(next: 'edit' | 'design' | 'publish') {
    if (!workspace || mode === next || !window.confirm(t("Save your changes before switching. Continue? احفظ تغييراتك قبل الانتقال. هل تريد المتابعة؟"))) return;
    await run(async () => {
      const drafts = workspace.locations[0] ? await read<DraftMenuSummary[]>(await fetch(`/api/menus/${workspace.id}/${workspace.locations[0].id}`, { cache: 'no-store' })) : [];
      setMenus(drafts); setMode(next);
    });
  }
  async function stop() {
    if (!workspace || !window.confirm(t("Finish assistance? Save your changes first. إنهاء المساعدة؟ احفظ تغييراتك أولاً."))) return;
    await run(async () => { await read(await fetch('/api/platform/assistance', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ organizationId: workspace.id, reason: reason.trim(), stop: true }) })); setWorkspace(null); });
  }
  return <main id="main-content" className={styles.workspace}><header className={styles.heading}><div><h1>{t("Client menu assistance")}</h1><p>مساعدة العملاء في تعديل القوائم ونشرها</p></div><Link href="/admin">{t("Platform workspace · إدارة المنصة")}</Link></header>
    {error && <p role="alert" className={styles.error}>{errorMessage(error)}</p>}
    {!workspace ? <section className={styles.panel}><form className={styles.filters} onSubmit={load}><label className={styles.field}>{t("Support reason · سبب المساعدة")}<input required minLength={10} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label><button disabled={pending}>{t("Find assigned customers · عرض العملاء")}</button></form>{customers.length > 0 && <div className={styles.filters}><label className={styles.field}>{t("Customer · العميل")}<select value={customer} onChange={e => setCustomer(e.target.value)}>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button disabled={pending || reason.trim().length < 10} className={styles.primary} onClick={() => void start()}>{t("Start assistance · بدء المساعدة")}</button></div>}</section> : <><section className={styles.panel}><h2>{workspace.name}</h2><p>{reason}</p><p>{t("Your actions are recorded under your employee account. Assistance lasts 15 minutes; start again if it expires. يتم تسجيل إجراءاتك بحسابك وتنتهي جلسة المساعدة بعد ١٥ دقيقة.")}</p><button disabled={pending} onClick={() => void stop()}>{t("Finish assistance · إنهاء المساعدة")}</button></section><nav className={styles.tabs} aria-label={t("Menu assistance")}>{(['edit', 'design', 'publish'] as const).filter(m => m === 'edit' || workspace.membership.permissions.includes(m === 'design' ? 'menu.design' : 'menu.publish')).map(m => <button key={m} aria-pressed={mode === m} disabled={pending} onClick={() => void switchMode(m)}>{m === 'edit' ? t("Menu content · محتوى القائمة") : m === 'design' ? t("Design · التصميم") : t("Publish · النشر")}</button>)}</nav>{mode === 'edit' ? <MenuWorkspace key={`${workspace.id}-edit`} workspace={workspace} initialMenus={menus} /> : <PublishingWorkspace key={`${workspace.id}-${mode}`} workspace={workspace} initialMenus={menus} mode={mode} assistance />}</>}
  </main>;
}
