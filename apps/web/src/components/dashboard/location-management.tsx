"use client";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, TextField } from "@daify/ui";
import type { Workspace } from "@/lib/workspace";
import { WorkspaceSetup } from "./workspace-setup";
import styles from "./workspace-forms.module.css";
const subscribe = () => () => {};
export function LocationManagement({ workspace }: { workspace: Workspace }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [pending, setPending] = useState(false); const [error, setError] = useState<string | null>(null);
  const router = useRouter(); const canEdit = workspace.membership.permissions.includes("location.manage");
  async function save(id: string, body: object, method = "PATCH") {
    setPending(true); setError(null);
    try {
      const response = await fetch(`/api/organizations/${workspace.id}/locations/${id}`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { detail?: string | string[] };
      if (!response.ok) throw new Error(Array.isArray(result.detail) ? result.detail.join(" ") : result.detail ?? "Location could not be saved.");
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Please retry."); }
    finally { setPending(false); }
  }
  return <div className={styles.stack}>{error ? <p role="alert" className={styles.error}>{error}</p> : null}{workspace.locations.map(location => <Card key={location.id} className={styles.panel}><h2>{location.name}</h2>{canEdit ? <form method="post" aria-label={`Edit ${location.name}`} className={styles.form} onSubmit={event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); void save(location.id, data); }}><fieldset disabled={!hydrated || pending} className={styles.securityFields}>
    <TextField label="Location name" name="name" defaultValue={location.name} minLength={2} maxLength={160} required /><TextField label="Short name" name="slug" defaultValue={location.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={100} required />
    <TextField label="Time zone" name="timezone" defaultValue={location.timezone} required /><TextField label="Currency" name="currency" defaultValue={location.currency} pattern="[A-Z]{3}" required hint="Currency cannot change while this location has active menus." />
    <label className={styles.field}>Default language<select name="defaultLanguage" defaultValue={location.defaultLanguage}><option value="en">English</option><option value="ar">العربية</option></select></label>
    <Button type="submit">Save location</Button><Button variant="secondary" onClick={() => { if (window.confirm("Archive this location? Its menus will become inaccessible and its data will be retained.")) void save(location.id, {}, "DELETE"); }}>Archive location</Button>
  </fieldset></form> : <p>{location.currency} · {location.timezone}</p>}</Card>)}{canEdit ? <Card className={styles.panel}><h2>Add a location</h2><WorkspaceSetup organizationId={workspace.id} /></Card> : null}</div>;
}
