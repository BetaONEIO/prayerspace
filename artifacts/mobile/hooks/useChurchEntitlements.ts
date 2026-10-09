import { useEffect } from "react";
import { useChurchMembership, churchMembershipStore } from "@/lib/churchMembershipStore";
import { useCustomerInfo } from "@/hooks/usePurchases";
import { communityTier } from "@/lib/billingEntitlements";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { useCommunityStore } from "@/lib/communityStore";
import { verifiedCommunityAccess } from "@/lib/verifiedCommunityAccess";

export const CHURCH_TIER_LABELS: Record<string, string> = {
  church_small: "Small Community Plan",
  church_medium: "Growing Community Plan",
  church_large: "Large Community Plan",
  church_small_yearly: "Small Community Plan (Yearly)",
  church_medium_yearly: "Growing Community Plan (Yearly)",
  church_large_yearly: "Large Community Plan (Yearly)",
};

export interface ChurchEntitlements {
  /** Community has an active paid subscription. */
  isPremiumCommunity: boolean;
  /** Current user purchased the plan — gets full admin + personal Pro. */
  isOwner: boolean;
  /** Current user is a non-owner member — community features only. */
  isMember: boolean;
  /** True for owners with active subscription — personal Pro features unlocked. */
  hasPersonalPro: boolean;
  /** Any user in an active premium community has community-level features. */
  hasCommunityFeatures: boolean;
  tier: string | null;
  tierLabel: string;
  churchName: string | null;
  isChurchMember: boolean;
}

/**
 * Derives the current user's church entitlements from the local store and
 * optionally cross-checks with RevenueCat customer info on load.
 *
 * Ownership rules:
 *  - Owner  → full admin + personal Pro while subscription is active.
 *  - Member → community features only, no personal Pro.
 *  - On cancellation → downgrade() is called, removing Pro and premium features.
 */
export function useChurchEntitlements(): ChurchEntitlements {
  const church = useChurchMembership();
  const { data: customerInfo } = useCustomerInfo();
  const { user } = useAuth();
  const communities = useCommunityStore();
  const ownedCommunity = communities.find((c) => c.isOwned);
  const community = ownedCommunity ?? communities[0];
  const verifiedAccess = useQuery({
    queryKey: ["verified-community-access", user?.id, community?.id],
    queryFn: () => verifiedCommunityAccess(community?.id),
    enabled: !!user && church.isChurchMember,
    staleTime: 0,
    refetchInterval: 60000,
    retry: 1,
  });

  const isOwner = church.role === "owner";
  const isMember = church.role === "member";

  // Cross-check with RevenueCat when customer info is available.
  // If RC is loaded and the owner has no active church entitlement, downgrade.
  useEffect(() => {
    if (!isOwner || !customerInfo) return;
    if (!church.isPremium) return; // already downgraded

    const hasChurchEntitlement = communityTier(customerInfo) !== null;

    if (!hasChurchEntitlement) {
      console.log("[ChurchEntitlements] No active church entitlement found in RC — downgrading.");
      churchMembershipStore.downgrade();
    }
  }, [customerInfo, isOwner, church.isPremium]);

  const isPremiumCommunity = verifiedAccess.data === true && !verifiedAccess.isError &&
    (isMember || (isOwner && communityTier(customerInfo) !== null));
  const hasPersonalPro = isOwner && isPremiumCommunity;
  const hasCommunityFeatures = church.isChurchMember && isPremiumCommunity;

  return {
    isPremiumCommunity,
    isOwner,
    isMember,
    hasPersonalPro,
    hasCommunityFeatures,
    tier: church.tier,
    tierLabel: CHURCH_TIER_LABELS[church.tier ?? ""] ?? "Church Plan",
    churchName: church.churchName,
    isChurchMember: church.isChurchMember,
  };
}
