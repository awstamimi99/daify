import { forwardApiRequest } from "@/lib/proxy-api";
export async function POST(request: Request) { return forwardApiRequest(request, "/api/v1/organizations"); }
