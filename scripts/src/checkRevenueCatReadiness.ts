// Read-only store configuration audit. Never logs credentials or customer data.
import {
  listApps, listProducts, listEntitlements, listOfferings, listPackages,
  getProductsFromEntitlement,
} from "@replit/revenuecat-sdk";
import { getUncachableRevenueCatClient } from "./revenueCatClient";

async function main() {
  const projectId = process.env.REVENUECAT_PROJECT_ID;
  if (!projectId) throw new Error("REVENUECAT_PROJECT_ID is required");
  const client = await getUncachableRevenueCatClient();
  const path = { project_id: projectId };
  const [apps, products, entitlements, offerings] = await Promise.all([
    listApps({ client, path, query: { limit: 100 } }),
    listProducts({ client, path, query: { limit: 100 } }),
    listEntitlements({ client, path, query: { limit: 100 } }),
    listOfferings({ client, path, query: { limit: 100 } }),
  ]);
  for (const [name, result] of Object.entries({ apps, products, entitlements, offerings })) {
    if (result.error) {
      throw new Error(`${name} audit failed: HTTP ${result.response.status}`);
    }
    if (result.data?.next_page) throw new Error(`${name} has additional pages; audit is incomplete`);
  }
  console.log("APPS", JSON.stringify(apps.data?.items.map(app => ({
    id: app.id, name: app.name, type: app.type,
    apple: app.app_store,
    google: app.play_store ? {
      package_name: app.play_store.package_name,
    } : undefined,
  })), null, 2));
  console.log("PRODUCTS", JSON.stringify(products.data?.items.map(product => ({
    id: product.id, app_id: product.app_id,
    store_identifier: product.store_identifier, type: product.type,
  })), null, 2));
  for (const entitlement of entitlements.data?.items ?? []) {
    const linked = await getProductsFromEntitlement({
      client, path: { ...path, entitlement_id: entitlement.id }, query: { limit: 100 },
    });
    if (linked.error || linked.data?.next_page) throw new Error("Entitlement product audit incomplete");
    console.log("ENTITLEMENT", JSON.stringify({
      lookup_key: entitlement.lookup_key,
      products: linked.data?.items.map(product => product.store_identifier),
    }));
  }
  for (const offering of offerings.data?.items ?? []) {
    const packages = await listPackages({
      client, path: { ...path, offering_id: offering.id },
      query: { limit: 100, expand: ["items.product"] },
    });
    if (packages.error || packages.data?.next_page) throw new Error("Offering package audit incomplete");
    console.log("OFFERING", JSON.stringify({
      lookup_key: offering.lookup_key, is_current: offering.is_current,
      packages: packages.data?.items.map(pkg => ({
        lookup_key: pkg.lookup_key,
        products: pkg.products?.items.map(item => ({
          app_id: item.product.app_id,
          store_identifier: item.product.store_identifier,
        })),
      })),
    }, null, 2));
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "RevenueCat audit failed");
  process.exitCode = 1;
});
