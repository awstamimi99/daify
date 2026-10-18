import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const first = pathname.split("/")[1] ?? "";
  const known = new Set(["", "assets", "menu-assets", "features", "templates", "pricing", "about", "contact", "privacy", "terms", "cookies", "login", "signup", "forgot-password", "reset-password", "resend-verification", "verify-email", "accept-invitation", "staff-invitation", "dashboard", "admin", "api", "menu-preview", "q", "r", "__not-found"]);
  if (!known.has(first)) {
    const arabic = request.cookies.get("daify_locale")?.value === "ar";
    const title = arabic ? "هذه الصفحة فارغة." : "This table is empty.";
    const copy = arabic ? "ربما انتقلت الصفحة التي تبحث عنها، لكن ضيفي هنا." : "The page you were looking for may have moved, but DAIFY is right here.";
    const action = arabic ? "العودة للرئيسية" : "Return home";
    return new NextResponse(`<!doctype html><html lang="${arabic ? "ar" : "en"}" dir="${arabic ? "rtl" : "ltr"}"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>404 — DAIFY</title><body><main><span>404</span><h1>${title}</h1><p>${copy}</p><a href="/">${action}</a></main><style>body{margin:0;background:#fcfaf9;color:#202020;font-family:system-ui,sans-serif}main{min-height:100vh;display:grid;place-content:center;gap:1rem;padding:2rem;text-align:center}span{color:#b52322;font-weight:800;letter-spacing:.15em}h1{margin:0;font:400 clamp(2.4rem,6vw,4.8rem) Georgia,serif}p{margin:0;color:#66615f}a{justify-self:center;margin-top:.5rem;padding:.8rem 1.2rem;border-radius:999px;background:#b52322;color:white;text-decoration:none}</style></body></html>`, { status: 404, headers: { "content-type": "text/html; charset=utf-8", "x-content-type-options": "nosniff", "cache-control": "public, max-age=60" } });
  }
  const protectedPath = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  if (protectedPath && !request.cookies.has(process.env.SESSION_COOKIE_NAME ?? "daify_session")) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/:slug", "/dashboard/:path*", "/admin/:path*"] };
