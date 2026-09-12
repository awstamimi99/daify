import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== (process.env.DAIFY_WEB_ORIGIN ?? "http://localhost:3000")) return NextResponse.json({ detail: "Request origin is not allowed." }, { status: 403 });
  try {
    const { id } = await request.json() as { id?: unknown };
    const response = await apiFetch("/api/v1/organizations", { headers: { cookie: request.headers.get("cookie") ?? "" } });
    if (!response.ok) return NextResponse.json({ detail: "Please sign in again." }, { status: response.status });
    const workspaces = await response.json() as { id: string }[];
    if (typeof id !== "string" || !workspaces.some(workspace => workspace.id === id)) return NextResponse.json({ detail: "Workspace not found." }, { status: 404 });
    const result = NextResponse.json({ selected: true });
    result.cookies.set("daify_workspace", id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86400 });
    return result;
  } catch { return NextResponse.json({ detail: "The workspace could not be selected. Please try again." }, { status: 503 }); }
}
