import { Router, type IRouter } from "express";
import { getProduct, listSubscriptions, listEntitlements, listCustomerActiveEntitlements } from "@replit/revenuecat-sdk";
import { getRevenueCatClient } from "../lib/revenueCatClient";
import { requireSupabaseUser } from "../lib/supabaseAuth";
import { hasLiveEntitlement } from "../lib/subscriptionTrust";

const router: IRouter = Router();

router.get("/community-access", requireSupabaseUser, async (req, res) => {
  try {
    let ownerId = String(res.locals.userId);
    const communityId = req.query.communityId;
    const entitlementKey = req.query.entitlement ?? "premium_community";
    if ((entitlementKey !== "premium_community" && entitlementKey !== "premium") ||
      (communityId !== undefined && entitlementKey !== "premium_community")) {
      res.status(400).json({ error: "Invalid subscription type" }); return;
    }
    if (communityId !== undefined) {
      if (typeof communityId !== "string" || !/^[0-9a-f-]{36}$/i.test(communityId)) {
        res.status(400).json({ error: "Invalid community" }); return;
      }
      const base = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL!).origin;
      const headers = { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, Authorization: req.get("authorization")! };
      const membershipUrl = new URL("/rest/v1/community_members", base);
      membershipUrl.search = new URLSearchParams({
        select: "community_id", community_id: `eq.${communityId}`, user_id: `eq.${ownerId}`,
      }).toString();
      const membership = await fetch(membershipUrl, { headers, signal: AbortSignal.timeout(10000) });
      if (!membership.ok) throw new Error("Membership check unavailable");
      const members = await membership.json() as Array<{ community_id: string }>;
      if (!members.length) { res.status(403).json({ error: "Join this community before accessing its features." }); return; }
      const ownerUrl = new URL("/rest/v1/communities", base);
      ownerUrl.search = new URLSearchParams({ select: "owner_id", id: `eq.${communityId}` }).toString();
      const ownerResponse = await fetch(ownerUrl, { headers, signal: AbortSignal.timeout(10000) });
      if (!ownerResponse.ok) throw new Error("Community check unavailable");
      const rows = await ownerResponse.json() as Array<{ owner_id: string | null }>;
      if (!rows[0]?.owner_id) { res.json({ active: false }); return; }
      ownerId = rows[0].owner_id;
    }
    const projectId = process.env.REVENUECAT_PROJECT_ID;
    if (!projectId) throw new Error("RevenueCat project unavailable");
    const client = await getRevenueCatClient();
    const [catalog, customer] = await Promise.all([
      listEntitlements({ client, path: { project_id: projectId }, query: { limit: 100 } }),
      listCustomerActiveEntitlements({
        client, path: { project_id: projectId, customer_id: ownerId }, query: { limit: 100 },
      }),
    ]);
    if (catalog.error || catalog.data?.next_page) throw new Error("Entitlement check unavailable");
    if (customer.response.status === 404) { res.json({ active: false }); return; }
    if (customer.error || customer.data?.next_page) throw new Error("Subscription check unavailable");
    const entitlement = catalog.data?.items.find((e) => e.lookup_key === entitlementKey);
    let active = !!entitlement && !!customer.data?.items.some((e) =>
      e.entitlement_id === entitlement.id &&
      (e.expires_at === null || e.expires_at > Date.now()));
    if (active && entitlement && process.env.NODE_ENV !== "development") {
      // A public test-store key must never let someone manufacture live access.
      // Do not infer this allowlist from the connected project's legacy apps.
      const verifiedApps = new Set((process.env.REVENUECAT_VERIFIED_STORE_APP_IDS ?? "")
        .split(",").map((id) => id.trim()).filter(Boolean));
      if (!verifiedApps.size) throw new Error("Live store identity has not been confirmed");
      const subscriptions = await listSubscriptions({
        client, path: { project_id: projectId, customer_id: ownerId },
        query: { environment: "production", limit: 100 },
      });
      if (subscriptions.error || subscriptions.data?.next_page) throw new Error("Live receipt check unavailable");
      active = false;
      for (const subscription of subscriptions.data?.items ?? []) {
        if (!hasLiveEntitlement(subscription, entitlement.id) || !subscription.product_id) continue;
        const product = await getProduct({
          client, path: { project_id: projectId, product_id: subscription.product_id },
        });
        if (product.error) throw new Error("Store identity check unavailable");
        if (product.data && verifiedApps.has(product.data.app_id)) { active = true; break; }
      }
    }
    res.json({ active });
  } catch (error) {
    // Do not expose connection responses or credentials.
    req.log.warn({ error: error instanceof Error ? error.message : "Unknown error" }, "Community access check failed");
    res.status(503).json({ error: "Subscription access could not be verified. Please retry." });
  }
});

export default router;
