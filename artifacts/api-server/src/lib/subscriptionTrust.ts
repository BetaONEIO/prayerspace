export type SubscriptionProof = {
  environment: string;
  store: string;
  gives_access: boolean;
  entitlements: { items: Array<{ id: string }>; next_page: string | null };
};

export function hasLiveEntitlement(subscription: SubscriptionProof, entitlementId: string): boolean {
  return subscription.environment === "production" &&
    (subscription.store === "app_store" || subscription.store === "play_store") &&
    subscription.gives_access === true && !subscription.entitlements.next_page &&
    subscription.entitlements.items.some((e) => e.id === entitlementId);
}
