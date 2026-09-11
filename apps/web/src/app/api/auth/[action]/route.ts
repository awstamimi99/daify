import { NextResponse } from "next/server";
import { forwardApiRequest } from "@/lib/proxy-api";

const actions = new Set(["signup", "login", "logout", "verify-email", "resend-verification", "forgot-password", "reset-password"]);

export async function POST(request: Request, context: RouteContext<"/api/auth/[action]">) {
  const { action } = await context.params;
  if (!actions.has(action)) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return forwardApiRequest(request, `/api/v1/auth/${action}`);
}
