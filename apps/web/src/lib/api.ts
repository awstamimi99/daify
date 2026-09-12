export const apiBaseUrl = process.env.DAIFY_API_URL ?? "http://127.0.0.1:4000";

export async function apiFetch(path: string, init: RequestInit = {}) {
  const outgoing = new Headers(init.headers);
  for (const [name, value] of Object.entries(clientIdentityHeaders(await headers(), init.method ?? "GET", path))) outgoing.set(name, value);
  return fetch(`${apiBaseUrl}${path}`, { ...init, headers: outgoing, cache: "no-store", signal: init.signal ?? AbortSignal.timeout(15_000) });
}
import { headers } from "next/headers";
import { clientIdentityHeaders } from "./client-identity";
