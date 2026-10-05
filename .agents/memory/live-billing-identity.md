---
name: Live billing app identity
description: Avoid targeting a legacy RevenueCat app when preparing Prayer Space store billing
---

Confirm the actual App Store/Play Store listing's immutable app identifier before changing RevenueCat store configuration or the build's identity. An installed RevenueCat integration is not evidence that its store apps target the current Prayer Space listing.

**Why:** The live RevenueCat audit returned legacy Prayer Journal store apps with identifiers different from the Prayer Space build. Automatically making either side match could target a different listing or separate existing subscribers from their original app.

**How to apply:** Ask which identifier belongs to the actual listing and retain its identity. Configure billing for that app deliberately; do not recreate store apps, change bundle/package IDs, or migrate products merely to remove a mismatch.
