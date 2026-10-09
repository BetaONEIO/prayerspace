import assert from "node:assert/strict";
import { test } from "node:test";
import type { CustomerInfo } from "react-native-purchases";
import { communityTier, hasPersonalPremium } from "./billingEntitlements";

const info = (active: Record<string, { isActive: boolean; productIdentifier: string }>) =>
  ({ entitlements: { active } }) as unknown as CustomerInfo;

test("missing, empty and inactive entitlements do not grant access", () => {
  assert.equal(communityTier(undefined), null);
  assert.equal(communityTier(info({})), null);
  assert.equal(hasPersonalPremium(info({})), false);
  assert.equal(communityTier(info({ premium_community: { isActive: false, productIdentifier: "church_small" } })), null);
});

test("only the exact community entitlement and recognized products grant a tier", () => {
  for (const product of ["church_small", "church_medium", "church_large", "church_small_yearly", "church_medium_yearly", "church_large_yearly"]) {
    assert.equal(communityTier(info({ premium_community: { isActive: true, productIdentifier: product } })), product);
    assert.equal(communityTier(info({ premium_community: { isActive: true, productIdentifier: `${product}:base-plan` } })), product);
  }
  assert.equal(communityTier(info({ random_community: { isActive: true, productIdentifier: "church_small" } })), null);
  assert.equal(communityTier(info({ premium_community: { isActive: true, productIdentifier: "unknown_product" } })), null);
});

test("personal and community subscriptions cannot be substituted for each other", () => {
  const community = info({ premium_community: { isActive: true, productIdentifier: "church_small" } });
  const personal = info({ premium: { isActive: true, productIdentifier: "prayer_journal_monthly" } });
  assert.equal(hasPersonalPremium(community), false);
  assert.equal(communityTier(personal), null);
  assert.equal(hasPersonalPremium(personal), true);
  assert.equal(hasPersonalPremium(info({ premium: { isActive: false, productIdentifier: "prayer_journal_monthly" } })), false);
});
