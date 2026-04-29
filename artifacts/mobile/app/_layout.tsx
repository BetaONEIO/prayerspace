import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { PrayerProvider } from "@/providers/PrayerProvider";
import { FavouritesProvider } from "@/providers/FavouritesProvider";
import { NotificationsProvider } from "@/providers/NotificationsProvider";
import { SelectedRecipientsProvider } from "@/providers/SelectedRecipientsProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import SmartRatingModal from "@/components/SmartRatingModal";
import { useReviewPrompt, recordAppOpen } from "@/hooks/useReviewPrompt";
import { ratingStore, type RatingTriggerEvent } from "@/lib/ratingStore";
import { initializeRevenueCat, SubscriptionProvider } from "@/lib/revenuecat";

try {
  initializeRevenueCat();
} catch (err: unknown) {
  const msg = err instanceof Error ? err.message : "Unknown error";
  console.warn("[RevenueCat] Initialization failed:", msg);
  if (__DEV__) Alert.alert("RevenueCat Unavailable", msg);
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const ONBOARDING_PREVIEW_EMAILS = ["david@betaone.io"];

function AuthGuard() {
  const { session, isInitialized, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup =
      segments[0] === "login" ||
      segments[0] === "register" ||
      segments[0] === "verify-otp";

    const isOnboardingPreviewUser = ONBOARDING_PREVIEW_EMAILS.includes(user?.email ?? "");

    if (!session && !inAuthGroup) {
      console.log("[AuthGuard] No session, redirecting to login");
      router.replace("/login");
    } else if (session && inAuthGroup && segments[0] !== "verify-otp") {
      const destination = isOnboardingPreviewUser ? "/onboarding" : "/";
      console.log("[AuthGuard] Session found, redirecting to", destination);
      router.replace(destination);
    }
  }, [session, isInitialized, segments, user]);

  return null;
}

function GlobalRatingPrompt() {
  const { showReview, checkAndShowPrompt, closeReview, handleReviewed } = useReviewPrompt();

  const handleTrigger = useCallback(
    async (event: RatingTriggerEvent) => {
      await checkAndShowPrompt(event);
    },
    [checkAndShowPrompt]
  );

  useEffect(() => {
    ratingStore.register(handleTrigger);
    return () => ratingStore.unregister();
  }, [handleTrigger]);

  return (
    <SmartRatingModal visible={showReview} onClose={closeReview} onRated={handleReviewed} />
  );
}

function RootLayoutNav() {
  return (
    <>
      <AuthGuard />
      <GlobalRatingPrompt />
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="verify-otp" options={{ headerShown: false }} />
      <Stack.Screen name="journal" options={{ headerShown: false }} />
      <Stack.Screen name="journal-entry" options={{ headerShown: false }} />
      <Stack.Screen name="prayer-mode" options={{ headerShown: false }} />
      <Stack.Screen name="meditative-prayer" options={{ headerShown: false }} />
      <Stack.Screen name="meditative-prayer-session" options={{ headerShown: false }} />
      <Stack.Screen name="prayer-space-pro" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="find-friend" options={{ headerShown: false }} />
      <Stack.Screen name="friend-requests" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
      <Stack.Screen name="my-posts" options={{ headerShown: false }} />
      <Stack.Screen name="prayer-stats" options={{ headerShown: false }} />
      <Stack.Screen name="top-hearts" options={{ headerShown: false }} />
      <Stack.Screen name="record-prayer" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="new-request" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="explore" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="bulk-notify" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ headerShown: false }} />
      <Stack.Screen name="help-centre" options={{ headerShown: false }} />
      <Stack.Screen name="privacy-settings" options={{ headerShown: false }} />
      <Stack.Screen name="notification-settings" options={{ headerShown: false }} />
      <Stack.Screen name="group/manage" options={{ headerShown: false }} />
    </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
    recordAppOpen().then(() => {
      ratingStore.trigger("app_open");
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SubscriptionProvider>
        <ThemeProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
              <PrayerProvider>
                <FavouritesProvider>
                  <NotificationsProvider>
                    <SelectedRecipientsProvider>
                      <RootLayoutNav />
                    </SelectedRecipientsProvider>
                  </NotificationsProvider>
                </FavouritesProvider>
              </PrayerProvider>
            </AuthProvider>
          </GestureHandlerRootView>
        </ThemeProvider>
      </SubscriptionProvider>
    </QueryClientProvider>
  );
}
