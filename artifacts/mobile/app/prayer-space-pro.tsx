import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, BookOpen, Users, Heart, Bell, Mic } from "lucide-react-native";
import { LightColors as Colors } from "@/constants/colors";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";
import { useOfferings, usePurchasePackage, useRestorePurchases } from "@/hooks/usePurchases";
import { PurchasesPackage } from "react-native-purchases";

const FEATURES = [
  {
    id: "journal",
    icon: BookOpen,
    title: "Unlimited Prayer Journal",
    desc: "Keep a deep, personal record of your prayers. Look back on how God has moved.",
  },
  {
    id: "community",
    icon: Users,
    title: "Private Prayer Groups",
    desc: "Create and join private groups for deeper, more intentional prayer together.",
  },
  {
    id: "praying",
    icon: Heart,
    title: "Praying For List",
    desc: "Track the people you're intentionally keeping in prayer — your personal list.",
  },
  {
    id: "reminders",
    icon: Bell,
    title: "Prayer Reminders",
    desc: "Set gentle reminders to help you build a consistent, daily habit of prayer.",
  },
  {
    id: "audio",
    icon: Mic,
    title: "Voice Prayer Recording",
    desc: "Record and save your spoken prayers for a more expressive, personal experience.",
  },
];

export default function PrayerSpaceProScreen() {
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

  const handleTrial = async () => {
    if (!selectedPackage) {
      console.log("[PrayerSpacePro] No package selected, plan:", plan);
      Alert.alert("Not available", "Please try again in a moment.");
      return;
    }
    try {
      await purchaseMutation.mutateAsync(selectedPackage);
      Alert.alert("Welcome to Pro!", "Your 7-day free trial has begun.", [
        { text: "Continue", onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      const error = err as { userCancelled?: boolean; message?: string };
      if (!error?.userCancelled) {
        console.error("[PrayerSpacePro] Purchase error:", error);
        Alert.alert("Something went wrong", error?.message ?? "Please try again.");
      }
    }
  };

  const handleRestore = async () => {
    try {
      const info = await restoreMutation.mutateAsync();
      const hasPremium = info.entitlements.active["premium"];
      if (hasPremium) {
        Alert.alert("Restored!", "Your subscription has been restored.", [
          { text: "Continue", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Nothing to restore", "No active subscription found.");
      }
    } catch (err) {
      console.error("[PrayerSpacePro] Restore error:", err);
      Alert.alert("Restore failed", "Please try again.");
    }
  };

  const isPurchasing = purchaseMutation.isPending;
  const isRestoring = restoreMutation.isPending;

  return (
    <View style={styles.container}>
      <Image
        source={{
          uri: "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/Dsd9kebVr6M/components/meaFR0ICigT.png",
        }}
        style={styles.bgImage}
        resizeMode="cover"
      />
      <View style={styles.bgOverlay} />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
            onPress={() => router.back()}
            testID="pro-back-btn"
          >
            <ArrowLeft size={20} color={Colors.foreground} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.badgeArea}>
            <Image
              source={{ uri: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/h0l532c787cc9aqn15hxr.png" }}
              style={styles.proBadgeImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>Prayer Space Pro</Text>
          <Text style={styles.subtitle}>
            Deepen your time in prayer with tools built for intentional, consistent spiritual growth.
          </Text>

          <View style={styles.featureList}>
            {FEATURES.map((f) => {
              const IconComp = f.icon;
              return (
                <View key={f.id} style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    <IconComp size={20} color={Colors.primary} />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureDesc}>{f.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.planRow}>
            <Pressable
              style={[styles.planCard, plan === "yearly" && styles.planCardSelected]}
              onPress={() => setPlan("yearly")}
              testID="plan-yearly"
            >
              <View style={styles.bestValueBadge}>
                <Text style={[styles.bestValueText, plan !== "yearly" && styles.bestValueTextMuted]}>
                  BEST VALUE
                </Text>
              </View>
              <Text style={styles.planName}>Yearly</Text>
              {offeringsLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <Text style={styles.planPrice}>{annualPrice}</Text>
                  <Text style={styles.planPerMonth}>$4.17 / month</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={[styles.planCard, plan === "monthly" && styles.planCardSelected]}
              onPress={() => setPlan("monthly")}
              testID="plan-monthly"
            >
              <View style={styles.bestValueBadge}>
                <Text style={[styles.bestValueText, plan !== "monthly" && styles.bestValueTextMuted]}>
                  FLEXIBLE
                </Text>
              </View>
              <Text style={styles.planName}>Monthly</Text>
              {offeringsLoading ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <>
                  <Text style={styles.planPrice}>{monthlyPrice}</Text>
                  <Text style={styles.planPerMonth}>Billed monthly</Text>
                </>
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
            testID="pro-trial-btn"
          >
            {isPurchasing ? (
              <ActivityIndicator color={Colors.primaryForeground} />
            ) : (
              <Text style={styles.trialBtnText}>Start 7-Day Free Trial</Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.restoreBtn, pressed && { opacity: 0.6 }]}
            onPress={handleRestore}
            disabled={isRestoring}
            testID="pro-restore-btn"
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={Colors.mutedForeground} />
            ) : (
              <Text style={styles.restoreText}>Restore Purchases</Text>
            )}
          </Pressable>

          <Text style={styles.disclaimer}>
            No commitment. Cancel anytime.{"\n"}Privacy Policy & Terms of Service apply.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bgImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "45%",
    opacity: 0.25,
  },
  bgOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    opacity: 0.55,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 48,
    alignItems: "center",
  },
  badgeArea: {
    marginBottom: 20,
  },
  proBadgeImage: {
    width: 90,
    height: 90,
  },
  title: {
    fontSize: 30,
    fontWeight: "800" as const,
    color: Colors.foreground,
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 38,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.mutedForeground,
    textAlign: "center",
    lineHeight: 23,
    maxWidth: 300,
    marginBottom: 28,
  },
  featureList: {
    width: "100%",
    gap: 10,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border + "80",
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
    backgroundColor: Colors.accent,
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
    color: Colors.foreground,
  },
  featureDesc: {
    fontSize: 12,
    color: Colors.mutedForeground,
    lineHeight: 18,
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
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    alignItems: "center",
    position: "relative",
    paddingTop: 24,
    minHeight: 110,
    justifyContent: "center",
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.accent + "40",
  },
  bestValueBadge: {
    position: "absolute",
    top: -11,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bestValueText: {
    fontSize: 8,
    fontWeight: "800" as const,
    color: Colors.primary,
    letterSpacing: 0.8,
  },
  bestValueTextMuted: {
    color: Colors.mutedForeground,
  },
  planName: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.foreground,
    marginBottom: 4,
    marginTop: 8,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.primary,
  },
  planPriceSub: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: Colors.mutedForeground,
  },
  planPerMonth: {
    fontSize: 10,
    color: Colors.mutedForeground,
    marginTop: 3,
    fontWeight: "500" as const,
  },
  trialBtn: {
    width: "100%",
    height: 60,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 14,
  },
  btnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  btnDisabled: {
    opacity: 0.7,
  },
  trialBtnText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.primaryForeground,
  },
  restoreBtn: {
    paddingVertical: 10,
    marginBottom: 12,
  },
  restoreText: {
    fontSize: 13,
    color: Colors.mutedForeground,
    textDecorationLine: "underline",
  },
  disclaimer: {
    fontSize: 11,
    color: Colors.mutedForeground,
    textAlign: "center",
    fontStyle: "italic",
    lineHeight: 17,
  },
});
