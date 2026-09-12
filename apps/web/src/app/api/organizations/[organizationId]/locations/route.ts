import { NextResponse } from "next/server";
import { forwardApiRequest } from "@/lib/proxy-api";
export async function POST(request: Request, { params }: RouteContext<"/api/organizations/[organizationId]/locations">) {
  const { organizationId } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(organizationId)) return NextResponse.json({ detail: "Invalid workspace." }, { status: 400 });
  return forwardApiRequest(request, `/api/v1/organizations/${organizationId}/locations`);
}
