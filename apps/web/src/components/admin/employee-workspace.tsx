'use client';
import { useI18n, LanguageSwitcher } from '@/components/i18n/language-provider';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { DaifyLogo } from '@/components/brand/daify-logo';
import styles from './admin-workspace.module.css';
import { labels, roles } from '@/lib/staff-labels';

type Role = 'MANAGER' | 'SUPERVISOR' | 'SUPPORT' | 'SALES';
type Employee = { id: string; userId: string | null; email: string; role: Role; status: 'INVITED' | 'ACTIVE' | 'SUSPENDED'; permissions: string[]; allOrganizations: boolean; organizationIds: string[]; version: number; invitationExpiresAt: string };
type Directory = { employees: Employee[]; nextCursor: string | null; owner: boolean; actorPermissions: string[]; allOrganizations: boolean; organizationIds: string[]; presets: Record<Role, string[]> };
type Customer = { id: string; name: string; slug: string; status: string };
const groups = [
  { name: ['People & customers', 'الموظفون والعملاء'], keys: ['staff.manage', 'customers.read', 'customers.manage', 'users.read', 'users.manage'] },
  { name: ['Menus & support', 'القوائم والدعم'], keys: ['menus.read', 'menus.edit', 'menus.publish', 'support.manage', 'templates.read'] },
  { name: ['Billing & audit', 'الاشتراكات والتدقيق'], keys: ['billing.read', 'billing.manage', 'audit.read', 'offers.read', 'offers.create', 'offers.approve', 'discounts.manage'] },
];
async function api<T>(path: string, reason: string, method = 'GET', body?: object): Promise<T> {
  const response = await fetch(`/api/platform/${path}`, { method, headers: { 'content-type': 'application/json', 'x-support-reason': `uri:${encodeURIComponent(reason)}` }, ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(Array.isArray(data.detail) ? data.detail.join(' ') : data.detail ?? 'The request could not be completed.');
  return data as T;
}
export function EmployeeWorkspace({ email, owner, role }: { email: string; owner: boolean; role: string }) {
  const [reason, setReason] = useState(''), [accessReason, setAccessReason] = useState('');
  const [directory, setDirectory] = useState<Directory | null>(null), [customers, setCustomers] = useState<Customer[]>([]);
  const [pending, setPending] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [editing, setEditing] = useState<Employee | 'new' | null>(null), [address, setAddress] = useState(''), [staffRole, setRole] = useState<Role>('SUPPORT');
  const [permissions, setPermissions] = useState<string[]>([]), [all, setAll] = useState(false), [ids, setIds] = useState<string[]>([]);
  const [status, setStatus] = useState<Employee['status']>('INVITED'), [changeReason, setChangeReason] = useState(''), [review, setReview] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const { t, arabic, errorMessage } = useI18n();
  const statusLabel = (value: string) => ({ INVITED: t('Invited', 'بانتظار قبول الدعوة'), ACTIVE: t('Active', 'نشط'), SUSPENDED: t('Suspended', 'موقوف') })[value as Employee['status']] ?? value;
  const eligibleRoles = (Object.keys(roles) as Role[]).filter(r => owner || (role === 'MANAGER' ? r !== 'MANAGER' : ['SUPPORT', 'SALES'].includes(r)));
  function permitted(permission: string, nextRole = staffRole) {
    return (!permission.startsWith('offers.') && permission !== 'discounts.manage' || nextRole === 'MANAGER' || nextRole === 'SALES' && ['offers.read', 'offers.create'].includes(permission)) && Boolean(directory?.actorPermissions.includes(permission)) && (nextRole !== 'SALES' || ['customers.read', 'billing.read', 'templates.read', 'offers.read', 'offers.create'].includes(permission)) && (!['SUPPORT', 'SALES'].includes(nextRole) || permission !== 'staff.manage');
  }
  async function run(action: () => Promise<void>) { setPending(true); setError(''); setMessage(''); try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Please retry.'); } finally { setPending(false); } }
  async function load(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const value = reason.trim();
      const data = await api<Directory>('staff?limit=100', value);
      const organizations: Customer[] = [];
      let after = '';
      do {
        const page = await api<Customer[]>(`organizations?limit=100${after ? `&after=${after}` : ''}`, value);
        organizations.push(...page); after = page.length === 100 ? page.at(-1)!.id : '';
      } while (after);
      setDirectory(data); setCustomers(organizations); setAccessReason(value); setEditing(null);
    });
  }
  function open(employee: Employee | 'new') {
    setEditing(employee); setReview(false); setError(''); setMessage(''); setChangeReason(''); setCustomerSearch('');
    if (employee === 'new') { setAddress(''); setRole('SUPPORT'); setPermissions((directory?.presets.SUPPORT ?? []).filter(p => permitted(p, 'SUPPORT'))); setAll(false); setIds([]); setStatus('INVITED'); }
    else { setAddress(employee.email); setRole(employee.role); setPermissions(employee.permissions); setAll(employee.allOrganizations); setIds(employee.organizationIds); setStatus(employee.status); }
  }
  function changeRole(next: Role) { setRole(next); setPermissions((directory?.presets[next] ?? []).filter(p => permitted(p, next))); setReview(false); }
  function toggle(permission: string, checked: boolean) {
    const selected = new Set(permissions);
    if (checked) {
      selected.add(permission);
      if (['offers.read', 'offers.create', 'offers.approve'].includes(permission)) selected.add('customers.read');
      if (['offers.create', 'offers.approve'].includes(permission)) selected.add('offers.read');
      if (permission === 'discounts.manage') { selected.add('staff.manage'); selected.add('customers.read'); selected.add('offers.read'); }
      if (['menus.read', 'menus.edit', 'menus.publish', 'staff.manage', 'customers.manage'].includes(permission)) selected.add('customers.read');
      if (['menus.edit', 'menus.publish'].includes(permission)) selected.add('menus.read');
      if (permission === 'menus.publish') selected.add('menus.edit');
    } else {
      selected.delete(permission);
      if (permission === 'customers.read') ['menus.read', 'menus.edit', 'menus.publish', 'staff.manage', 'customers.manage', 'offers.read', 'offers.create', 'offers.approve', 'discounts.manage'].forEach(p => selected.delete(p));
      if (permission === 'offers.read') ['offers.create', 'offers.approve', 'discounts.manage'].forEach(p => selected.delete(p));
      if (permission === 'staff.manage') selected.delete('discounts.manage');
      if (permission === 'menus.read') ['menus.edit', 'menus.publish'].forEach(p => selected.delete(p));
      if (permission === 'menus.edit') selected.delete('menus.publish');
    }
    setPermissions([...selected]); setReview(false);
  }
  async function save() {
    await run(async () => {
      const payload = { role: staffRole, permissions, allOrganizations: all, organizationIds: all ? [] : ids, reason: changeReason.trim() };
      if (editing === 'new') await api<Employee>('staff', accessReason, 'POST', { ...payload, email: address.trim() });
      else if (editing) await api<Employee>(`staff/${editing.id}`, accessReason, 'PATCH', { ...payload, expectedVersion: editing.version, status });
      setDirectory(await api<Directory>('staff?limit=100', accessReason)); setEditing(null); setReview(false);
      setMessage('saved');
    });
  }
  return <main id="main-content" className={styles.workspace} lang={arabic ? 'ar' : 'en'} dir={arabic ? 'rtl' : 'ltr'}>
    <header className={styles.heading}><div><DaifyLogo /><h1>{t('Employees & permissions.', 'الموظفون والصلاحيات.')}</h1><p>{email} · {owner ? t('Owner', 'المالك') : t('Employee management', 'إدارة الموظفين')}</p></div><div className={styles.tools}><Link href="/admin">{t('Platform workspace', 'إدارة المنصة')}</Link><LanguageSwitcher /></div></header>
    <section className={styles.panel}><h2>{t('Your team, with clear boundaries.', 'فريقك، بصلاحيات واضحة.')}</h2><p>{t('Only the Owner appoints Managers. Managers can appoint Supervisors and other employees. Nobody can grant permissions or customer access beyond their own. Sales cannot edit or publish client menus.', 'المالك وحده يعيّن المديرين. يمكن للمديرين تعيين المشرفين وباقي الموظفين. لا يمكن منح صلاحيات أو وصول إلى عملاء يتجاوز صلاحيات المانح. لا يمكن للمبيعات تعديل قوائم العملاء أو نشرها.')}</p>
      <form className={styles.filters} onSubmit={load}><label className={styles.field}>{t('Reason for accessing employee records', 'سبب الاطلاع على سجلات الموظفين')}<input required minLength={10} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label><button className={styles.primary} disabled={pending}>{t('Load employees', 'عرض الموظفين')}</button></form></section>
    {error && <p role="alert" className={styles.error}>{errorMessage(error)} {t('If an invitation email failed, reload employees before retrying: the invitation may already be saved.', 'إذا فشل إرسال الدعوة، أعد تحميل الموظفين قبل المحاولة؛ فقد تكون الدعوة محفوظة.')}</p>}{message && <p role="status" className={styles.success}>{t('Employee access saved. Invitations require email verification and MFA. Changes to existing access end current sessions.', 'تم حفظ صلاحيات الموظف. تتطلب الدعوات التحقق من البريد والمصادقة الثنائية. تعديل الصلاحيات ينهي الجلسات الحالية.')}</p>}
    {directory && <section className={styles.panel} aria-busy={pending}><div className={styles.heading}><h2>{t('Employees', 'الموظفون')}</h2><button className={styles.primary} disabled={pending} onClick={() => open('new')}>{t('Invite employee', 'دعوة موظف')}</button></div>
      {owner && <p>{t('Your Owner access is managed separately and cannot be changed on this page.', 'صلاحياتك كمالك تُدار بشكل منفصل ولا يمكن تعديلها من هذه الصفحة.')}</p>}
      {!directory.employees.length ? <p>{t('No employees on this page yet.', 'لا يوجد موظفون في هذه الصفحة بعد.')}</p> : <ul className={styles.list}>{directory.employees.map(employee => <li className={styles.row} key={employee.id}><div><strong>{employee.email}</strong><p>{roles[employee.role][arabic ? 1 : 0]} · {statusLabel(employee.status)} · {employee.permissions.length} {t('permissions', 'صلاحيات')}</p><small>{employee.allOrganizations ? t('All customers', 'جميع العملاء') : `${employee.organizationIds.length} ${t('assigned customers', 'عملاء معينين')}`}</small></div><button disabled={pending || employee.email === email} onClick={() => open(employee)}>{employee.email === email ? t('Your access', 'صلاحياتك') : t('Edit permissions', 'تعديل الصلاحيات')}</button></li>)}</ul>}
      {directory.nextCursor && <button disabled={pending} onClick={() => void run(async () => { const next = await api<Directory>(`staff?limit=100&after=${directory.nextCursor}`, accessReason); setDirectory({ ...next, employees: [...directory.employees, ...next.employees] }); })}>{t('Load more', 'عرض المزيد')}</button>}
    </section>}
    {editing && directory && <form className={`${styles.panel} ${styles.confirmation}`} onSubmit={event => { event.preventDefault(); setReview(true); }}>
      <h2>{editing === 'new' ? t('Invite an employee', 'دعوة موظف') : t('Customize employee access', 'تخصيص صلاحيات الموظف')}</h2>
      <fieldset disabled={pending || review}><div className={styles.filters}><label className={styles.field}>{t('Employee email', 'بريد الموظف')}<input type="email" required disabled={editing !== 'new'} maxLength={320} value={address} onChange={e => setAddress(e.target.value)} /></label><label className={styles.field}>{t('Role preset', 'الدور الأساسي')}<select value={staffRole} onChange={e => changeRole(e.target.value as Role)}>{eligibleRoles.map(r => <option key={r} value={r}>{roles[r][arabic ? 1 : 0]}</option>)}</select></label>
      {editing !== 'new' && <label className={styles.field}>{t('Access status', 'حالة الوصول')}<select value={status} onChange={e => setStatus(e.target.value as Employee['status'])}>{(editing.userId ? ['ACTIVE', 'SUSPENDED'] : ['INVITED', 'SUSPENDED']).map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></label>}</div>
      <p>{t('Choosing a role loads its starting permissions. Customize the checkboxes below before saving.', 'اختيار الدور يحمّل صلاحياته الأساسية. خصّص الخيارات أدناه قبل الحفظ.')}</p>
      <div className={styles.permissionGrid}>{groups.map(group => <fieldset key={group.name[0]}><legend>{group.name[arabic ? 1 : 0]}</legend>{group.keys.map(permission => <label key={permission} className={styles.permission}><input type="checkbox" checked={permissions.includes(permission)} disabled={!permitted(permission) || (!all && ['users.read', 'users.manage', 'audit.read'].includes(permission))} onChange={e => toggle(permission, e.target.checked)} /><span>{labels[permission]![arabic ? 1 : 0]}</span></label>)}</fieldset>)}</div>
      <fieldset><legend>{t('Customer access', 'الوصول إلى العملاء')}</legend><label className={styles.permission}><input type="checkbox" disabled={!directory.allOrganizations} checked={all} onChange={e => { setAll(e.target.checked); if (!e.target.checked) setPermissions(previous => previous.filter(p => !['users.read', 'users.manage', 'audit.read'].includes(p))); }} />{t('All customers', 'جميع العملاء')}</label>
        {!all && <><label className={styles.field}>{t('Find customers', 'البحث عن عميل')}<input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} /></label><div className={styles.customerChoices}>{customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.slug.includes(customerSearch)).map(customer => <label key={customer.id} className={styles.permission}><input type="checkbox" checked={ids.includes(customer.id)} onChange={e => setIds(e.target.checked ? [...ids, customer.id] : ids.filter(id => id !== customer.id))} />{customer.name}</label>)}</div><p>{t('No selected customers means no access to customer records.', 'عدم اختيار عملاء يعني عدم الوصول إلى سجلات العملاء.')}</p></>}
      </fieldset>
      <label className={styles.field}>{t('Reason for this change', 'سبب هذا التغيير')}<textarea required minLength={10} maxLength={500} value={changeReason} onChange={e => setChangeReason(e.target.value)} /></label></fieldset>
      {review ? <section aria-label={t('Review permissions', 'مراجعة الصلاحيات')}><h3>{t('Review before saving', 'راجع قبل الحفظ')}</h3><p>{address} · {roles[staffRole][arabic ? 1 : 0]} · {statusLabel(status)}</p><ul>{permissions.map(p => <li key={p}>{labels[p]?.[arabic ? 1 : 0] ?? p}</li>)}</ul><p>{all ? t('Access to all customers', 'الوصول إلى جميع العملاء') : `${ids.length} ${t('assigned customers', 'عملاء معينين')}`}</p><div className={styles.tools}><button type="button" className={styles.primary} disabled={pending} onClick={() => void save()}>{t('Confirm and save', 'تأكيد وحفظ')}</button><button type="button" disabled={pending} onClick={() => setReview(false)}>{t('Back to editing', 'العودة للتعديل')}</button></div></section> : <button className={styles.primary} disabled={pending}>{t('Review changes', 'مراجعة التغييرات')}</button>}
      <button type="button" disabled={pending} onClick={() => setEditing(null)}>{t('Cancel', 'إلغاء')}</button>
    </form>}
  </main>;
}
