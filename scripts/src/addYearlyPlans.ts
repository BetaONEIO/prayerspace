import { getUncachableRevenueCatClient } from "./revenueCatClient";

import {
  listProjects,
  listApps,
  listProducts,
  createProduct,
  listEntitlements,
  attachProductsToEntitlement,
  listOfferings,
  listPackages,
  createPackages,
  attachProductsToPackage,
  type App,
  type Product,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

// Yearly products: 20% off the monthly price billed annually (P1Y)
const YEARLY_TIERS = [
  {
    id: "church_small_yearly",
    displayName: "Small Community Plan (Yearly)",
    title: "Small Community Plan (Yearly)",
    duration: "P1Y" as const,
    // $19.99 * 12 * 0.8 = $191.90; £15.99 * 12 * 0.8 = £153.50; €17.99 * 12 * 0.8 = €172.70
    prices: [
      { amount_micros: 191900000, currency: "USD" },
      { amount_micros: 172700000, currency: "EUR" },
      { amount_micros: 153500000, currency: "GBP" },
    ],
    packageId: "church_small_yearly",
    packageDisplayName: "Small Community (Yearly)",
  },
  {
    id: "church_medium_yearly",
    displayName: "Growing Community Plan (Yearly)",
    title: "Growing Community Plan (Yearly)",
    duration: "P1Y" as const,
    // $39.99 * 12 * 0.8 = $383.90; £31.99 * 12 * 0.8 = £307.10; €35.99 * 12 * 0.8 = €345.50
    prices: [
      { amount_micros: 383900000, currency: "USD" },
      { amount_micros: 345500000, currency: "EUR" },
      { amount_micros: 307100000, currency: "GBP" },
    ],
    packageId: "church_medium_yearly",
    packageDisplayName: "Growing Community (Yearly)",
  },
  {
    id: "church_large_yearly",
    displayName: "Large Community Plan (Yearly)",
    title: "Large Community Plan (Yearly)",
    duration: "P1Y" as const,
    // $79.99 * 12 * 0.8 = $767.90; £63.99 * 12 * 0.8 = £614.30; €71.99 * 12 * 0.8 = €691.10
    prices: [
      { amount_micros: 767900000, currency: "USD" },
      { amount_micros: 691100000, currency: "EUR" },
      { amount_micros: 614300000, currency: "GBP" },
    ],
    packageId: "church_large_yearly",
    packageDisplayName: "Large Community (Yearly)",
  },
];

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

async function addYearlyPlans() {
  const client = await getUncachableRevenueCatClient();

  // --- Project ---
  const { data: existingProjects, error: listProjectsError } = await listProjects({
    client,
    query: { limit: 20 },
  });
  if (listProjectsError || !existingProjects?.items?.length) {
    throw new Error("Failed to list projects — ensure the RevenueCat connection is authorized");
  }
  const project = existingProjects.items[0];
  console.log("Using project:", project.id, project.name);

  // --- Apps ---
  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listAppsError || !apps?.items?.length) throw new Error("No apps found");

  const testStoreApp: App | undefined = apps.items.find((a) => a.type === "test_store");
  const appStoreApp: App | undefined = apps.items.find((a) => a.type === "app_store");
  const playStoreApp: App | undefined = apps.items.find((a) => a.type === "play_store");

  if (!testStoreApp) throw new Error("No test store app found");
  if (!appStoreApp) throw new Error("No App Store app found — run seedRevenueCat first");
  if (!playStoreApp) throw new Error("No Play Store app found — run seedRevenueCat first");

  console.log("Test Store:", testStoreApp.id);
  console.log("App Store:", appStoreApp.id);
  console.log("Play Store:", playStoreApp.id);

  // --- Products ---
  const { data: existingProducts, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });
  if (listProductsError) throw new Error("Failed to list products");

  const ensureProduct = async (
    targetApp: App,
    label: string,
    identifier: string,
    displayName: string,
    title: string,
    duration: "P1Y",
    isTestStore: boolean
  ): Promise<Product> => {
    const existing = existingProducts.items?.find(
      (p) => p.store_identifier === identifier && p.app_id === targetApp.id
    );
    if (existing) {
      console.log(`${label} product already exists:`, existing.id);
      return existing;
    }
    const body: CreateProductData["body"] = {
      store_identifier: identifier,
      app_id: targetApp.id,
      type: "subscription",
      display_name: displayName,
    };
    if (isTestStore) {
      body.subscription = { duration };
      body.title = title;
    }
    const { data: created, error } = await createProduct({
      client,
      path: { project_id: project.id },
      body,
    });
    if (error) throw new Error(`Failed to create ${label} product: ${JSON.stringify(error)}`);
    console.log(`Created ${label} product:`, created.id);
    return created;
  };

  const yearlyProducts: { testStore: Product; appStore: Product; playStore: Product }[] = [];
  for (const tier of YEARLY_TIERS) {
    const testStoreProduct = await ensureProduct(testStoreApp, `Test/${tier.id}`, tier.id, tier.displayName, tier.title, tier.duration, true);
    const appStoreProduct = await ensureProduct(appStoreApp, `AppStore/${tier.id}`, tier.id, tier.displayName, tier.title, tier.duration, false);
    const playStoreProduct = await ensureProduct(playStoreApp, `PlayStore/${tier.id}`, `${tier.id}:yearly`, tier.displayName, tier.title, tier.duration, false);

    // Set test store prices
    const { error: priceError } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: project.id, product_id: testStoreProduct.id },
      body: { prices: tier.prices },
    });
    if (priceError) {
      if (typeof priceError === "object" && "type" in priceError && priceError["type"] === "resource_already_exists") {
        console.log(`Test store prices already set for ${tier.id}`);
      } else {
        throw new Error(`Failed to set prices for ${tier.id}: ${JSON.stringify(priceError)}`);
      }
    } else {
      console.log(`Set prices for ${tier.id}`);
    }

    yearlyProducts.push({ testStore: testStoreProduct, appStore: appStoreProduct, playStore: playStoreProduct });
  }

  // --- Entitlement: attach yearly products to premium_community ---
  const { data: existingEntitlements, error: listEntitlementsError } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listEntitlementsError) throw new Error("Failed to list entitlements");

  const entitlement = existingEntitlements.items?.find(
    (e) => e.lookup_key === "premium_community"
  );
  if (!entitlement) throw new Error("premium_community entitlement not found — run seedRevenueCat first");

  const allYearlyProductIds = yearlyProducts.flatMap((tp) => [
    tp.testStore.id,
    tp.appStore.id,
    tp.playStore.id,
  ]);

  const { error: attachEntitlementError } = await attachProductsToEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: entitlement.id },
    body: { product_ids: allYearlyProductIds },
  });
  if (attachEntitlementError) {
    if (attachEntitlementError.type === "unprocessable_entity_error") {
      console.log("Yearly products already attached to entitlement");
    } else {
      throw new Error(`Failed to attach yearly products to entitlement: ${JSON.stringify(attachEntitlementError)}`);
    }
  } else {
    console.log("Attached all yearly products to premium_community entitlement");
  }

  // --- Packages in the existing 'church' offering ---
  const { data: existingOfferings, error: listOfferingsError } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listOfferingsError) throw new Error("Failed to list offerings");

  const churchOffering = existingOfferings.items?.find((o) => o.lookup_key === "church");
  if (!churchOffering) throw new Error("'church' offering not found — run seedRevenueCat first");

  const { data: existingPackages, error: listPackagesError } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: churchOffering.id },
    query: { limit: 30 },
  });
  if (listPackagesError) throw new Error("Failed to list packages");

  for (let i = 0; i < YEARLY_TIERS.length; i++) {
    const tier = YEARLY_TIERS[i];
    const tp = yearlyProducts[i];

    let pkg;
    const existingPackage = existingPackages.items?.find((p) => p.lookup_key === tier.packageId);
    if (existingPackage) {
      console.log(`Package ${tier.packageId} already exists:`, existingPackage.id);
      pkg = existingPackage;
    } else {
      const { data: newPackage, error } = await createPackages({
        client,
        path: { project_id: project.id, offering_id: churchOffering.id },
        body: { lookup_key: tier.packageId, display_name: tier.packageDisplayName },
      });
      if (error) throw new Error(`Failed to create package ${tier.packageId}: ${JSON.stringify(error)}`);
      console.log(`Created package ${tier.packageId}:`, newPackage.id);
      pkg = newPackage;
    }

    const { error: attachPkgError } = await attachProductsToPackage({
      client,
      path: { project_id: project.id, package_id: pkg.id },
      body: {
        products: [
          { product_id: tp.testStore.id, eligibility_criteria: "all" },
          { product_id: tp.appStore.id, eligibility_criteria: "all" },
          { product_id: tp.playStore.id, eligibility_criteria: "all" },
        ],
      },
    });
    if (attachPkgError) {
      if (
        attachPkgError.type === "unprocessable_entity_error" &&
        attachPkgError.message?.includes("Cannot attach product")
      ) {
        console.log(`Package ${tier.packageId}: product already attached, skipping`);
      } else {
        throw new Error(`Failed to attach products to package ${tier.packageId}: ${JSON.stringify(attachPkgError)}`);
      }
    } else {
      console.log(`Attached products to package ${tier.packageId}`);
    }
  }

  console.log("\n====================");
  console.log("Yearly plans added successfully!");
  console.log("New packages in 'church' offering:");
  YEARLY_TIERS.forEach((t) => console.log(`  - ${t.packageId}`));
  console.log("Entitlement: premium_community");
  console.log("====================\n");
}

addYearlyPlans().catch(console.error);
