"use client";
import { useI18n } from '@/components/i18n/language-provider';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { catalog, colorKeys, defaultDesign, layoutOptions, templateKeys } from '@daify/menu-engine';
import type { Block, Design, MenuSnapshot, PublicationState, TemplateKey } from '@daify/menu-engine';
import type { DraftMenuSummary } from '@daify/types';
import type { Workspace } from '@/lib/workspace';
import styles from './publishing-workspace.module.css';
async function request<T>(path: string, method = 'GET', body?: object): Promise<T> {
  const response = await fetch(path, { method, headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  const result: unknown = await response.json();
  if (!response.ok) { const detail = (result as { detail?: string | string[] }).detail; throw new Error(Array.isArray(detail) ? detail.join(' ') : detail ?? 'The service is unavailable. Please retry.'); }
  return result as T;
}
const pretty = (text: string) => text.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
export function PublishingWorkspace({ workspace, initialMenus, mode, assistance = false }: { workspace: Workspace; initialMenus: DraftMenuSummary[]; mode: 'design' | 'publish'; assistance?: boolean }) {
  const { t, errorMessage, locale } = useI18n();
  const [locationId, setLocationId] = useState(workspace.locations[0]?.id ?? '');
  const [menus, setMenus] = useState(initialMenus);
  const [menuId, setMenuId] = useState('');
  const [state, setState] = useState<PublicationState | null>(null);
  const [snapshot, setSnapshot] = useState<MenuSnapshot | null>(null);
  const [design, setDesign] = useState<Design>(defaultDesign());
  const [language, setLanguage] = useState('en');
  const [width, setWidth] = useState('100%');
  const [slug, setSlug] = useState('');
  const [visibility, setVisibility] = useState<PublicationState['visibility']>('PUBLIC');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [dirty, setDirty] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const retry = useRef<{ signature: string; key: string } | null>(null);
  const base = `/api/menus/${workspace.id}/${locationId}`;
  const canDesign = workspace.membership.permissions.includes('menu.design');
  const canPublish = workspace.membership.permissions.includes('menu.publish');
  const canQr = workspace.membership.permissions.includes('qr.manage');
  const send = () => frame.current?.contentWindow?.postMessage({ type: 'daify:design', version: 1, design, language }, window.location.origin);
  useEffect(() => { frame.current?.contentWindow?.postMessage({ type: 'daify:design', version: 1, design, language }, window.location.origin); }, [design, language]);
  useEffect(() => { if (!dirty) return; const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; }; window.addEventListener('beforeunload',warn); return () => window.removeEventListener('beforeunload',warn); },[dirty]);
  async function run(action: () => Promise<void>) { setPending(true); setError(''); setMessage(''); try { await action(); } catch (error) { setError(error instanceof Error ? error.message : 'Please retry.'); } finally { setPending(false); } }
  async function open(id: string) {
    if (dirty && !window.confirm(t("Discard unsaved design changes?"))) return;
    await run(async () => {
      if (!id) { setMenuId(''); setState(null); setSnapshot(null); return; }
      const [next, snapshot] = await Promise.all([request<PublicationState>(`${base}/${id}/publication`),request<MenuSnapshot>(`${base}/${id}/preview`)]);
      setMenuId(id); setState(next); setSnapshot(snapshot); setDesign(next.design); setLanguage(snapshot.defaultLanguage); setSlug(next.publicSlug ?? `${workspace.slug}-${menus.find(menu => menu.id === id)?.slug ?? 'menu'}`.slice(0,100).replace(/-$/,'')); setVisibility(next.visibility); setDirty(false); retry.current = null;
    });
  }
  const edit = (next: Design) => { setDesign(next); setDirty(true); setMessage(''); };
  async function saveDesign() {
    await run(async () => { const next = await request<PublicationState>(`${base}/${menuId}/design`, 'PATCH', { revision: state!.revision, design }); setState(next); setDirty(false); setMessage('Design saved to your draft. Publish when you are ready.'); });
  }
  async function publish(action: 'publish' | 'unpublish' | 'rollback', extra: object = {}) {
    const body = { revision: state!.revision, ...extra }; const signature = JSON.stringify({ action, ...body });
    if (retry.current?.signature !== signature) retry.current = { signature, key: crypto.randomUUID() };
    const idempotencyKey = retry.current.key;
    await run(async () => { const next = await request<PublicationState>(`${base}/${menuId}/${action}`, 'POST', { ...body, idempotencyKey }); setState(next); setSlug(next.publicSlug ?? slug); setVisibility(next.visibility); retry.current = null; setMessage(action === 'unpublish' ? 'Menu unpublished. Your versions and QR link are preserved.' : action === 'rollback' ? 'Previous content published as a new version. Your draft is preserved.' : 'Your menu is published.'); });
  }
  const images = snapshot?.sections.flatMap(section => section.items.flatMap(item => item.images.map((image,index) => ({ id: image.id, name: `${item.translations.find(row => row.languageTag === language)?.name ?? item.translations[0]?.name ?? 'Dish'} · ${index + 1}` })))) ?? [];
  const imageSelect = (label: string, value: string | undefined, change: (id: string | undefined) => void) => <label>{t(label)}<select value={value ?? ''} onChange={event => change(event.target.value || undefined)}><option value="">{t("Use first dish image")}</option>{images.map(image => <option key={image.id} value={image.id}>{image.name}</option>)}</select></label>;
  function changeBlock(index: number, next: Partial<Block>) { edit({ ...design, blocks: design.blocks.map((block,i) => i === index ? { ...block, ...next } : block) }); }
  return <div className={styles.workspace}>
    <div className={styles.selection}><label>{t("Location")}<select value={locationId} disabled={pending} onChange={event => { const id = event.target.value; if (dirty && !window.confirm(t("Discard unsaved design changes?"))) return; void run(async () => { const next = await request<DraftMenuSummary[]>(`/api/menus/${workspace.id}/${id}`); setLocationId(id); setMenus(next); setMenuId(''); setState(null); setSnapshot(null); setDirty(false); }); }}>{workspace.locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
      <label>{t("Menu")}<select value={menuId} disabled={pending} onChange={event => { void open(event.target.value); }}><option value="">{t("Choose a menu")}</option>{menus.map(menu => <option key={menu.id} value={menu.id}>{menu.name}</option>)}</select></label>
      {state && <button disabled={pending} onClick={() => { void open(menuId); }}>{t("Reload latest")}</button>}
    </div>
    {error && <p className={styles.error} role="alert">{errorMessage(error)}</p>}{message && <p className={styles.success} role="status">{t(message)}</p>}
    {!menus.length && <p>{t("Create a menu and add dishes to get started. ")}{!assistance && <Link href="/dashboard/menus">{t("Open menus →")}</Link>}</p>}
    {state && snapshot && <div className={styles.studio}>
      <div className={styles.controls}>
        <div className={styles.tabs}>{!assistance && <><Link href="/dashboard/design">{t("Design")}</Link><Link href="/dashboard/publish">{t("QR & Publish")}</Link></>}<span>{t("Draft ")}{state.revision}</span></div>
        <fieldset disabled={pending || !canDesign}><legend>{t("Template & style")}</legend>
          <label>{t("Template")}<select value={design.templateKey} onChange={event => { const next = defaultDesign(event.target.value as TemplateKey); edit({ ...next, blocks: design.blocks, heroImageId: design.heroImageId, footerImageId: design.footerImageId }); }}>{templateKeys.map(key => <option key={key} value={key}>{catalog[key].name}</option>)}</select></label>
          <div className={styles.presets}>{Object.entries(catalog[design.templateKey].presets).map(([name,colors]) => <button key={name} onClick={() => edit({ ...design, tokens: { ...design.tokens, ...colors } })}>{t(name)}</button>)}</div>
          <details open={mode === 'design'}><summary>{t("Colors & layout")}</summary>
            <div className={styles.colors}>{colorKeys.map(key => <label key={key}>{t(pretty(key))}<input type="color" value={design.tokens[key]} onChange={event => edit({ ...design, tokens: { ...design.tokens, [key]: event.target.value } })} /></label>)}</div>
            <label>{t("Card shape")}<select value={design.tokens.cardRadius} onChange={event => edit({ ...design, tokens: { ...design.tokens, cardRadius: event.target.value } })}>{[...new Set([design.tokens.cardRadius,'0px','10px','24px'])].map(radius => <option key={radius} value={radius}>{radius === '0px' ? t("Square") : radius === '10px' ? t("Soft") : radius === '24px' ? t("Rounded") : t("Template default ({0})", {0: radius})}</option>)}</select></label>
            <label>{t("Button shape")}<select value={design.tokens.buttonRadius} onChange={event => edit({ ...design, tokens: { ...design.tokens, buttonRadius: event.target.value } })}>{[...new Set([design.tokens.buttonRadius,'0px','8px','999px'])].map(radius => <option key={radius} value={radius}>{radius === '0px' ? t("Square") : radius === '8px' ? t("Rounded") : radius === '999px' ? t("Pill") : t("Template default ({0})", {0: radius})}</option>)}</select></label>
            {Object.entries(layoutOptions).map(([key,values]) => <label key={key}>{t(pretty(key))}<select value={design.layout[key as keyof Design['layout']]} onChange={event => edit({ ...design, layout: { ...design.layout, [key]: event.target.value } })}>{values.map(value => <option key={value} value={value}>{t(pretty(value))}</option>)}</select></label>)}
          </details>
          <details><summary>{t("Photography & content")}</summary>
            {imageSelect('Cover image',design.heroImageId,id => edit({ ...design, heroImageId: id }))}
            {design.templateKey !== 'feast' && <>{imageSelect('Footer image',design.footerImageId,id => edit({ ...design, footerImageId: id }))}
              {design.blocks.map((block,index) => <div className={styles.block} key={index}><strong>{t(pretty(block.type))}</strong><div className={styles.row}><button disabled={index === 0} onClick={() => { const blocks = [...design.blocks]; [blocks[index-1],blocks[index]] = [blocks[index]!,blocks[index-1]!]; edit({ ...design, blocks }); }}>{t("Move up")}</button>{block.type !== 'menu' && <button onClick={() => edit({ ...design, blocks: design.blocks.filter((_,i) => i !== index) })}>{t("Remove")}</button>}</div>
                {block.type !== 'menu' && <label className={styles.check}><input type="checkbox" checked={block.visible} onChange={event => changeBlock(index,{ visible: event.target.checked })} />{t("Visible")}</label>}
                {block.type !== 'menu' && <>{(['heading','headingAr'] as const).map(key => <label key={key}>{key === 'headingAr' ? 'العنوان بالعربية' : t("Heading")}<input value={block[key] ?? ''} dir={key.endsWith('Ar') ? 'rtl' : 'ltr'} maxLength={160} onChange={event => changeBlock(index,{ [key]: event.target.value })} /></label>)}</>}
                {block.type === 'story' && <>{(['body','bodyAr'] as const).map(key => <label key={key}>{key === 'bodyAr' ? 'النص بالعربية' : t("Story")}<textarea value={block[key] ?? ''} dir={key.endsWith('Ar') ? 'rtl' : 'ltr'} maxLength={2000} onChange={event => changeBlock(index,{ [key]: event.target.value })} /></label>)}{imageSelect('Story image',block.imageId,id => changeBlock(index,{ imageId: id }))}<label>{t("Image position")}<select value={block.imagePosition ?? 'left'} onChange={event => changeBlock(index,{ imagePosition: event.target.value as 'left' | 'right' })}><option value="left">{t("Left")}</option><option value="right">{t("Right")}</option></select></label></>}
                {block.type === 'gallery' && <><label>{t("Gallery images")}<select multiple value={block.imageIds ?? []} onChange={event => changeBlock(index,{ imageIds: [...event.target.selectedOptions].map(option => option.value) })}>{images.map(image => <option key={image.id} value={image.id}>{image.name}</option>)}</select></label><label>{t("Columns")}<select value={block.columns ?? 3} onChange={event => changeBlock(index,{ columns: Number(event.target.value) as 2 | 3 | 4 })}>{[2,3,4].map(n => <option key={n}>{n}</option>)}</select></label></>}
              </div>)}
              <div className={styles.row}>{(['featured','story','gallery'] as const).map(type => <button key={type} disabled={design.blocks.length >= 12} onClick={() => edit({ ...design, blocks: [...design.blocks,{ type, visible: true }] })}>+ {t(pretty(type))}</button>)}</div>
            </>}
          </details>
          <button className={styles.primary} disabled={!dirty} onClick={() => { void saveDesign(); }}>{t("Save design")}</button>
        </fieldset>
        <section className={styles.publication}><h2>{t("Publish your menu")}</h2><p>{state.currentVersionId ? t("Live version {0}", {0: state.versions.find(version => version.id === state.currentVersionId)?.number ?? ""}) : t("Not published")} · {t(state.visibility.toLowerCase())}</p>
          {!state.publishingEnabled && <p>{t("Publishing is disabled for this workspace.")}</p>}
          <fieldset disabled={pending || !canPublish}><legend>{t("Public link")}</legend><label>{t("Link name")}<input value={slug} maxLength={100} pattern="[a-z0-9]+(-[a-z0-9]+)*" onChange={event => setSlug(event.target.value)} /></label><p className={styles.hint}>{t("/r/")}{slug || 'your-menu'} {t("· Previous links keep working.")}</p>
            <label>{t("Visibility")}<select value={visibility} onChange={event => setVisibility(event.target.value as PublicationState['visibility'])}><option value="PUBLIC">{t("Public")}</option><option value="UNLISTED">{t("Unlisted — exclude from search engines")}</option><option value="PRIVATE">{t("Private — visible only in your workspace")}</option></select></label>
            <button className={styles.primary} disabled={dirty || !state.publishingEnabled || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)} onClick={() => { void publish('publish',{ slug, visibility }); }}>{t("Publish menu")}</button>
            {dirty && <p>{t("Save the design before publishing.")}</p>}
            {state.currentVersionId && <button onClick={() => { void publish('unpublish'); }}>{t("Unpublish")}</button>}
          </fieldset>
          {state.publicSlug && <div className={styles.links}><a href={`/r/${state.publicSlug}`} target="_blank" rel="noreferrer">{t("Open public menu ↗")}</a>{canQr && <><a href={`/api/menu-qr/${workspace.id}/${locationId}/${menuId}`} download>{t("Download QR · SVG")}</a><a href={`/api/menu-qr/${workspace.id}/${locationId}/${menuId}?format=png`} download>{t("Download QR · PNG")}</a></>}</div>}
          <h3>{t("Version history")}</h3>{!state.versions.length && <p>{t("Your first publication will appear here.")}</p>}
          <ol className={styles.history}>{state.versions.map(version => <li key={version.id}><div><strong>{t("Version ")}{version.number}{version.id === state.currentVersionId ? t(" · Live") : ''}</strong><small>{new Date(version.publishedAt).toLocaleString(locale === "ar" ? "ar-KW" : "en-GB")} {t("· Draft ")}{version.sourceDraftRevision}{version.rollbackSourceId ? t(" · Restored content") : ''}</small></div>{canPublish && <button disabled={pending || dirty || !state.publishingEnabled || version.id === state.currentVersionId} onClick={() => { void publish('rollback',{ versionId: version.id }); }}>{t("Restore version ")}{version.number}</button>}</li>)}</ol>
        </section>
      </div>
      <section className={styles.preview}><div className={styles.previewTools}><strong>{t("Draft preview")}</strong><label>{t("Language")}<select value={language} onChange={event => setLanguage(event.target.value)}>{snapshot.supportedLanguages.map(language => <option key={language}>{language}</option>)}</select></label><label>{t("Preview size")}<select value={width} onChange={event => setWidth(event.target.value)}><option value="100%">{t("Desktop")}</option><option value="768px">{t("Tablet")}</option><option value="390px">{t("Mobile")}</option></select></label></div>
        <iframe ref={frame} title={t("Menu preview")} src={`/menu-preview/${workspace.id}/${locationId}/${menuId}`} onLoad={send} style={{ width, maxWidth: '100%' }} />
      </section>
    </div>}
  </div>;
}
