import { NextResponse } from "next/server";
import { forwardApiRequest } from "@/lib/proxy-api";

async function dispatch(request: Request, context: RouteContext<"/api/menus/[...path]">) {
  const { path } = await context.params;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(path[0] ?? "") || !uuid.test(path[1] ?? "")) return NextResponse.json({ detail: "Not found" }, { status: 404 });
  const tail = path.slice(2);
  const shape = tail.map(value => uuid.test(value) ? ":id" : value).join("/");
  const allowed: Record<string, string[]> = {
    GET: ["", ":id", ":id/images/:id"],
    POST: ["", ":id/sections", ":id/sections/:id/items", ":id/items/:id/images"],
    PATCH: [":id", ":id/sections/:id", ":id/items/:id", ":id/items/:id/availability", ":id/images/:id"],
    DELETE: [":id", ":id/sections/:id", ":id/items/:id", ":id/images/:id"],
  };
  if (!allowed[request.method]?.includes(shape)) return NextResponse.json({ detail: "Not found" }, { status: 404 });
  return forwardApiRequest(request, `/api/v1/organizations/${path[0]}/locations/${path[1]}/menus${tail.length ? `/${tail.join("/")}` : ""}`);
}
export const GET = dispatch;
export const POST = dispatch;
export const PATCH = dispatch;
export const DELETE = dispatch;
