import { NextResponse } from "next/server";
import { apiBaseUrl } from "./api";
import { clientIdentityHeaders } from "./client-identity";

async function readBoundedBody(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally { reader.releaseLock(); }
}

// Callers supply fixed/allowlisted API paths; never forward a URL supplied by a client.
export async function forwardApiRequest(request: Request, path: string) {
  const allowedOrigin = process.env.DAIFY_WEB_ORIGIN ?? "http://localhost:3000";
  const read = request.method === "GET";
  if (!read && request.headers.get("origin") !== allowedOrigin) {
    return NextResponse.json({ detail: "Request origin is not allowed." }, { status: 403 });
  }
  const logout = path === "/api/v1/auth/logout";
  if (!read && !logout && request.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json") {
    return NextResponse.json({ detail: "Use application/json." }, { status: 415 });
  }
  try {
    const limit = request.method === "POST" && path.endsWith("/images") ? 3 * 1024 * 1024 : 100 * 1024;
    const body = logout || read ? undefined : await readBoundedBody(request, limit);
    if (body === null) return NextResponse.json({ detail: "Request body exceeds the allowed size." }, { status: 413 });
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: request.method,
      headers: { "content-type": "application/json", cookie: request.headers.get("cookie") ?? "", origin: allowedOrigin, ...clientIdentityHeaders(request.headers, request.method, path) },
      body,
      cache: "no-store", signal: AbortSignal.timeout(15_000),
    });
    const outgoing = response.headers.get("content-type")?.startsWith("image/jpeg")
      ? new NextResponse(await response.arrayBuffer(), { status: response.status, headers: { "Content-Type": "image/jpeg", "X-Content-Type-Options": "nosniff" } })
      : response.status === 204 ? new NextResponse(null, { status: 204 }) : NextResponse.json(await response.json(), { status: response.status });
    for (const cookie of response.headers.getSetCookie()) outgoing.headers.append("set-cookie", cookie);
    for (const name of ["retry-after", "x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset"]) {
      const value = response.headers.get(name);
      if (value) outgoing.headers.set(name, value);
    }
    if (logout && response.status === 401) outgoing.cookies.delete(process.env.SESSION_COOKIE_NAME ?? "daify_session");
    outgoing.headers.set("Cache-Control", "no-store");
    return outgoing;
  } catch {
    return NextResponse.json({ detail: "The service is unavailable. Please try again." }, { status: 503 });
  }
}
