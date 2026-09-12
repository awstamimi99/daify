import { forwardApiRequest } from "@/lib/proxy-api";
export async function POST(request: Request, { params }: RouteContext<"/api/organizations/[organizationId]/invitations">) {
  const { organizationId } = await params;
  return forwardApiRequest(request, `/api/v1/organizations/${encodeURIComponent(organizationId)}/invitations`);
}
