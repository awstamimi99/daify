import { NextResponse } from "next/server";
import { apiBaseUrl } from "./api";

// Callers supply fixed/allowlisted API paths; never forward a URL supplied by a client.
export async function forwardApiRequest(request: Request, path: string) {
  const allowedOrigin = process.env.DAIFY_WEB_ORIGIN ?? "http://localhost:3000";
  if (request.headers.get("origin") !== allowedOrigin) {
    return NextResponse.json({ detail: "Request origin is not allowed." }, { status: 403 });
  }
  const logout = path === "/api/v1/auth/logout";
  if (!logout && request.headers.get("content-type")?.split(";")[0]?.trim() !== "application/json") {
    return NextResponse.json({ detail: "Use application/json." }, { status: 415 });
  }
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: request.method,
      headers: { "content-type": "application/json", cookie: request.headers.get("cookie") ?? "", origin: allowedOrigin },
      body: logout ? undefined : await request.text(),
      cache: "no-store", signal: AbortSignal.timeout(15_000),
    });
    const outgoing = response.status === 204 ? new NextResponse(null, { status: 204 }) : NextResponse.json(await response.json(), { status: response.status });
    for (const cookie of response.headers.getSetCookie()) outgoing.headers.append("set-cookie", cookie);
    if (logout && response.status === 401) outgoing.cookies.delete(process.env.SESSION_COOKIE_NAME ?? "daify_session");
    outgoing.headers.set("Cache-Control", "no-store");
    return outgoing;
  } catch {
    return NextResponse.json({ detail: "The account service is unavailable. Please try again." }, { status: 503 });
  }
}
