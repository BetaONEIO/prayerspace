import { supabase } from "./supabase";

const API_URL = (process.env.EXPO_PUBLIC_API_URL ??
  (process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : "")).replace(/\/$/, "");

export async function verifiedSubscriptionAccess(entitlement: "premium" | "premium_community", communityId?: string): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Please sign in to check subscription access");
  const params = new URLSearchParams({ entitlement });
  if (communityId) params.set("communityId", communityId);
  const query = `?${params.toString()}`;
  const response = await fetch(`${API_URL}/api/community-access${query}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) throw new Error("Subscription access could not be verified. Please retry.");
  const data = await response.json() as { active?: unknown };
  return data.active === true;
}

export function verifiedCommunityAccess(communityId?: string): Promise<boolean> {
  return verifiedSubscriptionAccess("premium_community", communityId);
}
