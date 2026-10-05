# RevenueCat live billing readiness

## Status

RevenueCat is connected and a read-only audit successfully queried the configured
project. No store apps, products, prices, offerings, or entitlements were changed.
Real billing is **not ready for launch**.

The audit can be repeated using:

```sh
pnpm --filter @workspace/scripts exec tsx src/checkRevenueCatReadiness.ts
```

The script reads the configured project ID, uses the existing connection, and
logs only configuration metadata. It does not inspect customers or credentials.

## Confirmed configuration

- RevenueCat has iOS, Android, and Test Store apps.
- Personal monthly/yearly products are attached to `premium`.
- Small, Medium, and Large community products have monthly/yearly variants
  attached to `premium_community`.
- The `church` offering contains all six community packages and is current.
- The `default` offering contains personal monthly/yearly packages and is not
  current.
- No `church_members` discount offering was returned.
- The linked iOS and Android apps use `app.rork.wazimsrnizefzclhxniiw` and are
  named Prayer Journal. Prayer Space's Expo configuration instead uses
  `app.prayerspace.com` for both platforms.
- The linked iOS app reports that its App Store Connect API key and subscription
  key are not configured.
- The API exposes the Android package name but not a reliable credential
  readiness flag in this SDK. Android store credentials remain unverified.

Product presence in RevenueCat does **not** prove that matching products exist,
are approved, or have pricing configured in Apple/Google's stores.

## Required decision before store changes

Confirm the immutable identifier of the actual Prayer Space store listing.
Do not automatically rename the existing RevenueCat apps or change the built
app's identifier to match them. Changing the built app identifier can create a
different store app rather than update the existing app.

## App wiring gaps

These are findings, not completed fixes:

1. Personal Pro reads `offerings.current.monthly/annual`, but the live current
   offering is community-only. Select the personal offering explicitly and do
   not fall back to a community product.
2. The community paywall completes paid onboarding when a package is missing.
   It must stop with an unavailable/error state instead.
3. Community restore sets paid ownership without confirming an active
   `premium_community` entitlement or resolving its tier.
4. Personal purchase confirmation always claims a seven-day free trial.
   Store trial configuration and individual eligibility must be verified before
   making that claim.
5. Hard-coded price fallbacks can display prices unrelated to the actual store
   package. Use localized RevenueCat/store prices, or show unavailable.
6. Purchases are not linked to Supabase user IDs through RevenueCat login/logout.
   Add account-aware purchase identity and clear user-specific caches on account
   switching.
7. Community paid access/ownership relies on a local in-memory store. Empty
   active entitlements do not downgrade an owner. Enforce verified subscription
   state and connect shared community access to trusted backend authorization.
   RevenueCat remains the source of truth for the product catalog; do not
   duplicate it in Supabase.
8. Confirm production builds use the intended platform SDK key. Development,
   web, and Expo Go use Test Store in the current configuration.

## Store setup after confirming the listing

### Apple

- Match the app's bundle identifier to the correct RevenueCat iOS app.
- Configure App Store Connect and subscription credentials through the supported
  secure setup, never by pasting credentials into chat.
- Ensure the matching subscriptions, subscription group, durations, prices,
  localizations, review details, and any introductory offers exist in App Store
  Connect.
- Replit's documented product sync is available in Publishing → Manage after a
  TestFlight submission; this is an explicit store configuration step, not a
  consequence of merely connecting RevenueCat.
- Test purchases/restores in TestFlight/sandbox before App Store release.

### Google

- Match the Play Console package name to the correct RevenueCat Android app.
- Configure the required Play service-account access securely.
- Ensure subscriptions and matching active monthly/yearly base plans exist,
  with prices, availability, and any introductory offers.
- Test with an internal testing build and license testers before production.

### Release checks

Verify purchases and restores on both platforms, expiry/refund behavior,
account switching, and absence of paid access without an active entitlement.
Also verify trial eligibility and store-derived prices. A Test Store purchase
alone does not validate real store billing.
