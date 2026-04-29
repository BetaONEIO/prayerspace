import { getUncachableRevenueCatClient } from "./revenueCatClient";

import {
  listProjects,
  createProject,
  listApps,
  createApp,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  listAppPublicApiKeys,
  type App,
  type Product,
  type Project,
  type Entitlement,
  type Offering,
  type Package,
  type CreateProductData,
} from "@replit/revenuecat-sdk";

const PROJECT_NAME = "Prayer Space";

const APP_STORE_APP_NAME = "Prayer Space iOS";
const APP_STORE_BUNDLE_ID = "com.prayerspace.app";
const PLAY_STORE_APP_NAME = "Prayer Space Android";
const PLAY_STORE_PACKAGE_NAME = "com.prayerspace.app";

const ENTITLEMENT_IDENTIFIER = "premium_community";
const ENTITLEMENT_DISPLAY_NAME = "Premium Community";

const OFFERING_IDENTIFIER = "church";
const OFFERING_DISPLAY_NAME = "Church Community Plans";

const TIERS = [
  {
    id: "church_small",
    displayName: "Small Community Plan",
    title: "Small Community Plan",
    duration: "P1M" as const,
    prices: [
      { amount_micros: 19990000, currency: "USD" },
      { amount_micros: 17990000, currency: "EUR" },
      { amount_micros: 15990000, currency: "GBP" },
    ],
    packageId: "church_small",
    packageDisplayName: "Small Community",
  },
  {
    id: "church_medium",
    displayName: "Growing Community Plan",
    title: "Growing Community Plan",
    duration: "P1M" as const,
    prices: [
      { amount_micros: 39990000, currency: "USD" },
      { amount_micros: 35990000, currency: "EUR" },
      { amount_micros: 31990000, currency: "GBP" },
    ],
    packageId: "church_medium",
    packageDisplayName: "Growing Community",
  },
  {
    id: "church_large",
    displayName: "Large Community Plan",
    title: "Large Community Plan",
    duration: "P1M" as const,
    prices: [
      { amount_micros: 79990000, currency: "USD" },
      { amount_micros: 71990000, currency: "EUR" },
      { amount_micros: 63990000, currency: "GBP" },
    ],
    packageId: "church_large",
    packageDisplayName: "Large Community",
  },
];

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

async function seedRevenueCat() {
  const client = await getUncachableRevenueCatClient();

  // --- Project ---
  let project: Project;
  const { data: existingProjects, error: listProjectsError } = await listProjects({
    client,
    query: { limit: 20 },
  });
  if (listProjectsError) throw new Error("Failed to list projects");

  const existingProject = existingProjects.items?.find((p) => p.name === PROJECT_NAME);
  if (existingProject) {
    console.log("Project already exists:", existingProject.id);
    project = existingProject;
  } else {
    const { data: newProject, error } = await createProject({ client, body: { name: PROJECT_NAME } });
    if (error) throw new Error("Failed to create project");
    console.log("Created project:", newProject.id);
    project = newProject;
  }

  // --- Apps ---
  const { data: apps, error: listAppsError } = await listApps({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listAppsError || !apps || apps.items.length === 0) throw new Error("No apps found");

  let testStoreApp: App | undefined = apps.items.find((a) => a.type === "test_store");
  let appStoreApp: App | undefined = apps.items.find((a) => a.type === "app_store");
  let playStoreApp: App | undefined = apps.items.find((a) => a.type === "play_store");

  if (!testStoreApp) throw new Error("No test store app found in this project");
  console.log("Test Store app:", testStoreApp.id);

  if (!appStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: APP_STORE_APP_NAME, type: "app_store", app_store: { bundle_id: APP_STORE_BUNDLE_ID } },
    });
    if (error) throw new Error("Failed to create App Store app");
    appStoreApp = newApp;
    console.log("Created App Store app:", appStoreApp.id);
  } else {
    console.log("App Store app:", appStoreApp.id);
  }

  if (!playStoreApp) {
    const { data: newApp, error } = await createApp({
      client,
      path: { project_id: project.id },
      body: { name: PLAY_STORE_APP_NAME, type: "play_store", play_store: { package_name: PLAY_STORE_PACKAGE_NAME } },
    });
    if (error) throw new Error("Failed to create Play Store app");
    playStoreApp = newApp;
    console.log("Created Play Store app:", playStoreApp.id);
  } else {
    console.log("Play Store app:", playStoreApp.id);
  }

  // --- Products (one per tier, per store) ---
  const { data: existingProducts, error: listProductsError } = await listProducts({
    client,
    path: { project_id: project.id },
    query: { limit: 100 },
  });
  if (listProductsError) throw new Error("Failed to list products");

  const ensureProduct = async (targetApp: App, label: string, identifier: string, displayName: string, title: string, duration: "P1W" | "P1M" | "P2M" | "P3M" | "P6M" | "P1Y", isTestStore: boolean): Promise<Product> => {
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
    const { data: created, error } = await createProduct({ client, path: { project_id: project.id }, body });
    if (error) throw new Error(`Failed to create ${label} product`);
    console.log(`Created ${label} product:`, created.id);
    return created;
  };

  const tierProducts: { testStore: Product; appStore: Product; playStore: Product }[] = [];
  for (const tier of TIERS) {
    const testStoreProduct = await ensureProduct(testStoreApp, `Test/${tier.id}`, tier.id, tier.displayName, tier.title, tier.duration, true);
    const appStoreProduct = await ensureProduct(appStoreApp, `AppStore/${tier.id}`, tier.id, tier.displayName, tier.title, tier.duration, false);
    const playStoreProduct = await ensureProduct(playStoreApp, `PlayStore/${tier.id}`, `${tier.id}:monthly`, tier.displayName, tier.title, tier.duration, false);

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
        throw new Error(`Failed to set prices for ${tier.id}`);
      }
    } else {
      console.log(`Set prices for ${tier.id}`);
    }

    tierProducts.push({ testStore: testStoreProduct, appStore: appStoreProduct, playStore: playStoreProduct });
  }

  // --- Entitlement ---
  let entitlement: Entitlement | undefined;
  const { data: existingEntitlements, error: listEntitlementsError } = await listEntitlements({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listEntitlementsError) throw new Error("Failed to list entitlements");

  const existingEntitlement = existingEntitlements.items?.find((e) => e.lookup_key === ENTITLEMENT_IDENTIFIER);
  if (existingEntitlement) {
    console.log("Entitlement already exists:", existingEntitlement.id);
    entitlement = existingEntitlement;
  } else {
    const { data: newEntitlement, error } = await createEntitlement({
      client,
      path: { project_id: project.id },
      body: { lookup_key: ENTITLEMENT_IDENTIFIER, display_name: ENTITLEMENT_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create entitlement");
    console.log("Created entitlement:", newEntitlement.id);
    entitlement = newEntitlement;
  }

  const allProductIds = tierProducts.flatMap((tp) => [tp.testStore.id, tp.appStore.id, tp.playStore.id]);
  const { error: attachEntitlementError } = await attachProductsToEntitlement({
    client,
    path: { project_id: project.id, entitlement_id: entitlement.id },
    body: { product_ids: allProductIds },
  });
  if (attachEntitlementError) {
    if (attachEntitlementError.type === "unprocessable_entity_error") {
      console.log("Products already attached to entitlement");
    } else {
      throw new Error("Failed to attach products to entitlement");
    }
  } else {
    console.log("Attached all tier products to entitlement");
  }

  // --- Offering ---
  let offering: Offering | undefined;
  const { data: existingOfferings, error: listOfferingsError } = await listOfferings({
    client,
    path: { project_id: project.id },
    query: { limit: 20 },
  });
  if (listOfferingsError) throw new Error("Failed to list offerings");

  const existingOffering = existingOfferings.items?.find((o) => o.lookup_key === OFFERING_IDENTIFIER);
  if (existingOffering) {
    console.log("Offering already exists:", existingOffering.id);
    offering = existingOffering;
  } else {
    const { data: newOffering, error } = await createOffering({
      client,
      path: { project_id: project.id },
      body: { lookup_key: OFFERING_IDENTIFIER, display_name: OFFERING_DISPLAY_NAME },
    });
    if (error) throw new Error("Failed to create offering");
    console.log("Created offering:", newOffering.id);
    offering = newOffering;
  }

  if (!offering.is_current) {
    const { error } = await updateOffering({
      client,
      path: { project_id: project.id, offering_id: offering.id },
      body: { is_current: true },
    });
    if (error) throw new Error("Failed to set offering as current");
    console.log("Set church offering as current");
  }

  // --- Packages (one per tier) ---
  const { data: existingPackages, error: listPackagesError } = await listPackages({
    client,
    path: { project_id: project.id, offering_id: offering.id },
    query: { limit: 20 },
  });
  if (listPackagesError) throw new Error("Failed to list packages");

  for (let i = 0; i < TIERS.length; i++) {
    const tier = TIERS[i];
    const tp = tierProducts[i];

    let pkg: Package | undefined;
    const existingPackage = existingPackages.items?.find((p) => p.lookup_key === tier.packageId);
    if (existingPackage) {
      console.log(`Package ${tier.packageId} already exists:`, existingPackage.id);
      pkg = existingPackage;
    } else {
      const { data: newPackage, error } = await createPackages({
        client,
        path: { project_id: project.id, offering_id: offering.id },
        body: { lookup_key: tier.packageId, display_name: tier.packageDisplayName },
      });
      if (error) throw new Error(`Failed to create package ${tier.packageId}`);
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
      if (attachPkgError.type === "unprocessable_entity_error" && attachPkgError.message?.includes("Cannot attach product")) {
        console.log(`Package ${tier.packageId}: already has incompatible product, skipping`);
      } else {
        throw new Error(`Failed to attach products to package ${tier.packageId}`);
      }
    } else {
      console.log(`Attached products to package ${tier.packageId}`);
    }
  }

  // --- API Keys ---
  const { data: testStoreApiKeys } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: testStoreApp.id },
  });
  const { data: appStoreApiKeys } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: appStoreApp.id },
  });
  const { data: playStoreApiKeys } = await listAppPublicApiKeys({
    client,
    path: { project_id: project.id, app_id: playStoreApp.id },
  });

  console.log("\n====================");
  console.log("Prayer Space RevenueCat setup complete!");
  console.log("Project ID:", project.id);
  console.log("Test Store App ID:", testStoreApp.id);
  console.log("App Store App ID:", appStoreApp.id);
  console.log("Play Store App ID:", playStoreApp.id);
  console.log("Entitlement Identifier:", ENTITLEMENT_IDENTIFIER);
  console.log("Offering Identifier:", OFFERING_IDENTIFIER);
  console.log("Packages:", TIERS.map((t) => t.packageId).join(", "));
  console.log("Public API Keys - Test Store:", testStoreApiKeys?.items.map((item) => item.key).join(", ") ?? "N/A");
  console.log("Public API Keys - App Store:", appStoreApiKeys?.items.map((item) => item.key).join(", ") ?? "N/A");
  console.log("Public API Keys - Play Store:", playStoreApiKeys?.items.map((item) => item.key).join(", ") ?? "N/A");
  console.log("====================\n");
  console.log("Next steps:");
  console.log("Set these environment variables:");
  console.log("  REVENUECAT_PROJECT_ID=" + project.id);
  console.log("  REVENUECAT_TEST_STORE_APP_ID=" + testStoreApp.id);
  console.log("  REVENUECAT_APPLE_APP_STORE_APP_ID=" + appStoreApp.id);
  console.log("  REVENUECAT_GOOGLE_PLAY_STORE_APP_ID=" + playStoreApp.id);
  console.log("  EXPO_PUBLIC_REVENUECAT_TEST_API_KEY=" + (testStoreApiKeys?.items[0]?.key ?? "<test_key>"));
  console.log("  EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=" + (appStoreApiKeys?.items[0]?.key ?? "<ios_key>"));
  console.log("  EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=" + (playStoreApiKeys?.items[0]?.key ?? "<android_key>"));
}

seedRevenueCat().catch(console.error);
