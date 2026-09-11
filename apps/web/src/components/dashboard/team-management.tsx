"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, TextField } from "@daify/ui";
import type { Workspace } from "@/lib/workspace";
import styles from "./workspace-forms.module.css";

export interface TeamMember {
  id: string; role: string; status: string; allLocations: boolean;
  user: { displayName: string | null; email: string };
}

export function TeamManagement({ workspace, members }: { readonly workspace: Workspace; readonly members: TeamMember[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [allLocations, setAllLocations] = useState(workspace.membership.role === "owner");
  const roles = workspace.membership.role === "owner" ? ["OWNER", "MANAGER", "STAFF", "VIEWER"] : ["STAFF", "VIEWER"];
  async function save(event: React.FormEvent<HTMLFormElement>, memberId?: string) {
    event.preventDefault(); setPending(true); setError(null); setMessage(null);
    const form = new FormData(event.currentTarget);
    const body = memberId ? { role: String(form.get("role")), status: String(form.get("status")) } : {
      email: String(form.get("email")), role: String(form.get("role")), allLocations: form.has("allLocations"), locationIds: form.getAll("locationIds").map(String), permissions: [],
    };
    try {
      const response = await fetch(`/api/organizations/${workspace.id}/${memberId ? `members/${memberId}` : "invitations"}`, { method: memberId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json() as { detail?: string | string[] };
      if (!response.ok) throw new Error(Array.isArray(result.detail) ? result.detail.join(" ") : result.detail ?? "Your changes could not be saved.");
      setMessage(memberId ? "Membership updated." : "Invitation sent. The recipient can join using the link in their email.");
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Please try again."); }
    finally { setPending(false); }
  }
  return <div className={styles.stack}>
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}{message ? <p role="status" className={styles.message}>{message}</p> : null}
    <Card className={styles.panel}><h2>Invite a teammate</h2><form onSubmit={event => void save(event)} className={styles.form}>
      <TextField label="Teammate’s email" name="email" type="email" required />
      <label className={styles.field}>Role <select name="role" defaultValue="VIEWER">{roles.map(role => <option key={role}>{role}</option>)}</select></label>
      {workspace.membership.role === "owner" ? <label className={styles.check}><input type="checkbox" name="allLocations" checked={allLocations} onChange={event => setAllLocations(event.target.checked)} /> All locations, including future locations</label> : null}
      {!allLocations ? <fieldset className={styles.locations}><legend>Specific locations</legend>{workspace.locations.length ? workspace.locations.map(location => <label key={location.id} className={styles.check}><input type="checkbox" name="locationIds" value={location.id} /> {location.name}</label>) : <p>No locations yet.</p>}</fieldset> : null}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Send invitation"}</Button>
    </form></Card>
    <Card className={styles.panel}><h2>Members</h2>{members.map(member => <form key={`${member.id}-${member.role}-${member.status}`} onSubmit={event => void save(event, member.id)} className={styles.member}>
      <div className={styles.memberName}><strong>{member.user.displayName ?? member.user.email}</strong><p>{member.user.email}</p></div>
      <label className={styles.field}>Role<select aria-label={`Role for ${member.user.email}`} name="role" defaultValue={member.role}>{roles.map(role => <option key={role}>{role}</option>)}</select></label>
      <label className={styles.field}>Status<select aria-label={`Status for ${member.user.email}`} name="status" defaultValue={member.status}>{["ACTIVE", "SUSPENDED", "REVOKED"].map(status => <option key={status}>{status}</option>)}</select></label>
      <Button variant="secondary" type="submit" disabled={pending}>Save member</Button>
    </form>)}</Card>
  </div>;
}
