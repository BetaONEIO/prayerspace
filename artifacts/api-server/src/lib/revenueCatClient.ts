import { createClient } from "@replit/revenuecat-sdk/client";

export async function getRevenueCatClient() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const token = process.env.REPL_IDENTITY ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL ? `depl ${process.env.WEB_REPL_RENEWAL}` : null;
  if (!hostname || !token) throw new Error("RevenueCat connection unavailable");
  const response = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=revenuecat`,
    { headers: { Accept: "application/json", "X-Replit-Token": token }, signal: AbortSignal.timeout(10000) },
  );
  if (!response.ok) throw new Error("RevenueCat connection unavailable");
  const data = await response.json() as { items?: Array<{ settings?: {
    access_token?: string; oauth?: { credentials?: { access_token?: string } };
  } }> };
  const settings = data.items?.[0]?.settings;
  const apiKey = settings?.access_token ?? settings?.oauth?.credentials?.access_token;
  if (!apiKey) throw new Error("RevenueCat connection unavailable");
  return createClient({ baseUrl: "https://api.revenuecat.com/v2", headers: { Authorization: `Bearer ${apiKey}` } });
}
