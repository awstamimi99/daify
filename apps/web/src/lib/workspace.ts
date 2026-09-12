import { cache } from "react";
import { cookies } from "next/headers";
import { apiFetch } from "./api";
import { requireSession } from "./session";

export interface Workspace {
  id: string; name: string; slug: string; defaultLocale: string; timezone: string;
  membership: { role: string; permissions: string[] };
  locations: { id: string; name: string; slug: string; timezone: string; currency: string; defaultLanguage: string }[];
}

export const getWorkspaceContext = cache(async () => {
  await requireSession();
  const jar = await cookies();
  const response = await apiFetch("/api/v1/organizations", { headers: { cookie: jar.toString() } });
  if (!response.ok) throw new Error("Your workspaces could not be loaded. Please try again.");
  const workspaces = await response.json() as Workspace[];
  // The preference can only select an organization returned by the authorized API.
  const active = workspaces.find(workspace => workspace.id === jar.get("daify_workspace")?.value) ?? workspaces[0] ?? null;
  return { workspaces, active };
});
