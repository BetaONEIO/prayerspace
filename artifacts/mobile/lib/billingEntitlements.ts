import type { CustomerInfo } from "react-native-purchases";

const COMMUNITY_PRODUCTS: Record<string, string> = {
  church_small: "church_small",
  church_medium: "church_medium",
  church_large: "church_large",
  church_small_yearly: "church_small_yearly",
  church_medium_yearly: "church_medium_yearly",
  church_large_yearly: "church_large_yearly",
};

export function communityTier(info: CustomerInfo | undefined): string | null {
  const entitlement = info?.entitlements.active.premium_community;
  if (!entitlement?.isActive) return null;
  return COMMUNITY_PRODUCTS[entitlement.productIdentifier.split(":")[0]] ?? null;
}

export function hasPersonalPremium(info: CustomerInfo | undefined): boolean {
  return info?.entitlements.active.premium?.isActive === true;
}
