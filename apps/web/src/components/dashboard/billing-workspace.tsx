'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import type { BillingState } from '@daify/types';
import styles from './billing-workspace.module.css';

export function BillingWorkspace({ organizationId, name, initial, canManage, strongSession }: { organizationId: string; name: string; initial: BillingState; canManage: boolean; strongSession: boolean }) {
  const [state, setState] = useState(initial), [arabic, setArabic] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState(false);
  const retry = useRef<{ planId: string; key: string } | null>(null);
  const t = (en: string, ar: string) => arabic ? ar : en;
  const date = (value: string) => new Intl.DateTimeFormat(arabic ? 'ar-KW' : 'en-GB', { dateStyle: 'medium' }).format(new Date(value));
  const mutate = canManage && strongSession && state.mode === 'sandbox';
  const unresolved = state.checkouts.some(row => ['CREATING', 'READY', 'UNKNOWN'].includes(row.state));
  async function run(action = '', body: object = {}) {
    setPending(true); setError(''); setMessage(false);
    try {
      const response = await fetch(`/api/billing/${organizationId}${action ? `/${action}` : ''}`, { method: action ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, ...(action ? { body: JSON.stringify(body) } : {}), cache: 'no-store' });
      const result = await response.json() as BillingState & { detail?: string | string[] };
      if (!response.ok) throw new Error(Array.isArray(result.detail) ? result.detail.join(' ') : result.detail ?? t('Please retry.', 'يرجى المحاولة مجددًا.'));
      setState(result); retry.current = null;
      setMessage(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : t('Please retry.', 'يرجى المحاولة مجددًا.'));
      // A timed-out checkout can already exist. Refresh history without creating another payment.
      if (action === 'checkout') {
        try { const response = await fetch(`/api/billing/${organizationId}`, { cache: 'no-store' }); if (response.ok) setState(await response.json() as BillingState); } catch { /* Retain the same operation key for a deliberate retry. */ }
      }
    } finally { setPending(false); }
  }
  function checkout(planId: string) {
    if (retry.current?.planId !== planId) retry.current = { planId, key: crypto.randomUUID() };
    void run('checkout', { planId, idempotencyKey: retry.current.key });
  }
  const statuses: Record<string, string> = { TRIAL: 'تجريبي', ACTIVE: 'نشط', PAST_DUE: 'بانتظار السداد', EXPIRED: 'منتهي', CANCELED: 'ملغى', PAID: 'مدفوع', READY: 'بانتظار الدفع', CREATING: 'جارٍ التجهيز', UNKNOWN: 'بحاجة إلى تحقق' };
  const status = (value: string) => arabic ? statuses[value] ?? value : value.replaceAll('_', ' ').toLowerCase();
  return <div className={styles.workspace} dir={arabic ? 'rtl' : 'ltr'} lang={arabic ? 'ar' : 'en'}>
    <header className={styles.heading}><div><span className="eyebrow">{name}</span><h1>{t('Billing & plans.', 'الاشتراك والباقات.')}</h1><p>{t('A clear view of your plan and workspace usage.', 'باقتك واستخدام مساحة العمل في مكان واحد.')}</p></div><button onClick={() => setArabic(!arabic)}>{arabic ? 'English' : 'العربية'}</button></header>
    <div className={styles.notice}><strong>{t('Sandbox · no real charges', 'بيئة تجريبية · بدون مبالغ حقيقية')}</strong><p>{t('Prices and limits below are for testing. Payments use test cards, and renewal is manual. Your existing menus are preserved when a trial or subscription ends.', 'الأسعار والحدود للاختبار. الدفع ببطاقات تجريبية والتجديد يدوي. انتهاء الاشتراك لا يحذف قوائمك الحالية.')}</p></div>
    {state.acceptedOfferPending && <p>{t('Your accepted offer awaits billing activation. Checkout is paused to protect the agreed price.', 'عرضك المقبول بانتظار تفعيل الفوترة. تم إيقاف الدفع للحفاظ على السعر المتفق عليه.')} <Link href="/dashboard/offers">{t('View accepted terms', 'عرض الشروط المقبولة')}</Link></p>}
    {state.mode === 'disabled' && <p>{t('Billing testing is not enabled in this environment yet.', 'تجربة الفوترة غير مفعّلة في هذه البيئة بعد.')}</p>}
    {!strongSession && canManage && <p>{t('Two-step verification is required to change billing.', 'التحقق بخطوتين مطلوب لتغيير الاشتراك.')} <Link href="/dashboard/security">{t('Open account security →', 'فتح أمان الحساب ←')}</Link></p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}{message && <p role="status" className={styles.success}>{t('Billing status updated.', 'تم تحديث حالة الاشتراك.')}</p>}
    <section className={styles.summary}><div><span className="eyebrow">{t('Current subscription', 'الاشتراك الحالي')}</span><h2>{state.subscription ? (arabic ? state.subscription.plan.nameAr : state.subscription.plan.name) : t('Not enrolled', 'لم يبدأ الاشتراك التجريبي')}</h2>
      {state.subscription ? <><p>{status(state.subscription.status)} · {t('Access through', 'الوصول حتى')} {date(state.subscription.periodEnd)}</p>{state.subscription.graceEnd && !state.subscription.cancelAtEnd && <p>{t('Payment grace ends', 'تنتهي مهلة الدفع في')} {date(state.subscription.graceEnd)}</p>}{state.subscription.cancelAtEnd && <p>{t('Cancellation scheduled. Your content stays saved.', 'تم جدولة الإلغاء. سيبقى المحتوى محفوظًا.')}</p>}</> : <p>{t('Start a 14-day sandbox trial to test plan limits.', 'ابدأ تجربة لمدة 14 يومًا لاختبار حدود الباقة.')}</p>}
    </div><div className={styles.actions}><button disabled={pending} onClick={() => void run()}>{t('Refresh status', 'تحديث الحالة')}</button>{state.subscription && !state.subscription.cancelAtEnd && <button disabled={!mutate || pending || unresolved} onClick={() => void run('cancel')}>{t('Cancel at period end', 'إلغاء بنهاية الفترة')}</button>}</div></section>
    <section aria-label={t('Workspace usage', 'استخدام مساحة العمل')} className={styles.usage}>{(['locations', 'menus', 'members'] as const).map((key, i) => <div key={key}><span>{t(['Locations', 'Menus', 'Active members'][i]!, ['الفروع', 'القوائم', 'الأعضاء النشطون'][i]!)}</span><strong><bdi dir="ltr">{state.usage[key]} <small>/ {state.limits ? state.limits[key] : '—'}</small></bdi></strong><p>{state.limits && state.usage[key] > state.limits[key] ? t('Above limit · existing content is retained', 'تم تجاوز الحد · المحتوى الحالي محفوظ') : t('Across this workspace', 'في مساحة العمل')}</p></div>)}</section>
    <section><h2>{t('Sandbox plans', 'الباقات التجريبية')}</h2>{!state.plans.length && <p>{t('No sandbox plans are available yet.', 'لا توجد باقات تجريبية متاحة بعد.')}</p>}<div className={styles.plans}>{state.plans.map(plan => <article key={plan.id}><h3>{arabic ? plan.nameAr : plan.name}</h3><p className={styles.price}>{plan.amount} <span>{t('KWD / month', 'د.ك / شهر')}</span></p><ul><li>{plan.limits.locations} {t('locations', 'فروع')}</li><li>{plan.limits.menus} {t('menus', 'قوائم')}</li><li>{plan.limits.members} {t('active members, including owners', 'أعضاء نشطين، يشمل المالك')}</li><li>{plan.limits.templates.length} {t('templates', 'قوالب')}</li></ul>
      {state.enrolled ? <button className={styles.primary} disabled={!mutate || pending || !state.providerReady || unresolved || state.acceptedOfferPending} onClick={() => checkout(plan.id)}>{t('Create test payment', 'إنشاء دفعة تجريبية')}</button> : <button className={styles.primary} disabled={!mutate || pending} onClick={() => void run('trial', { planId: plan.id })}>{t('Start sandbox trial', 'بدء الاشتراك التجريبي')}</button>}
    </article>)}</div>{state.enrolled && !state.providerReady && <p>{t('Payment testing is not connected yet. Trial and usage checks are available.', 'الدفع التجريبي غير متصل بعد. يمكنك اختبار الاشتراك وحدود الاستخدام.')}</p>}{state.enrolled && <p>{t('An early renewal of the same paid plan adds a month. Paying for a different plan replaces it immediately with no test credit or refund.', 'تجديد نفس الباقة المدفوعة مبكرًا يضيف شهرًا. الدفع لباقة أخرى يستبدلها فورًا دون رصيد أو استرداد تجريبي.')}</p>}</section>
    <section><h2>{t('Test payment history', 'سجل الدفعات التجريبية')}</h2>{unresolved && <p>{t('Complete or check the pending payment before starting another one or canceling.', 'أكمل الدفعة المعلقة أو تحقق منها قبل إنشاء دفعة أخرى أو إلغاء الاشتراك.')}</p>}{!state.checkouts.length ? <p>{t('Your test payments will appear here.', 'ستظهر دفعاتك التجريبية هنا.')}</p> : <ol className={styles.history}>{state.checkouts.map(row => <li key={row.id}><div><strong>{arabic ? row.plan.nameAr : row.plan.name} · {row.plan.amount} KWD</strong><p>{date(row.createdAt)} · {status(row.state)}</p></div><div className={styles.actions}>{row.paymentUrl && row.state === 'READY' && <a href={row.paymentUrl} target="_blank" rel="noreferrer">{t('Open test checkout ↗', 'فتح الدفع التجريبي ↗')}</a>}{!['PAID', 'CANCELED'].includes(row.state) && <button disabled={pending || !canManage || !state.providerReady} onClick={() => void run(`checkouts/${row.id}/reconcile`)}>{t('Check payment', 'التحقق من الدفع')}</button>}</div></li>)}</ol>}</section>
  </div>;
}
