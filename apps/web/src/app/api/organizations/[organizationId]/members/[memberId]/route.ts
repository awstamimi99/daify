import { forwardApiRequest } from "@/lib/proxy-api";
export async function PATCH(request: Request, { params }: RouteContext<"/api/organizations/[organizationId]/members/[memberId]">) {
  const { organizationId, memberId } = await params;
  return forwardApiRequest(request, `/api/v1/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(memberId)}`);
}
