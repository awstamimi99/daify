export const apiBaseUrl = process.env.DAIFY_API_URL ?? "http://127.0.0.1:4000";

export async function apiFetch(path: string, init: RequestInit = {}) {
  return fetch(`${apiBaseUrl}${path}`, { ...init, cache: "no-store" });
}
