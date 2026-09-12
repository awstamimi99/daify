import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";

// Only configure a header that the hosting ingress overwrites. Never infer
// trust from a browser-provided X-Forwarded-For or Cloudflare header.
export function clientIdentityHeaders(incoming: Headers, method: string, path: string): Record<string, string> {
  const key = process.env.PROXY_SIGNING_KEY;
  const header = process.env.DAIFY_CLIENT_IP_HEADER;
  if (!key && process.env.NODE_ENV !== "production") return {};
  if (!key || Buffer.from(key, "base64").length !== 32 || !header) throw new Error("Trusted ingress is not configured.");
  const ip = incoming.get(header)?.trim();
  if (!ip || !isIP(ip)) throw new Error("Trusted client address is unavailable.");
  const timestamp = String(Date.now());
  return {
    "x-daify-client-ip": ip,
    "x-daify-client-time": timestamp,
    "x-daify-client-signature": createHmac("sha256", Buffer.from(key, "base64")).update([timestamp, method.toUpperCase(), path, ip].join("\n")).digest("hex"),
  };
}
