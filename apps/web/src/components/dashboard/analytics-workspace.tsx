'use client';
import { useState } from 'react';
import type { FormEvent } from 'react';
import type { AnalyticsReport } from '@daify/types';
import styles from './analytics-workspace.module.css';
export function AnalyticsWorkspace({ organizationId, name, initial }: { organizationId: string; name: string; initial: AnalyticsReport }) {
  const [report, setReport] = useState(initial), [arabic, setArabic] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState('');
  const [from, setFrom] = useState(initial.from), [to, setTo] = useState(initial.to), [locationId, setLocationId] = useState('');
  const t = (en: string, ar: string) => arabic ? ar : en;
  const number = (value: number) => new Intl.NumberFormat(arabic ? 'ar-KW' : 'en').format(value);
  async function refresh(event: FormEvent) {
    event.preventDefault(); setPending(true); setError('');
    try {
      const query = new URLSearchParams({ from, to, ...(locationId ? { locationId } : {}) });
      const response = await fetch(`/api/analytics/${organizationId}?${query}`, { cache: 'no-store' });
      const value = await response.json() as AnalyticsReport & { detail?: string | string[] };
      if (!response.ok) throw new Error(Array.isArray(value.detail) ? value.detail.join(' ') : value.detail ?? t('Could not load analytics.', 'تعذر تحميل الإحصاءات.'));
      setReport(value);
    } catch (error) { setError(error instanceof Error ? error.message : t('Please retry.', 'يرجى المحاولة مجددًا.')); }
    finally { setPending(false); }
  }
  const maximum = Math.max(1, ...report.days.map(day => day.views));
  return <div className={styles.workspace} dir={arabic ? 'rtl' : 'ltr'} lang={arabic ? 'ar' : 'en'}>
    <header className={styles.heading}><div><span className="eyebrow">{name}</span><h1>{t('Menu analytics.', 'إحصاءات القائمة.')}</h1><p>{t('Understand how guests explore your menus.', 'تعرّف على طريقة تصفّح ضيوفك للقوائم.')}</p></div><button onClick={() => setArabic(!arabic)}>{arabic ? 'English' : 'العربية'}</button></header>
    <p className={styles.notice}>{report.mode === 'local' ? t('Local testing · anonymous event counts. Production collection is not enabled.', 'اختبار محلي · إحصاءات أحداث مجهولة الهوية. الجمع في بيئة الإنتاج غير مفعّل.') : t('Analytics collection is disabled. Previously aggregated totals, if any, remain visible.', 'جمع الإحصاءات غير مفعّل. تبقى الإجماليات المجمّعة سابقًا ظاهرة إن وجدت.')}</p>
    <form onSubmit={refresh} className={`${styles.panel} ${styles.filters}`}><label>{t('From', 'من')}<input type="date" required value={from} onChange={e => setFrom(e.target.value)} /></label><label>{t('To', 'إلى')}<input type="date" required value={to} onChange={e => setTo(e.target.value)} /></label><label>{t('Location', 'الفرع')}<select value={locationId} onChange={e => setLocationId(e.target.value)}><option value="">{t('All permitted locations', 'كل الفروع المسموحة')}</option>{report.locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label><button className={styles.primary} disabled={pending}>{pending ? t('Loading…', 'جارٍ التحميل…') : t('Update report', 'تحديث التقرير')}</button></form>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <section className={styles.metrics} aria-label={t('Event totals', 'إجماليات الأحداث')}>{([
      ['MENU_VIEW', t('Menu views', 'مشاهدات القائمة')], ['QR_REDIRECT', t('QR route visits', 'زيارات رابط QR')], ['ITEM_VIEW', t('Item interactions', 'التفاعل مع الأصناف')],
      ['SECTION_VIEW', t('Section views', 'مشاهدات الأقسام')], ['LANGUAGE_CHANGE', t('Language changes', 'تغيير اللغة')],
    ] as const).map(([key, label]) => <article key={key} className={`${styles.panel} ${styles.metric}`}><span>{label}</span><strong>{number(report.totals[key])}</strong></article>)}</section>
    <div className={styles.columns}><section className={styles.panel}><h2>{t('Views over time', 'المشاهدات بمرور الوقت')}</h2>{report.totals.MENU_VIEW === 0 ? <p className={styles.empty}>{t('No menu views recorded for this period.', 'لم يتم تسجيل مشاهدات للقائمة خلال هذه الفترة.')}</p> : <><div className={styles.chart} role="img" aria-label={t(`Daily menu views, ${report.from} to ${report.to}. Exact values are in the daily totals below.`, `مشاهدات القائمة اليومية من ${report.from} إلى ${report.to}. القيم التفصيلية في الجدول أدناه.`)}>{report.days.map(day => <span key={day.day} className={styles.bar} style={{ height: `${day.views / maximum * 100}%` }} title={`${day.day}: ${day.views}`} />)}</div><div className={styles.chartLabels}><span>{report.from}</span><span>{report.to}</span></div></>}
      <details><summary>{t('Daily totals', 'الإجماليات اليومية')}</summary><table><thead><tr><th scope="col">{t('Date (UTC)', 'التاريخ (UTC)')}</th><th scope="col">{t('Views', 'المشاهدات')}</th><th scope="col">QR</th></tr></thead><tbody>{report.days.map(day => <tr key={day.day}><td>{day.day}</td><td>{number(day.views)}</td><td>{number(day.qr)}</td></tr>)}</tbody></table></details></section>
      <section className={styles.panel}><h2>{t('Menu languages', 'لغات القائمة')}</h2>{report.languages.length ? <table><thead><tr><th scope="col">{t('Language', 'اللغة')}</th><th scope="col">{t('Views', 'المشاهدات')}</th></tr></thead><tbody>{report.languages.map(row => <tr key={row.language}><td>{row.language === 'ar' ? 'العربية' : row.language === 'en' ? 'English' : row.language}</td><td>{number(row.views)}</td></tr>)}</tbody></table> : <p>{t('Language totals will appear after aggregation.', 'ستظهر إجماليات اللغات بعد التجميع.')}</p>}</section></div>
    <p>{t('Counts represent events, not unique visitors. Known bots, previews, signed-in editors and opt-out signals are excluded. Existing QR codes that link directly to menus count as menu views; new QR downloads use a separate redirect route. Daily buckets use UTC.', 'تمثّل الأعداد أحداثًا وليست زوارًا فريدين. تُستبعد الروبوتات المعروفة والمعاينات والمحرّرون المسجّلون وإشارات رفض التتبّع. تُحسب رموز QR القديمة ضمن مشاهدات القائمة، بينما تستخدم التنزيلات الجديدة رابط تحويل مستقل. التجميع اليومي بتوقيت UTC.')}</p>
    <p role="status">{report.updatedAt ? t(`Last aggregated: ${new Date(report.updatedAt).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC`, `آخر تجميع: ${new Date(report.updatedAt).toLocaleString('ar-KW', { timeZone: 'UTC' })} UTC`) : t('Waiting for the first aggregated events.', 'بانتظار تجميع الأحداث الأولى.')}</p>
  </div>;
}
