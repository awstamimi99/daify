"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button, Card, TextField } from "@daify/ui";
import type { DraftItem, DraftMenu, DraftMenuSummary, DraftSection, DraftTranslation } from "@daify/types";
import type { Workspace } from "@/lib/workspace";
import styles from "./menu-workspace.module.css";

const subscribe = () => () => {};
const ready = () => true;
const notReady = () => false;
const value = (data: FormData, key: string) => String(data.get(key) ?? "");
const tags = (text: string) => text.split(",").map(part => part.trim()).filter(Boolean);
const label = (rows: DraftTranslation[], language: string, fallback: string) => rows.find(row => row.languageTag === language)?.name || rows.find(row => row.languageTag === fallback)?.name || "Untitled";
const direction = (language: string) => ["ar", "he", "fa", "ur"].includes(language.split("-")[0]!) ? "rtl" : "ltr";
function translationData(data: FormData, languages: string[]) { return languages.map(languageTag => ({ languageTag, name: value(data, `name:${languageTag}`), description: value(data, `description:${languageTag}`) })); }
function TranslationFields({ languages, rows = [] }: { languages: string[]; rows?: DraftTranslation[] }) {
  return <div className={styles.translations}>{languages.map(language => {
    const row = rows.find(item => item.languageTag === language);
    return <fieldset key={language} className={styles.language}><legend>{language === "ar" ? "العربية" : language === "en" ? "English" : language}</legend>
      <TextField label={`Name (${language})`} name={`name:${language}`} dir={direction(language)} defaultValue={row?.name ?? ""} maxLength={160} />
      <label className={styles.field}>Description ({language})<textarea name={`description:${language}`} dir={direction(language)} defaultValue={row?.description ?? ""} maxLength={2000} rows={3} /></label>
    </fieldset>;
  })}</div>;
}

export function MenuWorkspace({ workspace, initialMenus }: { workspace: Workspace; initialMenus: DraftMenuSummary[] }) {
  const hydrated = useSyncExternalStore(subscribe, ready, notReady);
  const [locationId, setLocationId] = useState(workspace.locations[0]?.id ?? "");
  const [menus, setMenus] = useState(initialMenus);
  const [draft, setDraft] = useState<DraftMenu | null>(null);
  const [language, setLanguage] = useState(workspace.locations[0]?.defaultLanguage ?? "en");
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const dirtyForms = useRef(new Set<HTMLFormElement>());
  const discardOthers = (form?: HTMLFormElement) => ![...dirtyForms.current].some(value => value !== form) || window.confirm("Saving will replace unsaved edits in other forms. Continue?");
  const canEdit = workspace.membership.permissions.includes("menu.edit");
  const canAvailability = workspace.membership.permissions.includes("menu.availability");
  const location = workspace.locations.find(item => item.id === locationId);
  const base = `/api/menus/${workspace.id}/${locationId}`;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function request(path: string, method = "GET", body?: object) {
    const response = await fetch(path, { method, headers: method === "GET" ? undefined : { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
    const result: unknown = await response.json();
    if (!response.ok) {
      const detail = (result as { detail?: string | string[] }).detail;
      throw new Error(Array.isArray(detail) ? detail.join(" ") : detail ?? "Your changes could not be saved.");
    }
    return result;
  }
  async function run(action: () => Promise<void>) {
    setPending(true); setError(null); setMessage("");
    try { await action(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "The service is unavailable. Please retry."); }
    finally { setPending(false); }
  }
  const canLeave = () => !dirty || window.confirm("Leave these unsaved edits?");
  async function open(id: string) {
    if (!canLeave()) return;
    await run(async () => { const result = await request(`${base}/${id}`) as DraftMenu; setDraft(result); setLanguage(result.defaultLanguage); setDirty(false); dirtyForms.current.clear(); setCreating(false); });
  }
  async function save(path: string, body: object, method = "PATCH", form?: HTMLFormElement) {
    if (!discardOthers(form)) return;
    await run(async () => {
      const result = await request(`${base}/${draft!.id}${path}`, method, { ...body, revision: draft!.draftRevision }) as DraftMenu;
      setDraft(result); setDirty(false); dirtyForms.current.clear(); setMessage("Changes saved.");
      if (!result.supportedLanguages.includes(language)) setLanguage(result.defaultLanguage);
    });
  }
  async function back() {
    if (!canLeave()) return;
    await run(async () => { setMenus(await request(base) as DraftMenuSummary[]); setDraft(null); setCreating(false); setDirty(false); dirtyForms.current.clear(); });
  }
  async function createMenu(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const languages = value(data, "languages").split(","); const name = value(data, "name");
    await run(async () => {
      const created = await request(base, "POST", { name, slug: value(data, "slug"), defaultLanguage: languages[0], supportedLanguages: languages, translations: [{ languageTag: languages[0], name, description: "" }] }) as DraftMenu;
      setDraft(created); setLanguage(created.defaultLanguage); setCreating(false); setDirty(false); dirtyForms.current.clear(); setMessage("Menu created. Add your first section below.");
    });
  }
  async function saveSection(event: React.FormEvent<HTMLFormElement>, section?: DraftSection) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    await save(`/sections${section ? `/${section.id}` : ""}`, { translations: translationData(data, draft!.supportedLanguages), isVisible: data.get("isVisible") === "on" }, section ? "PATCH" : "POST", event.currentTarget);
  }
  async function saveItem(event: React.FormEvent<HTMLFormElement>, sectionId: string, item?: DraftItem) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    await save(item ? `/items/${item.id}` : `/sections/${sectionId}/items`, { translations: translationData(data, draft!.supportedLanguages), price: value(data, "price"), sectionId: value(data, "sectionId") || sectionId, position: Number(value(data, "position") || 0), isAvailable: data.get("isAvailable") === "on", isFeatured: data.get("isFeatured") === "on", allergens: tags(value(data, "allergens")), dietaryTags: tags(value(data, "dietaryTags")) }, item ? "PATCH" : "POST", event.currentTarget);
  }
  async function upload(event: React.FormEvent<HTMLFormElement>, item: DraftItem) {
    event.preventDefault(); if (!discardOthers(event.currentTarget)) return; const data = new FormData(event.currentTarget); const file = data.get("image") as File;
    if (!file?.size || file.size > 2 * 1024 * 1024) { setError("Choose an image up to 2 MB."); return; }
    await run(async () => {
      const encoded = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]!); reader.onerror = () => reject(new Error("The file could not be read.")); reader.readAsDataURL(file); });
      const result = await request(`${base}/${draft!.id}/items/${item.id}/images`, "POST", { revision: draft!.draftRevision, mimeType: file.type, data: encoded, translations: draft!.supportedLanguages.map(languageTag => ({ languageTag, altText: value(data, `alt:${languageTag}`) })) }) as DraftMenu;
      setDraft(result); setDirty(false); dirtyForms.current.clear(); setMessage("Image saved.");
    });
  }
  function itemForm(section: DraftSection, item?: DraftItem) {
    return <form aria-label={item ? `Edit item ${label(item.translations, language, draft!.defaultLanguage)}` : `Add item to ${label(section.translations, language, draft!.defaultLanguage)}`} method="post" onSubmit={event => void saveItem(event, section.id, item)} className={styles.form}>
      <TranslationFields languages={draft!.supportedLanguages} rows={item?.translations} />
      <div className={styles.grid}><TextField label={`Price (${draft!.currency})`} name="price" inputMode="decimal" defaultValue={item?.price ?? "0"} pattern="(0|[1-9][0-9]{0,8})(\.[0-9]{1,3})?" required />
        <label className={styles.field}>Section<select name="sectionId" defaultValue={item?.sectionId ?? section.id}>{draft!.sections.map(value => <option key={value.id} value={value.id}>{label(value.translations, language, draft!.defaultLanguage)}</option>)}</select></label>
        <TextField label="Position (starts at 0)" name="position" type="number" min={0} max={1000} defaultValue={item?.position ?? section.items.length} />
      </div>
      <div className={styles.grid}><TextField label="Allergens (comma separated)" name="allergens" defaultValue={item?.allergens.join(", ") ?? ""} /><TextField label="Dietary tags (comma separated)" name="dietaryTags" defaultValue={item?.dietaryTags.join(", ") ?? ""} /></div>
      <div className={styles.actions}><label className={styles.check}><input type="checkbox" name="isAvailable" defaultChecked={item?.isAvailable ?? true} /> Available</label><label className={styles.check}><input type="checkbox" name="isFeatured" defaultChecked={item?.isFeatured ?? false} /> Featured</label></div>
      <Button type="submit">{item ? "Save item" : "Add item"}</Button>
    </form>;
  }
  if (!location) return <Card className={styles.panel}><h2>Add a location first.</h2><p>Open your workspace overview to create a restaurant location, or ask an owner to assign one.</p></Card>;
  return <div className={styles.stack}>
    {error ? <div role="alert" className={styles.error}><p>{error}</p>{draft ? <p>Your form values remain here. Copy any unsaved changes before using “Reload latest draft”.</p> : null}</div> : null}
    {message ? <p role="status" className={styles.success}>{message}</p> : null}
    <fieldset disabled={!hydrated || pending} className={styles.controls} aria-busy={pending}>
      <div className={styles.toolbar}>
        <label className={styles.field}>Location<select value={locationId} onChange={event => { const id = event.target.value; if (!canLeave()) return; void run(async () => { const result = await request(`/api/menus/${workspace.id}/${id}`) as DraftMenuSummary[]; setLocationId(id); setMenus(result); setDraft(null); setDirty(false); dirtyForms.current.clear(); setCreating(false); }); }}>{workspace.locations.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></label>
        {draft ? <div className={styles.actions}><Button variant="secondary" onClick={() => void back()}>All menus</Button><Button variant="secondary" onClick={() => void open(draft.id)}>Reload latest draft</Button></div> : canEdit ? <Button onClick={() => { if (!canLeave()) return; setCreating(!creating); setDirty(false); dirtyForms.current.clear(); }}>{creating ? "Cancel" : "Create menu"}</Button> : <span className={styles.badge}>{canAvailability ? "Availability access" : "Read-only access"}</span>}
      </div>
      <div onChange={event => { const form = (event.target as HTMLElement).closest("form"); if (form) { dirtyForms.current.add(form); setDirty(true); } }}>
      {!draft ? creating ? <Card className={styles.panel}><h2>A new menu.</h2><form aria-label="Create menu" method="post" onSubmit={event => void createMenu(event)} className={styles.form}>
        <TextField label="Menu name" name="name" required minLength={2} maxLength={160} /><TextField label="Short name" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={100} />
        <label className={styles.field}>Languages<select name="languages" defaultValue={location.defaultLanguage === "ar" ? "ar" : "en"}><option value="en">English</option><option value="ar">العربية</option><option value="en,ar">English + العربية</option></select></label>
        <Button type="submit">Create draft</Button>
      </form></Card> : <div className={styles.menuGrid}>{menus.length ? menus.map(menu => <Card key={menu.id} className={styles.menuCard}><span className={styles.badge}>Draft</span><h2 dir="auto">{menu.name}</h2><p>{menu.supportedLanguages.join(" · ")} · Last saved {new Date(menu.updatedAt).toLocaleDateString()}</p><Button variant="secondary" onClick={() => void open(menu.id)}>Open {menu.name}</Button></Card>) : <Card className={styles.panel}><h2>Your first menu starts here.</h2><p>{canEdit ? "Create a menu, then add sections and dishes. Your work is saved to your restaurant workspace." : "There are no menus at this location yet."}</p></Card>}</div> : <div key={draft.draftRevision} className={styles.stack}>
        <Card className={styles.panel}><div className={styles.toolbar}><div><span className={styles.badge}>Draft · Saved version {draft.draftRevision}</span><h2 dir="auto">{draft.name}</h2><p>These changes are private. Publishing will be available in the next stage.</p></div><label className={styles.field}>View language<select value={language} onChange={event => { event.stopPropagation(); setLanguage(event.target.value); }}>{draft.supportedLanguages.map(locale => <option key={locale}>{locale}</option>)}</select></label></div>
          <div className={styles.completeness} aria-label="Translation completeness">{draft.completeness.languages.map(row => <div key={row.languageTag}><strong>{row.languageTag}</strong><span>{row.complete ? "Required names complete" : `${row.missingRequired.length} required names missing`}</span><small>{row.missingOptional.length} optional descriptions or image texts missing</small></div>)}</div>
          {canEdit ? <details><summary>Menu settings and translations</summary><form aria-label="Menu settings" method="post" className={styles.form} onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); void save("", { name: value(data, "menuName"), slug: value(data, "slug"), defaultLanguage: value(data, "defaultLanguage"), supportedLanguages: tags(value(data, "languages")), translations: translationData(data, draft.supportedLanguages).filter(row => tags(value(data, "languages")).includes(row.languageTag)) }, "PATCH", event.currentTarget); }}>
            <div className={styles.grid}><TextField label="Internal menu name" name="menuName" defaultValue={draft.name} required minLength={2} maxLength={160} /><TextField label="Short name" name="slug" defaultValue={draft.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={100} /></div>
            <TextField label="Enabled languages (comma separated)" name="languages" defaultValue={draft.supportedLanguages.join(", ")} required hint="For example en, ar. Save to add translation fields for a new language." />
            <label className={styles.field}>Default language<select name="defaultLanguage" defaultValue={draft.defaultLanguage}>{draft.supportedLanguages.map(locale => <option key={locale}>{locale}</option>)}</select></label>
            <TranslationFields languages={draft.supportedLanguages} rows={draft.translations} /><Button type="submit">Save menu settings</Button>
          </form></details> : null}
        </Card>
        {draft.sections.map((section, index) => <Card key={section.id} className={styles.panel}>
          <div className={styles.toolbar}><div><span className={styles.eyebrow}>Section {index + 1}{!section.isVisible ? " · Hidden" : ""}</span><h2 dir={direction(language)}>{label(section.translations, language, draft.defaultLanguage)}</h2><p>{section.items.length} {section.items.length === 1 ? "item" : "items"}</p></div>
            {canEdit ? <div className={styles.actions}><Button variant="secondary" disabled={index === 0} onClick={() => void save(`/sections/${section.id}`, { translations: section.translations.filter(row => draft.supportedLanguages.includes(row.languageTag)), isVisible: section.isVisible, position: index - 1 })}>Move up</Button><Button variant="secondary" disabled={index === draft.sections.length - 1} onClick={() => void save(`/sections/${section.id}`, { translations: section.translations.filter(row => draft.supportedLanguages.includes(row.languageTag)), isVisible: section.isVisible, position: index + 1 })}>Move down</Button></div> : null}
          </div>
          {canEdit ? <details><summary>Edit section</summary><form aria-label={`Edit section ${label(section.translations, language, draft.defaultLanguage)}`} method="post" className={styles.form} onSubmit={event => void saveSection(event, section)}><TranslationFields languages={draft.supportedLanguages} rows={section.translations} /><label className={styles.check}><input name="isVisible" type="checkbox" defaultChecked={section.isVisible} /> Visible section</label><div className={styles.actions}><Button type="submit">Save section</Button><Button variant="secondary" onClick={() => { if (window.confirm("Archive this section and hide its items?")) void save(`/sections/${section.id}`, {}, "DELETE"); }}>Archive section</Button></div></form></details> : null}
          {section.items.map(item => <article key={item.id} className={styles.item}>
            <div className={styles.toolbar}><div><h3 dir={direction(language)}>{label(item.translations, language, draft.defaultLanguage)}</h3><p>{new Intl.NumberFormat(language, { style: "currency", currency: item.currency }).format(Number(item.price))}{item.isFeatured ? " · Featured" : ""}</p><span className={item.isAvailable ? styles.available : styles.unavailable}>{item.isAvailable ? "Available" : "Unavailable"}</span></div>{canAvailability ? <Button variant="secondary" onClick={() => void save(`/items/${item.id}/availability`, { isAvailable: !item.isAvailable })}>{item.isAvailable ? "Mark unavailable" : "Mark available"}</Button> : null}</div>
            {item.images.length ? <div className={styles.images}>{item.images.map(image => <figure key={image.id}>
              {/* Authenticated private media cannot use the public image optimizer. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${base}/${draft.id}/images/${image.id}`} alt={image.translations.find(row => row.languageTag === language)?.altText || label(item.translations, language, draft.defaultLanguage)} width={image.width} height={image.height} />
              {canEdit ? <><form aria-label="Image description" method="post" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); void save(`/images/${image.id}`, { translations: draft.supportedLanguages.map(languageTag => ({ languageTag, altText: value(data, `alt:${languageTag}`) })) }, "PATCH", event.currentTarget); }}>{draft.supportedLanguages.map(locale => <TextField key={locale} label={`Image description (${locale})`} name={`alt:${locale}`} dir={direction(locale)} maxLength={500} defaultValue={image.translations.find(row => row.languageTag === locale)?.altText ?? ""} />)}<Button variant="secondary" type="submit">Save image text</Button></form><Button variant="secondary" onClick={() => { if (window.confirm("Detach this image?")) void save(`/images/${image.id}`, {}, "DELETE"); }}>Remove image</Button></> : null}
            </figure>)}</div> : null}
            {canEdit ? <details><summary>Edit item</summary>{itemForm(section, item)}<form aria-label={`Upload image for ${label(item.translations, language, draft.defaultLanguage)}`} method="post" onSubmit={event => void upload(event, item)} className={styles.upload}><label className={styles.field}>Image (JPEG, PNG, WebP · up to 2 MB)<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required /></label>{draft.supportedLanguages.map(locale => <TextField key={locale} label={`New image description (${locale})`} name={`alt:${locale}`} dir={direction(locale)} maxLength={500} />)}<Button type="submit" variant="secondary" disabled={item.images.length >= 5}>Upload image</Button></form><Button variant="secondary" onClick={() => { if (window.confirm("Archive this item?")) void save(`/items/${item.id}`, {}, "DELETE"); }}>Archive item</Button></details> : null}
          </article>)}
          {canEdit ? <details><summary>Add an item</summary>{itemForm(section)}</details> : null}
        </Card>)}
        {canEdit ? <Card className={styles.panel}><h2>Add a section</h2><form aria-label="Add section" method="post" className={styles.form} onSubmit={event => void saveSection(event)}><TranslationFields languages={draft.supportedLanguages} /><label className={styles.check}><input name="isVisible" type="checkbox" defaultChecked /> Visible section</label><Button type="submit">Add section</Button></form></Card> : null}
        {canEdit ? <Button variant="secondary" onClick={() => { if (!window.confirm("Archive this menu? Its draft data will be retained.")) return; void run(async () => { await request(`${base}/${draft.id}`, "DELETE", { revision: draft.draftRevision }); setMenus(await request(base) as DraftMenuSummary[]); setDraft(null); setDirty(false); dirtyForms.current.clear(); setMessage("Menu archived."); }); }}>Archive menu</Button> : null}
      </div>}
      </div>
    </fieldset>
  </div>;
}
