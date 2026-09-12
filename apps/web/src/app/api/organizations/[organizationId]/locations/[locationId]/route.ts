import { NextResponse } from "next/server";
import { forwardApiRequest } from "@/lib/proxy-api";
async function update(request: Request, context: RouteContext<"/api/organizations/[organizationId]/locations/[locationId]">) {
  const { organizationId, locationId } = await context.params;
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
  if (!uuid.test(organizationId) || !uuid.test(locationId)) return NextResponse.json({ detail: "Not found" }, { status: 404 });
  return forwardApiRequest(request, `/api/v1/organizations/${organizationId}/locations/${locationId}`);
}
export const PATCH = update;
export const DELETE = update;
