import assert from "node:assert/strict";
import { test } from "node:test";
import { hasLiveEntitlement, type SubscriptionProof } from "./subscriptionTrust";

const proof: SubscriptionProof = {
  environment: "production", store: "app_store", gives_access: true,
  entitlements: { items: [{ id: "verified-entitlement" }], next_page: null },
};

test("live access needs the exact active entitlement from a supported production store", () => {
  assert.equal(hasLiveEntitlement(proof, "verified-entitlement"), true);
  assert.equal(hasLiveEntitlement({ ...proof, store: "play_store" }, "verified-entitlement"), true);
  assert.equal(hasLiveEntitlement(proof, "different-entitlement"), false);
  assert.equal(hasLiveEntitlement({ ...proof, gives_access: false }, "verified-entitlement"), false);
});

test("sandbox, test, promotional and other billing sources never prove live-store access", () => {
  assert.equal(hasLiveEntitlement({ ...proof, environment: "sandbox" }, "verified-entitlement"), false);
  for (const store of ["test_store", "promotional", "rc_billing", "stripe"]) {
    assert.equal(hasLiveEntitlement({ ...proof, store }, "verified-entitlement"), false);
  }
  assert.equal(hasLiveEntitlement({
    ...proof, entitlements: { ...proof.entitlements, next_page: "more-results" },
  }, "verified-entitlement"), false);
});
