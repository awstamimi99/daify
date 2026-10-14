import { catalog, designImageIds, isRtl, languageFor, normalize, parsePreviewMessage, renderMarkup } from '@daify/menu-engine';
import type { MenuSnapshot } from '@daify/menu-engine';
const data = JSON.parse(document.getElementById('menu-data')!.textContent!) as { snapshot: MenuSnapshot; imageBase: string; preview: boolean; analytics?: { slug: string; versionId: string } };
const root = document.getElementById('menu-root')!;
const counted = new Set<string>();
function track(kind: string, targetId?: string, language = document.documentElement.lang) {
  const key = `${kind}:${targetId ?? ''}:${language}`;
  if (data.preview || !data.analytics || document.visibilityState !== 'visible' || navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl || counted.has(key)) return;
  counted.add(key);
  void fetch(`/api/analytics/events/${data.analytics.slug}`, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: crypto.randomUUID(), versionId: data.analytics.versionId, kind, language, ...(targetId ? { targetId } : {}) }) }).catch(() => { /* Best-effort counts never interrupt a menu. */ });
}
track('MENU_VIEW');
document.addEventListener('visibilitychange', () => track('MENU_VIEW'));
if (!data.preview && data.analytics) {
  const sections = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) track('SECTION_VIEW', entry.target.id); }, { threshold: 0.25 });
  root.querySelectorAll('[data-menu-section]').forEach(section => sections.observe(section));
}
let observer: IntersectionObserver | undefined;
function observe() {
  observer?.disconnect();
  observer = new IntersectionObserver(entries => { const visible = entries.find(entry => entry.isIntersecting); if (!visible) return; document.querySelectorAll<HTMLAnchorElement>('[data-section-link]').forEach(link => { const active = link.dataset.sectionLink === visible.target.id; link.classList.toggle('active', active); if (active) link.setAttribute('aria-current','true'); else link.removeAttribute('aria-current'); }); }, { rootMargin: '-15% 0px -65% 0px' });
  root.querySelectorAll('[data-menu-section]').forEach(section => observer!.observe(section));
}
observe();
document.addEventListener('input', event => {
  if (!(event.target instanceof HTMLInputElement) || !event.target.matches('[data-menu-search]')) return;
  const search = event.target.value.toLocaleLowerCase().trim(); let count = 0;
  root.querySelectorAll<HTMLElement>('[data-menu-item]').forEach(item => { item.hidden = !(item.dataset.search ?? '').includes(search); if (!item.hidden) count++; });
  root.querySelectorAll<HTMLElement>('[data-menu-section]').forEach(section => { section.hidden = !section.querySelector('[data-menu-item]:not([hidden])'); });
  const empty = root.querySelector<HTMLElement>('.menu-empty'); if (empty) empty.hidden = count > 0;
});
document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;
  const languageLink = event.target.closest<HTMLAnchorElement>('.menu-language a');
  if (languageLink && languageLink.lang !== document.documentElement.lang) track('LANGUAGE_CHANGE', undefined, languageLink.lang);
  const analyticsItem = event.target.closest<HTMLElement>('[data-analytics-item], [data-detail-id]');
  if (analyticsItem) track('ITEM_VIEW', analyticsItem.dataset.analyticsItem ?? analyticsItem.dataset.detailId);
  const dialog = root.querySelector<HTMLDialogElement>('[data-item-sheet]');
  if (!dialog) return;
  if (event.target.closest('[data-sheet-close]') || event.target === dialog) { dialog.close(); return; }
  const item = event.target.closest<HTMLElement>('[data-detail-id]'); if (!item) return;
  for (const [selector,key] of [['[data-sheet-name]','detailName'],['[data-sheet-desc]','detailDesc'],['[data-sheet-price]','detailPrice']] as const) dialog.querySelector(selector)!.textContent = item.dataset[key] ?? '';
  const media = dialog.querySelector('[data-sheet-media]')!; media.replaceChildren();
  if (item.dataset.detailImage) { const image = document.createElement('img'); image.src = item.dataset.detailImage; image.alt = ''; media.append(image); }
  dialog.querySelector('[data-sheet-tags]')!.textContent = [item.dataset.detailBadge, item.dataset.detailDietary, item.dataset.detailAvailable === 'false' ? (isRtl(document.documentElement.lang) ? 'غير متوفر' : 'Unavailable') : ''].filter(Boolean).join(' · ');
  dialog.showModal();
});
if (data.preview) window.addEventListener('message', event => {
  if (window.parent === window || event.source !== window.parent || event.origin !== window.location.origin) return;
  const message = parsePreviewMessage(event.data); if (!message) return;
  const ids = new Set(data.snapshot.sections.flatMap(section => section.items.flatMap(item => item.images.map(image => image.id))));
  if (designImageIds(message.design).some(id => !ids.has(id))) return;
  const snapshot = { ...data.snapshot, design: message.design }, language = languageFor(snapshot, message.language);
  document.documentElement.lang = language; document.documentElement.dir = isRtl(language) ? 'rtl' : 'ltr';
  const style = document.querySelector<HTMLLinkElement>('[data-template-css]')!;
  style.href = `/menu-assets/${message.design.templateKey}.css`;
  document.querySelector<HTMLLinkElement>('[data-polish-css]')!.disabled = catalog[message.design.templateKey].family === 'feast';
  root.innerHTML = renderMarkup(normalize(snapshot, language, id => `${data.imageBase}/${id}`), message.design, language);
  observe();
});
