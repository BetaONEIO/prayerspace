import { useQuery, useMutation } from "@tanstack/react-query";
import Purchases, { PurchasesOfferings, PurchasesPackage } from "react-native-purchases";

export function useOfferings() {
  return useQuery<PurchasesOfferings>({
    queryKey: ["rc-offerings"],
    queryFn: async () => {
      console.log("[RevenueCat] Fetching offerings...");
      const offerings = await Purchases.getOfferings();
      console.log("[RevenueCat] Offerings fetched:", JSON.stringify(offerings?.current?.availablePackages?.map(p => p.identifier)));
      return offerings;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function usePurchasePackage() {
  return useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      console.log("[RevenueCat] Purchasing package:", pkg.identifier);
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      console.log("[RevenueCat] Purchase complete. Active entitlements:", Object.keys(customerInfo.entitlements.active));
      return customerInfo;
    },
  });
}

export function useRestorePurchases() {
  return useMutation({
    mutationFn: async () => {
      console.log("[RevenueCat] Restoring purchases...");
      const customerInfo = await Purchases.restorePurchases();
      console.log("[RevenueCat] Restore complete. Active entitlements:", Object.keys(customerInfo.entitlements.active));
      return customerInfo;
    },
  });
}

export function useCustomerInfo() {
  return useQuery({
    queryKey: ["rc-customer-info"],
    queryFn: async () => {
      const info = await Purchases.getCustomerInfo();
      return info;
    },
  });
}
