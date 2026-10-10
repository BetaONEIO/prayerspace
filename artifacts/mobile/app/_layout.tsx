import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useCallback } from "react";
import { Alert, View, Text, Pressable, ActivityIndicator, StyleSheet, Modal } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { GuidedTourProvider, useGuidedTour } from "@/providers/GuidedTourProvider";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PrayerProvider, usePrayer } from "@/providers/PrayerProvider";
import { FavouritesProvider, useFavourites } from "@/providers/FavouritesProvider";
import { NotificationsProvider } from "@/providers/NotificationsProvider";
import { SelectedRecipientsProvider } from "@/providers/SelectedRecipientsProvider";
import { ThemeProvider, useThemeColors } from "@/providers/ThemeProvider";
import SmartRatingModal from "@/components/SmartRatingModal";
import { useReviewPrompt, recordAppOpen } from "@/hooks/useReviewPrompt";
import { ratingStore, type RatingTriggerEvent } from "@/lib/ratingStore";
import { initializeRevenueCat, SubscriptionProvider } from "@/lib/revenuecat";
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://99dfa309c3f8908682618eb0362142fe@o4511344663986176.ingest.de.sentry.io/4511344668639312',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AuthGuard() {
  const { session, isInitialized, user, profile, isProfileLoading, profileError } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup =
      segments[0] === "login" ||
      segments[0] === "register" ||
      segments[0] === "verify-otp" ||
      segments[0] === "password-reset" ||
      segments[0] === "password-reset-verify" ||
      segments[0] === "password-reset-new";

    const inCompleteProfile = (segments[0] as string) === "complete-profile";

    if (!session && !inAuthGroup && !inCompleteProfile) {
      console.log("[AuthGuard] No session, redirecting to login");
      router.replace("/login");
      return;
    }

    // Verification controls its own save/readback outcome. Everywhere else,
    // required DOB completion takes priority over onboarding/home redirects.
    if (session && segments[0] !== "verify-otp") {
      if (isProfileLoading || profileError) return;
      const isOAuthUser =
        session.user.app_metadata?.provider &&
        session.user.app_metadata.provider !== "email";
      const isEmailUser = (session.user.app_metadata?.provider ?? "email") === "email";
      const needsDob = (isEmailUser || (isOAuthUser && profile !== null)) && !profile?.date_of_birth;
      if (needsDob && !inCompleteProfile) {
        console.log("[AuthGuard] User missing required DOB, redirecting to complete-profile");
        router.replace("/complete-profile" as never);
        return;
      }
      if (!needsDob && inCompleteProfile) {
        console.log("[AuthGuard] DOB already set, redirecting away from complete-profile");
        router.replace("/");
        return;
      }
      if (!needsDob && inAuthGroup) {
        router.replace("/");
      }
    }
  }, [session, isInitialized, segments, user, profile, isProfileLoading, profileError]);

  return null;
}

function GlobalRatingPrompt() {
  const { isShowing: tourShowing } = useGuidedTour();
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
    <SmartRatingModal visible={showReview && !tourShowing} onClose={closeReview} onRated={handleReviewed} />
  );
}

function RootLayoutNav() {
  const { isActive: isTourActive } = useGuidedTour();
  const { session, isProfileLoading, profileError, retryProfile, signOut } = useAuth();
  const colors = useThemeColors();
  const segments = useSegments();
  const prayerData = usePrayer();
  const favouritesData = useFavourites();
  const localDataLoading = prayerData.isLoading || favouritesData.isLoading;
  const localDataError = prayerData.loadError || favouritesData.loadError;
  // Verification handles its own save error. Keep the navigator mounted but
  // prevent interaction elsewhere while the required profile cannot load.
  const profileBlocked = session && segments[0] !== "verify-otp" &&
    (isProfileLoading || profileError || localDataLoading || localDataError);
  const profileGate = (
    <Modal visible={!!profileBlocked} animationType="none" onRequestClose={() => {}}>
      <View style={[profileGateStyles.container, { backgroundColor: colors.background }]}>
        {isProfileLoading || localDataLoading ? <ActivityIndicator color={colors.primary} /> : (
          <>
            <Text style={[profileGateStyles.title, { color: colors.foreground }]}>
              {localDataError ? "Your Data Could Not Load" : "Profile Could Not Load"}
            </Text>
            <Text style={[profileGateStyles.message, { color: colors.mutedForeground }]}>
              {localDataError
                ? "Your saved records could not be read safely. Please retry. No saved records have been replaced."
                : profileError?.message ?? "Your required profile could not be loaded. Please try again."}
            </Text>
            <Pressable onPress={() => {
              if (localDataError) {
                void prayerData.retryLocalData();
                void favouritesData.retryLocalData();
              } else void retryProfile();
            }} accessibilityRole="button"
              style={[profileGateStyles.button, { backgroundColor: colors.primary }]}>
              <Text style={{ color: colors.primaryForeground }}>Retry</Text>
            </Pressable>
            <Pressable onPress={() => void signOut()} accessibilityRole="button" style={profileGateStyles.button}>
              <Text style={{ color: colors.foreground }}>Sign Out</Text>
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
  return (
    <>
      <AuthGuard />
      {profileGate}
      <GlobalRatingPrompt />
    <Stack screenOptions={{ headerShown: false, animation: isTourActive ? "none" : undefined }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="verify-otp" options={{ headerShown: false }} />
      <Stack.Screen name="password-reset" options={{ headerShown: false }} />
      <Stack.Screen name="password-reset-verify" options={{ headerShown: false }} />
      <Stack.Screen name="password-reset-new" options={{ headerShown: false }} />
      <Stack.Screen name="journal" options={{ headerShown: false }} />
      <Stack.Screen name="journal-entry" options={{ headerShown: false }} />
      <Stack.Screen name="prayer-mode" options={{ headerShown: false }} />
      <Stack.Screen name="meditative-prayer" options={{ headerShown: false }} />
      <Stack.Screen name="meditative-prayer-session" options={{ headerShown: false }} />
      <Stack.Screen name="prayer-space-pro" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="find-friend" options={{ headerShown: false }} />
      <Stack.Screen name="friends" options={{ headerShown: false }} />
      <Stack.Screen name="friend-requests" options={{ headerShown: false }} />
      <Stack.Screen name="sent-friend-requests" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
      <Stack.Screen name="my-posts" options={{ headerShown: false }} />
      <Stack.Screen name="prayer-stats" options={{ headerShown: false }} />
      <Stack.Screen name="top-hearts" options={{ headerShown: false }} />
      <Stack.Screen name="record-prayer" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="new-request" options={{ presentation: isTourActive ? "card" : "modal", headerShown: false }} />
      <Stack.Screen name="explore" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ headerShown: false }} />
      <Stack.Screen name="complete-profile" options={{ headerShown: false }} />
      <Stack.Screen name="help-centre" options={{ headerShown: false }} />
      <Stack.Screen name="privacy-settings" options={{ headerShown: false }} />
      <Stack.Screen name="notification-settings" options={{ headerShown: false }} />
      <Stack.Screen name="group/manage" options={{ headerShown: false }} />
    </Stack>
    </>
  );
}

const profileGateStyles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, gap: 16 },
  title: { fontSize: 22, fontWeight: "700" },
  message: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  button: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 18 },
});

function AccountProviders() {
  const { localDataEpoch } = useAuth();
  // Reset private providers and screens together, not one effect after render.
  return (
    <React.Fragment key={localDataEpoch}>
      <SubscriptionProvider>
        <PrayerProvider>
          <FavouritesProvider>
            <NotificationsProvider>
              <SelectedRecipientsProvider>
                <SafeAreaProvider>
                  <GuidedTourProvider>
                    <RootLayoutNav />
                  </GuidedTourProvider>
                </SafeAreaProvider>
              </SelectedRecipientsProvider>
            </NotificationsProvider>
          </FavouritesProvider>
        </PrayerProvider>
      </SubscriptionProvider>
    </React.Fragment>
  );
}

export default Sentry.wrap(function RootLayout() {
  useEffect(() => {
    try {
      initializeRevenueCat();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.warn("[RevenueCat] Initialization failed:", msg);
      if (__DEV__) Alert.alert("RevenueCat Unavailable", msg);
    }

    SplashScreen.hideAsync();
    recordAppOpen().then(() => {
      ratingStore.trigger("app_open");
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
            <AuthProvider>
              <AccountProviders />
            </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </ThemeProvider>
    </QueryClientProvider>
  );
});
