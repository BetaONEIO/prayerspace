import { useQuery, useMutation } from "@tanstack/react-query";
import Purchases, { type PurchasesOfferings, type PurchasesPackage } from "react-native-purchases";
import { useSubscription } from "@/lib/revenuecat";

export function useOfferings() {
  const { identityReady } = useSubscription();
  return useQuery<PurchasesOfferings>({
    queryKey: ["revenuecat", "offerings"],
    queryFn: () => Purchases.getOfferings(),
    staleTime: 5 * 60 * 1000,
    enabled: identityReady,
  });
}

export function usePurchasePackage() {
  const { purchase } = useSubscription();
  return useMutation({ mutationFn: (pkg: PurchasesPackage) => purchase(pkg) });
}

export function useRestorePurchases() {
  const { restore } = useSubscription();
  return useMutation({ mutationFn: () => restore() });
}

export function useCustomerInfo() {
  const { identityReady, userId } = useSubscription();
  return useQuery({
    queryKey: ["revenuecat", "customer-info", userId],
    queryFn: () => Purchases.getCustomerInfo(),
    enabled: identityReady,
    staleTime: 60000,
  });
}
