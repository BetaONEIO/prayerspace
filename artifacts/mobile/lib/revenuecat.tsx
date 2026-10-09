import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "./supabase";
import { churchMembershipStore } from "./churchMembershipStore";
import { communityStore } from "./communityStore";

let identityQueue: Promise<unknown> = Promise.resolve();

const REVENUECAT_TEST_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_TEST_API_KEY;
const REVENUECAT_IOS_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
const REVENUECAT_ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

export const REVENUECAT_ENTITLEMENT_IDENTIFIER = "premium_community";

function getRevenueCatApiKey() {
  if (!REVENUECAT_TEST_API_KEY || !REVENUECAT_IOS_API_KEY || !REVENUECAT_ANDROID_API_KEY) {
    throw new Error("RevenueCat Public API Keys not found. Set EXPO_PUBLIC_REVENUECAT_TEST_API_KEY, EXPO_PUBLIC_REVENUECAT_IOS_API_KEY and EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY.");
  }

  if (__DEV__ || Platform.OS === "web" || Constants.executionEnvironment === "storeClient") {
    return REVENUECAT_TEST_API_KEY;
  }

  if (Platform.OS === "ios") return REVENUECAT_IOS_API_KEY;
  if (Platform.OS === "android") return REVENUECAT_ANDROID_API_KEY;

  return REVENUECAT_TEST_API_KEY;
}

export function initializeRevenueCat() {
  const apiKey = getRevenueCatApiKey();
  Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey });
  console.log("[RevenueCat] Configured with", __DEV__ ? "test" : Platform.OS, "key");
}

function useSubscriptionContext() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const [readyUserId, setReadyUserId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setReadyUserId(null);
    churchMembershipStore.clearMember();
    communityStore.clear();
    if (userId) {
      void communityStore.reload(userId).then((communities) => {
        if (!active) return;
        const owned = communities.find((c) => c.isOwned);
        if (owned) churchMembershipStore.setOwner(owned.name, "church_free");
        else if (communities[0]) churchMembershipStore.setMember(communities[0].name);
      }).catch(() => console.error("[Community] Could not restore memberships. Please retry."));
    }
    identityQueue = identityQueue.catch(() => undefined).then(async () => {
      const appUserId = await Purchases.getAppUserID();
      if (userId && appUserId !== userId) await Purchases.logIn(userId);
      if (!userId && !appUserId.startsWith("$RCAnonymousID:")) await Purchases.logOut();
      if (active) {
        setReadyUserId(userId);
      }
    }).catch(() => {
      if (active) setReadyUserId(null);
      console.error("[RevenueCat] Could not connect purchases to this account.");
    });
    return () => { active = false; };
  }, [userId]);
  const identityReady = !!userId && readyUserId === userId;
  const customerKey = ["revenuecat", "customer-info", userId];
  const customerInfoQuery = useQuery({
    queryKey: customerKey,
    queryFn: () => Purchases.getCustomerInfo(),
    staleTime: 60 * 1000,
    enabled: identityReady,
    refetchInterval: identityReady ? 60000 : false,
  });

  const offeringsQuery = useQuery({
    queryKey: ["revenuecat", "offerings"],
    queryFn: () => Purchases.getOfferings(),
    staleTime: 300 * 1000,
    enabled: identityReady,
  });

  const checkIdentity = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!identityReady || !userId || session?.user.id !== userId ||
      await Purchases.getAppUserID() !== userId) {
      throw new Error("Purchases are not ready for this account. Please sign in again and retry.");
    }
  };
  const purchaseMutation = useMutation({
    mutationFn: async (pkg: Parameters<typeof Purchases.purchasePackage>[0]) => {
      await checkIdentity();
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      await checkIdentity();
      return customerInfo;
    },
    onSuccess: (info) => {
      queryClient.setQueryData(customerKey, info);
      void queryClient.invalidateQueries({ queryKey: ["verified-community-access"] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      await checkIdentity();
      const info = await Purchases.restorePurchases();
      await checkIdentity();
      return info;
    },
    onSuccess: (info) => {
      queryClient.setQueryData(customerKey, info);
      void queryClient.invalidateQueries({ queryKey: ["verified-community-access"] });
    },
  });

  const isSubscribed =
    identityReady && customerInfoQuery.data?.entitlements.active?.[REVENUECAT_ENTITLEMENT_IDENTIFIER]?.isActive === true;

  return {
    customerInfo: identityReady ? customerInfoQuery.data : undefined,
    offerings: offeringsQuery.data,
    isSubscribed,
    isLoading: customerInfoQuery.isLoading || offeringsQuery.isLoading,
    purchase: purchaseMutation.mutateAsync,
    restore: restoreMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    isRestoring: restoreMutation.isPending,
    identityReady,
    userId,
  };
}

type SubscriptionContextValue = ReturnType<typeof useSubscriptionContext>;
const Context = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const value = useSubscriptionContext();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSubscription() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useSubscription must be used within a SubscriptionProvider");
  return ctx;
}
