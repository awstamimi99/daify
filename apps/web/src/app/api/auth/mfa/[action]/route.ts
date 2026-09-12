import { NextResponse } from "next/server";
import { forwardApiRequest } from "@/lib/proxy-api";

export async function POST(request: Request, context: RouteContext<"/api/auth/mfa/[action]">) {
  const { action } = await context.params;
  if (!new Set(["setup", "confirm"]).has(action)) return NextResponse.json({ detail: "Not found" }, { status: 404 });
  return forwardApiRequest(request, `/api/v1/auth/mfa/${action}`);
}
