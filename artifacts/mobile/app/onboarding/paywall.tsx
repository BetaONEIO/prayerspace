import React, { useState, useMemo} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X, Users, Heart, BookOpen } from "lucide-react-native";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";
import { useOfferings, usePurchasePackage, useRestorePurchases } from "@/hooks/usePurchases";
import { PurchasesPackage } from "react-native-purchases";

const FEATURES = [
  {
    id: "community",
    icon: Users,
    title: "Connect with Others",
    desc: "Join communities and prayer groups, and pray together.",
  },
  {
    id: "notify",
    icon: Heart,
    title: "Let Others Know You've Prayed",
    desc: "Encourage others by sending a message when you've prayed for them.",
  },
  {
    id: "journal",
    icon: BookOpen,
    title: "Prayer Journal",
    desc: "Keep a personal record of your prayers and look back on how God has moved.",
  },
];

export default function OnboardingPaywall() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [plan, setPlan] = useState<"yearly" | "monthly">("yearly");

  const { data: offerings, isLoading: offeringsLoading } = useOfferings();
  const purchaseMutation = usePurchasePackage();
  const restoreMutation = useRestorePurchases();

  const monthlyPackage: PurchasesPackage | undefined = offerings?.current?.monthly ?? undefined;
  const annualPackage: PurchasesPackage | undefined = offerings?.current?.annual ?? undefined;

  const selectedPackage = plan === "yearly" ? annualPackage : monthlyPackage;

  const monthlyPrice = monthlyPackage?.product?.priceString ?? "$5.99/mo";
  const annualPrice = annualPackage?.product?.priceString ?? "$49.99/yr";

  const handleClose = () => {
    router.push("/onboarding/contact-permissions" as never);
  };

  const handleTrial = async () => {
    if (!selectedPackage) {
      console.log("[Paywall] No package loaded yet — skipping purchase, proceeding to next step.");
      router.push("/onboarding/contact-permissions" as never);
      return;
    }
    try {
      await purchaseMutation.mutateAsync(selectedPackage);
      router.push("/onboarding/contact-permissions" as never);
    } catch (err: unknown) {
      const error = err as { userCancelled?: boolean; message?: string };
      if (!error?.userCancelled) {
        console.error("[Paywall] Purchase error:", error);
        Alert.alert("Something went wrong", error?.message ?? "Please try again.");
      }
    }
  };

  const handleRestore = async () => {
    try {
      const info = await restoreMutation.mutateAsync();
      const hasPremium = info.entitlements.active["premium"];
      if (hasPremium) {
        router.push("/onboarding/contact-permissions" as never);
      } else {
        Alert.alert("Nothing to restore", "No active subscription found.");
      }
    } catch (err) {
      console.error("[Paywall] Restore error:", err);
      Alert.alert("Restore failed", "Please try again.");
    }
  };

  const isPurchasing = purchaseMutation.isPending;
  const isRestoring = restoreMutation.isPending;

  return (
    <View style={styles.outerContainer}>
      <Image
        source={{
          uri: "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/Dsd9kebVr6M/components/meaFR0ICigT.png",
        }}
        style={styles.bgImage}
        resizeMode="cover"
      />
      <View style={styles.bgOverlay} />

      <SafeAreaView style={styles.safeArea}>
        <Pressable
          style={({ pressed }) => [
            styles.closeBtn,
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleClose}
          testID="paywall-close"
        >
          <X size={22} color={colors.mutedForeground} />
        </Pressable>

        <AutoScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconArea}>
            <Image
              source={{ uri: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/h0l532c787cc9aqn15hxr.png" }}
              style={styles.proBadgeImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>Deepen Your Prayer Life</Text>
          <Text style={styles.subtitle}>
            Simple tools to help you pray more deeply and stay connected with others.
          </Text>

          <View style={styles.featureList}>
            {FEATURES.map((f) => {
              const IconComp = f.icon;
              return (
                <View key={f.id} style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    <IconComp size={20} color={colors.primary} />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureDesc}>{f.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={styles.habitLine}>Build a daily habit of prayer and encouragement</Text>

          <View style={styles.planRow}>
            <Pressable
              style={[styles.planCard, plan === "yearly" && styles.planCardSelected]}
              onPress={() => setPlan("yearly")}
              testID="plan-yearly"
            >
              <View style={styles.bestValueBadge}>
                <Text style={[styles.bestValueText, plan !== "yearly" && styles.bestValueTextMuted]}>BEST VALUE</Text>
              </View>
              <Text style={styles.planName}>Yearly</Text>
              {offeringsLoading ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 4 }} />
              ) : (
                <Text style={styles.planPrice}>{annualPrice}</Text>
              )}
            </Pressable>

            <Pressable
              style={[styles.planCard, plan === "monthly" && styles.planCardSelected]}
              onPress={() => setPlan("monthly")}
              testID="plan-monthly"
            >
              <View style={styles.bestValueBadge}>
                <Text style={[styles.bestValueText, plan !== "monthly" && styles.bestValueTextMuted]}>FLEXIBLE</Text>
              </View>
              <Text style={styles.planName}>Monthly</Text>
              {offeringsLoading ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 4 }} />
              ) : (
                <Text style={styles.planPrice}>{monthlyPrice}</Text>
              )}
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.trialBtn,
              pressed && !isPurchasing && styles.btnPressed,
              isPurchasing && styles.btnDisabled,
            ]}
            onPress={handleTrial}
            disabled={isPurchasing || offeringsLoading}
            testID="paywall-trial"
          >
            {isPurchasing ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.trialBtnText}>Start 7-Day Free Trial</Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.restoreBtn, pressed && { opacity: 0.6 }]}
            onPress={handleRestore}
            disabled={isRestoring}
            testID="paywall-restore"
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
              <Text style={styles.restoreText}>Restore Purchases</Text>
            )}
          </Pressable>

          <Text style={styles.disclaimer}>
            No commitment. Cancel anytime. Privacy Policy & Terms of Service.
          </Text>
        </AutoScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bgImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    opacity: 0.3,
  },
  bgOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    opacity: 0.5,
  },
  safeArea: {
    flex: 1,
  },
  closeBtn: {
    position: "absolute",
    top: 56,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.06)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: "center",
  },
  iconArea: {
    marginBottom: 24,
  },
  proBadgeImage: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 30,
    fontWeight: "800" as const,
    color: colors.foreground,
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 38,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 23,
    maxWidth: 300,
    marginBottom: 32,
  },
  featureList: {
    width: "100%",
    gap: 12,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border + "80",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
    gap: 3,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.foreground,
  },
  featureDesc: {
    fontSize: 12,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  habitLine: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 16,
    lineHeight: 20,
    maxWidth: 260,
  },
  planRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginBottom: 16,
  },
  planCard: {
    flex: 1,
    padding: 18,
    paddingTop: 24,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    position: "relative",
    minHeight: 100,
    justifyContent: "center",
  },
  planCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.accent + "40",
  },
  bestValueBadge: {
    position: "absolute",
    top: -12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bestValueText: {
    fontSize: 8,
    fontWeight: "800" as const,
    color: colors.primary,
    letterSpacing: 0.8,
  },
  bestValueTextMuted: {
    color: colors.mutedForeground,
  },
  planName: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: colors.foreground,
    marginBottom: 4,
    marginTop: 8,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: colors.primary,
  },
  trialBtn: {
    width: "100%",
    height: 62,
    backgroundColor: colors.primary,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 12,
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  btnDisabled: {
    opacity: 0.7,
  },
  trialBtnText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.primaryForeground,
  },
  restoreBtn: {
    paddingVertical: 10,
    marginBottom: 10,
  },
  restoreText: {
    fontSize: 13,
    color: colors.mutedForeground,
    textDecorationLine: "underline",
  },
  disclaimer: {
    fontSize: 11,
    color: colors.mutedForeground,
    textAlign: "center",
    fontStyle: "italic",
    paddingHorizontal: 24,
    lineHeight: 17,
  },
});
