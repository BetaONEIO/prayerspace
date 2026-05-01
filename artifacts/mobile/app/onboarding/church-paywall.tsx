import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
} from "react-native";
import { AutoScrollView } from "@/components/AutoScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ShieldCheck,
  Users,
  Settings,
  Check,
  ChevronRight,
  Sparkles,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useOfferings, usePurchasePackage, useRestorePurchases } from "@/hooks/usePurchases";
import { churchMembershipStore } from "@/lib/churchMembershipStore";
import { communityStore } from "@/lib/communityStore";
import { PurchasesPackage } from "react-native-purchases";

type BillingInterval = "monthly" | "yearly";

interface ChurchTier {
  id: "church_small" | "church_medium" | "church_large";
  yearlyId: "church_small_yearly" | "church_medium_yearly" | "church_large_yearly";
  label: string;
  memberRange: string;
  monthlyFallback: string;
  yearlyFallback: string;
  yearlyMonthlyEquivFallback: string;
  tag?: string;
  features: string[];
}

const TIERS: ChurchTier[] = [
  {
    id: "church_small",
    yearlyId: "church_small_yearly",
    label: "Small",
    memberRange: "1–50 members",
    monthlyFallback: "$19.99",
    yearlyFallback: "$191.90",
    yearlyMonthlyEquivFallback: "$15.99",
    features: ["Private community", "Prayer requests", "Admin controls"],
  },
  {
    id: "church_medium",
    yearlyId: "church_medium_yearly",
    label: "Medium",
    memberRange: "51–150 members",
    monthlyFallback: "$39.99",
    yearlyFallback: "$383.90",
    yearlyMonthlyEquivFallback: "$31.99",
    tag: "Most popular",
    features: ["Everything in Small", "Member management", "Group channels"],
  },
  {
    id: "church_large",
    yearlyId: "church_large_yearly",
    label: "Large",
    memberRange: "151+ members",
    monthlyFallback: "$79.99",
    yearlyFallback: "$767.90",
    yearlyMonthlyEquivFallback: "$63.99",
    features: ["Everything in Medium", "Advanced analytics", "Priority support"],
  },
];

const INCLUDED_ALWAYS = [
  { icon: ShieldCheck, label: "Private, invite-only community" },
  { icon: Users, label: "Shared prayer wall for members" },
  { icon: Settings, label: "Full admin and moderation tools" },
];

function formatMonthlyEquiv(yearlyPkg: PurchasesPackage | undefined, fallback: string): string {
  if (!yearlyPkg?.product?.price) return `${fallback}/mo`;
  const monthly = yearlyPkg.product.price / 12;
  const currency = yearlyPkg.product.currencyCode ?? "";
  const symbol = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
  return `${symbol}${monthly.toFixed(2)}/mo`;
}

export default function ChurchPaywall() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [billing, setBilling] = useState<BillingInterval>("yearly");
  const [purchasingTier, setPurchasingTier] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const { data: offerings, isLoading: offeringsLoading } = useOfferings();
  const purchaseMutation = usePurchasePackage();
  const restoreMutation = useRestorePurchases();

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: billing === "monthly" ? 0 : 1,
      useNativeDriver: false,
      tension: 240,
      friction: 22,
    }).start();
  }, [billing, slideAnim]);

  const toggleLeft = slideAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "50%"] });

  const getPackage = (pkgId: string): PurchasesPackage | undefined => {
    const churchOffering = offerings?.all?.["church"] ?? offerings?.current;
    return churchOffering?.availablePackages?.find((p) => p.identifier === pkgId);
  };

  const getPriceDisplay = (tier: ChurchTier) => {
    if (billing === "monthly") {
      const pkg = getPackage(tier.id);
      const price = pkg?.product?.priceString ?? tier.monthlyFallback;
      return { main: `${price}/mo`, sub: null };
    } else {
      const pkg = getPackage(tier.yearlyId);
      const price = pkg?.product?.priceString ?? tier.yearlyFallback;
      const equiv = formatMonthlyEquiv(pkg, tier.yearlyMonthlyEquivFallback);
      return { main: `${price}/yr`, sub: equiv };
    }
  };

  const completeOnboarding = (tierId: string) => {
    const { churchName } = churchMembershipStore.getState();
    churchMembershipStore.setOwner(churchName, tierId);
    communityStore.addOwnedCommunity(churchName, tierId);
    router.push("/onboarding/church-complete" as never);
  };

  const handleSelectTier = async (tier: ChurchTier) => {
    if (purchasingTier) return;
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const tierId = billing === "monthly" ? tier.id : tier.yearlyId;
    setPurchasingTier(tierId);

    const pkg = getPackage(tierId);
    if (!pkg) {
      console.log(`[ChurchPaywall] No package for ${tierId} — proceeding without purchase.`);
      completeOnboarding(tierId);
      setPurchasingTier(null);
      return;
    }

    try {
      await purchaseMutation.mutateAsync(pkg);
      completeOnboarding(tierId);
    } catch (err: unknown) {
      const error = err as { userCancelled?: boolean; message?: string };
      if (!error?.userCancelled) {
        console.error("[ChurchPaywall] Purchase error:", error);
        Alert.alert("Something went wrong", error?.message ?? "Please try again.");
      }
    } finally {
      setPurchasingTier(null);
    }
  };

  const handleRestore = async () => {
    if (purchasingTier) return;
    try {
      await restoreMutation.mutateAsync();
      Alert.alert("Purchases restored", "Your previous purchase has been restored.");
    } catch {
      Alert.alert("Nothing to restore", "No previous purchase found for this account.");
    }
  };

  const isDisabled = !!purchasingTier || offeringsLoading;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <AutoScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headingArea}>
          <View style={styles.iconBadge}>
            <Sparkles size={20} color={colors.primary} />
          </View>
          <Text style={styles.title}>Choose your community plan</Text>
          <Text style={styles.subtitle}>
            Create a space for your church, ministry, or group to pray together.
          </Text>
        </View>

        {/* Billing toggle */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleTrack}>
            <Animated.View style={[styles.toggleThumb, { left: toggleLeft }]} />
            <Pressable
              style={styles.toggleOption}
              onPress={() => {
                setBilling("monthly");
                if (Platform.OS !== "web") void Haptics.selectionAsync();
              }}
            >
              <Text style={[styles.toggleLabel, billing === "monthly" && styles.toggleLabelActive]}>
                Monthly
              </Text>
            </Pressable>
            <Pressable
              style={styles.toggleOption}
              onPress={() => {
                setBilling("yearly");
                if (Platform.OS !== "web") void Haptics.selectionAsync();
              }}
            >
              <Text style={[styles.toggleLabel, billing === "yearly" && styles.toggleLabelActive]}>
                Yearly
              </Text>
            </Pressable>
          </View>
          {billing === "yearly" && (
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>Save 20%</Text>
            </View>
          )}
        </View>

        {/* Tier cards */}
        <View style={styles.tiers}>
          {TIERS.map((tier) => {
            const isPopular = !!tier.tag;
            const tierId = billing === "monthly" ? tier.id : tier.yearlyId;
            const isLoading = purchasingTier === tierId;
            const { main: priceMain, sub: priceSub } = getPriceDisplay(tier);

            return (
              <Pressable
                key={tier.id}
                style={({ pressed }) => [
                  styles.tierCard,
                  isPopular && styles.tierCardPopular,
                  isLoading && styles.tierCardActive,
                  pressed && !isDisabled && styles.tierCardPressed,
                  isDisabled && !isLoading && styles.tierCardDimmed,
                ]}
                onPress={() => { void handleSelectTier(tier); }}
                disabled={isDisabled}
                testID={`church-tier-${tier.id}`}
              >
                {isPopular && (
                  <View style={[styles.tierTag, isLoading && styles.tierTagActive]}>
                    <Text style={[styles.tierTagText, isLoading && styles.tierTagTextActive]}>
                      {tier.tag}
                    </Text>
                  </View>
                )}

                <View style={styles.tierHeader}>
                  <View style={styles.tierInfo}>
                    <Text style={[styles.tierLabel, isPopular && styles.tierLabelPopular]}>
                      {tier.label}
                    </Text>
                    <Text style={styles.tierRange}>{tier.memberRange}</Text>
                  </View>

                  <View style={styles.tierPricing}>
                    {offeringsLoading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <Text style={[styles.tierPrice, isPopular && styles.tierPricePopular]}>
                          {priceMain}
                        </Text>
                        {priceSub && (
                          <Text style={styles.tierPriceSub}>~{priceSub}</Text>
                        )}
                      </>
                    )}
                  </View>
                </View>

                <View style={styles.tierDivider} />

                <View style={styles.tierFeatures}>
                  {tier.features.map((f) => (
                    <View key={f} style={styles.tierFeatureRow}>
                      <View style={[styles.tierCheckIcon, isPopular && styles.tierCheckIconPopular]}>
                        <Check size={11} color={isPopular ? colors.primaryForeground : colors.primary} strokeWidth={3} />
                      </View>
                      <Text style={styles.tierFeatureText}>{f}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.tierCta}>
                  {isLoading ? (
                    <ActivityIndicator
                      size="small"
                      color={isPopular ? colors.primaryForeground : colors.primary}
                    />
                  ) : (
                    <View style={[styles.tierCtaBtn, isPopular && styles.tierCtaBtnPopular]}>
                      <Text style={[styles.tierCtaText, isPopular && styles.tierCtaTextPopular]}>
                        Get started
                      </Text>
                      <ChevronRight
                        size={16}
                        color={isPopular ? colors.primaryForeground : colors.primary}
                        strokeWidth={2.5}
                      />
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Included in all plans */}
        <View style={styles.allIncluded}>
          <Text style={styles.allIncludedTitle}>Included in every plan</Text>
          <View style={styles.allIncludedList}>
            {INCLUDED_ALWAYS.map((f) => {
              const Icon = f.icon;
              return (
                <View key={f.label} style={styles.includedRow}>
                  <View style={styles.includedIcon}>
                    <Icon size={15} color={colors.primary} />
                  </View>
                  <Text style={styles.includedLabel}>{f.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <Pressable
          style={styles.restoreBtn}
          onPress={() => { void handleRestore(); }}
          disabled={!!purchasingTier}
        >
          <Text style={styles.restoreText}>Restore previous purchase</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          {billing === "monthly"
            ? "Billed monthly. Cancel anytime."
            : "Billed annually. Cancel before renewal to avoid charges."}{" "}
          Prices may vary by region.
        </Text>
      </AutoScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 48 },

    headingArea: { alignItems: "center", gap: 10, marginBottom: 28 },
    iconBadge: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
      borderWidth: 1,
      borderColor: colors.primary + "30",
    },
    title: {
      fontSize: 26,
      fontWeight: "800" as const,
      color: colors.foreground,
      textAlign: "center",
      lineHeight: 34,
    },
    subtitle: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 22,
      maxWidth: 300,
    },

    toggleContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      marginBottom: 24,
    },
    toggleTrack: {
      flexDirection: "row",
      backgroundColor: colors.secondary,
      borderRadius: 24,
      padding: 3,
      position: "relative",
      borderWidth: 1,
      borderColor: colors.border,
      width: 200,
    },
    toggleThumb: {
      position: "absolute",
      top: 3,
      bottom: 3,
      width: "50%",
      backgroundColor: colors.card,
      borderRadius: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    toggleOption: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 8,
      zIndex: 1,
    },
    toggleLabel: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
    },
    toggleLabelActive: {
      color: colors.foreground,
    },
    saveBadge: {
      backgroundColor: "#DCFCE7",
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: "#86EFAC",
    },
    saveBadgeText: {
      fontSize: 11,
      fontWeight: "800" as const,
      color: "#166534",
      letterSpacing: 0.3,
    },

    tiers: { gap: 14, marginBottom: 24 },
    tierCard: {
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 20,
      paddingTop: 22,
      position: "relative",
      overflow: "hidden",
    },
    tierCardPopular: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    tierCardActive: {
      borderColor: colors.primary,
      opacity: 0.85,
    },
    tierCardPressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
    tierCardDimmed: { opacity: 0.55 },

    tierTag: {
      position: "absolute",
      top: -1,
      right: 18,
      backgroundColor: colors.secondary,
      borderBottomLeftRadius: 10,
      borderBottomRightRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: colors.border,
    },
    tierTagActive: {
      backgroundColor: colors.primaryForeground + "30",
      borderColor: colors.primaryForeground + "40",
    },
    tierTagText: {
      fontSize: 10,
      fontWeight: "800" as const,
      color: colors.mutedForeground,
      letterSpacing: 0.4,
    },
    tierTagTextActive: {
      color: colors.primaryForeground,
    },

    tierHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 16,
    },
    tierInfo: { gap: 3 },
    tierLabel: {
      fontSize: 20,
      fontWeight: "800" as const,
      color: colors.foreground,
    },
    tierLabelPopular: { color: colors.primaryForeground },
    tierRange: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontWeight: "500" as const,
    },
    tierPricing: { alignItems: "flex-end", gap: 2 },
    tierPrice: {
      fontSize: 18,
      fontWeight: "800" as const,
      color: colors.foreground,
    },
    tierPricePopular: { color: colors.primaryForeground },
    tierPriceSub: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontWeight: "500" as const,
    },

    tierDivider: {
      height: 1,
      backgroundColor: colors.border + "60",
      marginBottom: 14,
    },

    tierFeatures: { gap: 8, marginBottom: 18 },
    tierFeatureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    tierCheckIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    tierCheckIconPopular: {
      backgroundColor: colors.primaryForeground + "25",
    },
    tierFeatureText: {
      fontSize: 13,
      color: colors.mutedForeground,
      flex: 1,
    },

    tierCta: { alignItems: "center" },
    tierCtaBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 14,
      backgroundColor: colors.accent,
      borderWidth: 1.5,
      borderColor: colors.primary + "50",
    },
    tierCtaBtnPopular: {
      backgroundColor: colors.primaryForeground,
      borderColor: "transparent",
    },
    tierCtaText: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: colors.primary,
    },
    tierCtaTextPopular: {
      color: colors.primary,
    },

    allIncluded: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 18,
      gap: 14,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    allIncludedTitle: {
      fontSize: 13,
      fontWeight: "700" as const,
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    allIncludedList: { gap: 10 },
    includedRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    includedIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    includedLabel: {
      fontSize: 14,
      fontWeight: "500" as const,
      color: colors.foreground,
      flex: 1,
    },

    restoreBtn: { alignItems: "center", paddingVertical: 12, marginBottom: 4 },
    restoreText: { fontSize: 13, color: colors.mutedForeground },
    disclaimer: {
      fontSize: 11,
      color: colors.mutedForeground,
      textAlign: "center",
      fontStyle: "italic",
      lineHeight: 17,
      paddingHorizontal: 8,
    },
  });
}
