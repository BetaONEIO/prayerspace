import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
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
  Star,
  X,
  Gift,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useOfferings, usePurchasePackage, useRestorePurchases } from "@/hooks/usePurchases";
import { communityTier } from "@/lib/billingEntitlements";
import { verifiedCommunityAccess } from "@/lib/verifiedCommunityAccess";
import { churchMembershipStore } from "@/lib/churchMembershipStore";
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

const FREE_FEATURES = [
  "1 Prayer Community",
  "Up to 10 community members",
  "Prayer requests",
  "Community feed",
  "Group chat",
  "Basic notifications",
  "1 Community Administrator",
];

const TIERS: ChurchTier[] = [
  {
    id: "church_small",
    yearlyId: "church_small_yearly",
    label: "Small",
    memberRange: "1–50 members",
    monthlyFallback: "£19.99",
    yearlyFallback: "£191.90",
    yearlyMonthlyEquivFallback: "£15.99",
    features: ["Private community", "Prayer requests", "Admin controls"],
  },
  {
    id: "church_medium",
    yearlyId: "church_medium_yearly",
    label: "Medium",
    memberRange: "51–150 members",
    monthlyFallback: "£39.99",
    yearlyFallback: "£383.90",
    yearlyMonthlyEquivFallback: "£31.99",
    tag: "Most popular",
    features: ["Everything in Small", "Member management", "Group channels"],
  },
  {
    id: "church_large",
    yearlyId: "church_large_yearly",
    label: "Large",
    memberRange: "151+ members",
    monthlyFallback: "£79.99",
    yearlyFallback: "£767.90",
    yearlyMonthlyEquivFallback: "£63.99",
    features: ["Everything in Medium", "Advanced analytics", "Priority support"],
  },
];

const INCLUDED_ALWAYS = [
  { icon: ShieldCheck, label: "Private, invite-only Prayer Community" },
  { icon: Users, label: "Shared prayer wall for community members" },
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
  const slideAnim = useRef(new Animated.Value(1)).current;
  const dismissedRef = useRef(false);

  const handleClose = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    router.back();
  }, [router]);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (y < -72 && !dismissedRef.current && !purchasingTier) {
      dismissedRef.current = true;
      if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.back();
    }
  }, [router, purchasingTier]);

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
    const churchOffering = offerings?.all?.["church"];
    return churchOffering?.availablePackages?.find((p) => p.identifier === pkgId);
  };

  const getPriceDisplay = (tier: ChurchTier) => {
    if (billing === "monthly") {
      const pkg = getPackage(tier.id);
      return { main: pkg?.product.priceString ?? "Not available", period: pkg ? "/mo" : "", sub: null };
    } else {
      const pkg = getPackage(tier.yearlyId);
      if (!pkg) return { main: "Not available", period: "", sub: null };
      const price = pkg.product.priceString;
      const equiv = new Intl.NumberFormat(undefined, { style: "currency", currency: pkg.product.currencyCode }).format(pkg.product.price / 12);
      return { main: equiv, period: "/mo", sub: `${price} billed yearly` };
    }
  };

  const completeOnboarding = (tierId: string) => {
    churchMembershipStore.setOwner(null, tierId);
    router.push("/onboarding/plus-welcome" as never);
  };

  const handleSelectFree = () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    churchMembershipStore.setOwner(null, "church_free");
    router.replace("/onboarding/church-group-type" as never);
  };

  const handleSelectTier = async (tier: ChurchTier) => {
    if (purchasingTier) return;
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const tierId = billing === "monthly" ? tier.id : tier.yearlyId;
    setPurchasingTier(tierId);

    const pkg = getPackage(tierId);
    if (!pkg) {
      Alert.alert("Plan unavailable", "This plan cannot be purchased right now. Please retry or choose the free plan.");
      setPurchasingTier(null);
      return;
    }

    try {
      const info = await purchaseMutation.mutateAsync(pkg);
      const verifiedTier = communityTier(info);
      if (!verifiedTier) throw new Error("An active community subscription could not be confirmed.");
      if (!await verifiedCommunityAccess()) throw new Error("Your subscription is not confirmed yet. Try Restore Purchases in a moment.");
      completeOnboarding(verifiedTier);
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
      const info = await restoreMutation.mutateAsync();
      const tier = communityTier(info);
      if (!tier) {
        churchMembershipStore.downgrade();
        Alert.alert("Nothing to restore", "No active community subscription was found for this account.");
        return;
      }
      if (!await verifiedCommunityAccess()) throw new Error("Your community subscription could not be verified yet. Please retry.");
      churchMembershipStore.setOwner(null, tier);
      router.push("/onboarding/plus-welcome" as never);
    } catch {
      Alert.alert("Nothing to restore", "No previous purchase found for this account.");
    }
  };

  const isDisabled = !!purchasingTier || offeringsLoading;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Sticky header row with close button */}
      <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Community Plans</Text>
        <Pressable
          style={[styles.closeBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
          onPress={handleClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={17} color={colors.mutedForeground} strokeWidth={2.5} />
        </Pressable>
      </View>

      <AutoScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces
      >
        {/* Drag-to-dismiss hint pill */}
        <View style={styles.dragPillWrap}>
          <View style={[styles.dragPill, { backgroundColor: colors.border }]} />
        </View>

        {/* Page heading */}
        <View style={styles.headingArea}>
          <View style={styles.iconBadge}>
            <Sparkles size={18} color={colors.primary} />
          </View>
          <Text style={styles.headingTitle}>Choose a Community Plan</Text>
          <Text style={styles.subtitle}>
            Choose the right Community plan for your family, church or ministry. Start free and upgrade as your community grows.
          </Text>
        </View>

        {/* Billing toggle — only shown above paid tiers */}
        <View style={styles.toggleWrapper}>
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
          <View style={styles.saveBadge}>
            <Text style={styles.saveBadgeText}>Save 20%</Text>
          </View>
        </View>

        {/* Tier cards */}
        <View style={styles.tiers}>

          {/* ── Free Community card ── */}
          <Pressable
            style={({ pressed }) => [
              styles.tierCard,
              styles.tierCardFree,
              pressed && styles.tierCardPressed,
            ]}
            onPress={handleSelectFree}
            disabled={isDisabled}
            testID="church-tier-free"
          >
            {/* Free badge */}
            <View style={styles.freeBadge}>
              <Gift size={9} color="#166534" />
              <Text style={styles.freeBadgeText}>Always free</Text>
            </View>

            {/* Header row: name + price */}
            <View style={styles.tierHeader}>
              <View style={styles.tierInfo}>
                <Text style={[styles.tierLabel, styles.tierLabelFree]}>Free</Text>
                <Text style={styles.tierRange}>Up to 10 members</Text>
                <Text style={styles.freeDescription}>
                  Perfect for families, home groups, Bible studies and small prayer teams.
                </Text>
              </View>
              <View style={styles.tierPricing}>
                <View style={styles.tierPriceRow}>
                  <Text style={[styles.tierPrice, styles.tierPriceFree]}>£0</Text>
                </View>
                <Text style={[styles.tierPeriod, { color: colors.mutedForeground }]}>/mo</Text>
              </View>
            </View>

            {/* Features */}
            <View style={styles.tierFeatures}>
              {FREE_FEATURES.map((f) => (
                <View key={f} style={styles.tierFeatureRow}>
                  <View style={[styles.tierCheckIcon, styles.tierCheckIconFree]}>
                    <Check size={10} color="#166534" strokeWidth={3} />
                  </View>
                  <Text style={[styles.tierFeatureText, styles.tierFeatureTextFree]}>{f}</Text>
                </View>
              ))}
            </View>

            {/* CTA */}
            <View style={styles.tierCta}>
              <View style={[styles.tierCtaBtn, styles.tierCtaBtnFree]}>
                <Text style={[styles.tierCtaText, styles.tierCtaTextFree]}>
                  Create Free Community
                </Text>
                <ChevronRight size={15} color="#166534" strokeWidth={2.5} />
              </View>
            </View>
          </Pressable>

          {/* ── Paid tier cards ── */}
          {TIERS.map((tier) => {
            const isPopular = !!tier.tag;
            const tierId = billing === "monthly" ? tier.id : tier.yearlyId;
            const isLoading = purchasingTier === tierId;
            const { main: priceMain, period, sub: priceSub } = getPriceDisplay(tier);

            return (
              <Pressable
                key={tier.id}
                style={({ pressed }) => [
                  styles.tierCard,
                  isPopular && styles.tierCardPopular,
                  pressed && !isDisabled && styles.tierCardPressed,
                  isDisabled && !isLoading && styles.tierCardDimmed,
                ]}
                onPress={() => { void handleSelectTier(tier); }}
                disabled={isDisabled}
                testID={`church-tier-${tier.id}`}
              >
                {/* Popular badge */}
                {isPopular && (
                  <View style={styles.popularBadge}>
                    <Star size={9} color={colors.primary} fill={colors.primary} />
                    <Text style={styles.popularBadgeText}>Most popular</Text>
                  </View>
                )}

                {/* Header row: name + price */}
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
                        <View style={styles.tierPriceRow}>
                          <Text style={[styles.tierPrice, isPopular && styles.tierPricePopular]}>
                            {priceMain}
                          </Text>
                          <Text style={[styles.tierPeriod, isPopular && styles.tierPeriodPopular]}>
                            {period}
                          </Text>
                        </View>
                        {priceSub && (
                          <Text style={[styles.tierPriceSub, isPopular && styles.tierPriceSubPopular]}>
                            {priceSub}
                          </Text>
                        )}
                      </>
                    )}
                  </View>
                </View>

                {/* Features */}
                <View style={styles.tierFeatures}>
                  {tier.features.map((f) => (
                    <View key={f} style={styles.tierFeatureRow}>
                      <View style={[styles.tierCheckIcon, isPopular && styles.tierCheckIconPopular]}>
                        <Check size={10} color={isPopular ? "#fff" : colors.primary} strokeWidth={3} />
                      </View>
                      <Text style={[styles.tierFeatureText, isPopular && styles.tierFeatureTextPopular]}>
                        {f}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* CTA */}
                <View style={styles.tierCta}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color={isPopular ? "#fff" : colors.primary} />
                  ) : (
                    <>
                      <View style={[styles.tierCtaBtn, isPopular && styles.tierCtaBtnPopular]}>
                        <Text style={[styles.tierCtaText, isPopular && styles.tierCtaTextPopular]}>
                          Get started
                        </Text>
                        <ChevronRight
                          size={15}
                          color={isPopular ? "#fff" : colors.primary}
                          strokeWidth={2.5}
                        />
                      </View>
                      <Text style={[styles.trialNote, isPopular && styles.trialNotePopular]}>
                        Store terms apply · Cancel anytime
                      </Text>
                    </>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Included in all plans */}
        <View style={styles.allIncluded}>
          <Text style={styles.allIncludedTitle}>Included in every Community plan</Text>
          <View style={styles.allIncludedList}>
            {INCLUDED_ALWAYS.map((f) => {
              const Icon = f.icon;
              return (
                <View key={f.label} style={styles.includedRow}>
                  <View style={styles.includedIcon}>
                    <Icon size={14} color={colors.primary} />
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
          Prices may vary by region. Community Plans are separate from Prayer Space Pro.
        </Text>
      </AutoScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Sticky header row
    headerRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "700" as const,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },

    // Drag pill
    dragPillWrap: {
      alignItems: "center" as const,
      paddingBottom: 8,
      marginTop: -4,
    },
    dragPill: {
      width: 36,
      height: 4,
      borderRadius: 2,
      opacity: 0.5,
    },

    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },

    // Header
    headingArea: { alignItems: "center" as const, gap: 8, marginBottom: 20 },
    iconBadge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: 2,
      borderWidth: 1,
      borderColor: colors.primary + "30",
    },
    headingTitle: {
      fontSize: 20,
      fontWeight: "800" as const,
      color: colors.foreground,
      textAlign: "center" as const,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: "center" as const,
      lineHeight: 20,
    },

    // Toggle
    toggleWrapper: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 8,
      marginBottom: 16,
    },
    toggleTrack: {
      flexDirection: "row" as const,
      backgroundColor: colors.secondary,
      borderRadius: 20,
      padding: 3,
      position: "relative" as const,
      borderWidth: 1,
      borderColor: colors.border,
      width: 180,
    },
    toggleThumb: {
      position: "absolute" as const,
      top: 3,
      bottom: 3,
      width: "50%",
      backgroundColor: colors.card,
      borderRadius: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 2,
    },
    toggleOption: {
      flex: 1,
      alignItems: "center" as const,
      paddingVertical: 6,
      zIndex: 1,
    },
    toggleLabel: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
    },
    toggleLabelActive: {
      color: colors.foreground,
      fontWeight: "700" as const,
    },
    saveBadge: {
      backgroundColor: "#DCFCE7",
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: "#86EFAC",
    },
    saveBadgeText: {
      fontSize: 10,
      fontWeight: "800" as const,
      color: "#166534",
      letterSpacing: 0.2,
    },

    // Cards
    tiers: { gap: 10, marginBottom: 20 },
    tierCard: {
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 16,
      position: "relative" as const,
      overflow: "visible" as const,
    },

    // Free card styling
    tierCardFree: {
      borderColor: "#86EFAC",
      backgroundColor: colors.card,
    },

    tierCardPopular: {
      borderColor: colors.primary,
      borderWidth: 2,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
      elevation: 4,
    },
    tierCardPressed: { opacity: 0.9, transform: [{ scale: 0.988 }] },
    tierCardDimmed: { opacity: 0.5 },

    // "Always free" badge
    freeBadge: {
      position: "absolute" as const,
      top: -11,
      right: 14,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      backgroundColor: "#DCFCE7",
      borderRadius: 10,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: "#86EFAC",
    },
    freeBadgeText: {
      fontSize: 9,
      fontWeight: "800" as const,
      color: "#166534",
      letterSpacing: 0.3,
    },

    // Popular badge (inline top-right)
    popularBadge: {
      position: "absolute" as const,
      top: -11,
      right: 14,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      backgroundColor: colors.primary,
      borderRadius: 10,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    popularBadgeText: {
      fontSize: 9,
      fontWeight: "800" as const,
      color: "#fff",
      letterSpacing: 0.3,
    },

    // Header
    tierHeader: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "flex-start" as const,
      marginBottom: 12,
    },
    tierInfo: { gap: 2, flex: 1, marginRight: 12 },
    tierLabel: {
      fontSize: 17,
      fontWeight: "800" as const,
      color: colors.foreground,
    },
    tierLabelPopular: { color: colors.primary },
    tierLabelFree: { color: "#166534" },
    tierRange: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontWeight: "500" as const,
    },
    freeDescription: {
      fontSize: 11,
      color: colors.mutedForeground,
      lineHeight: 16,
      marginTop: 4,
    },

    tierPricing: { alignItems: "flex-end" as const, gap: 1 },
    tierPriceRow: { flexDirection: "row" as const, alignItems: "baseline" as const, gap: 1 },
    tierPrice: {
      fontSize: 20,
      fontWeight: "800" as const,
      color: colors.foreground,
    },
    tierPricePopular: { color: colors.primary },
    tierPriceFree: { color: "#166534" },
    tierPeriod: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
    },
    tierPeriodPopular: { color: colors.primary + "bb" },
    tierPriceSub: {
      fontSize: 10,
      color: colors.mutedForeground,
      fontWeight: "500" as const,
    },
    tierPriceSubPopular: { color: colors.mutedForeground },

    // Features
    tierFeatures: { gap: 6, marginBottom: 14 },
    tierFeatureRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
    tierCheckIcon: {
      width: 17,
      height: 17,
      borderRadius: 9,
      backgroundColor: colors.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      flexShrink: 0,
    },
    tierCheckIconPopular: {
      backgroundColor: colors.primary,
    },
    tierCheckIconFree: {
      backgroundColor: "#DCFCE7",
    },
    tierFeatureText: {
      fontSize: 12,
      color: colors.mutedForeground,
      flex: 1,
    },
    tierFeatureTextPopular: {
      color: colors.foreground,
      fontWeight: "500" as const,
    },
    tierFeatureTextFree: {
      color: colors.foreground,
      fontWeight: "500" as const,
    },

    // CTA
    tierCta: { gap: 6 },
    tierCtaBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 4,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.accent,
      borderWidth: 1.5,
      borderColor: colors.primary + "50",
    },
    tierCtaBtnPopular: {
      backgroundColor: colors.primary,
      borderColor: "transparent",
    },
    tierCtaBtnFree: {
      backgroundColor: "#DCFCE7",
      borderColor: "#86EFAC",
    },
    tierCtaText: {
      fontSize: 13,
      fontWeight: "700" as const,
      color: colors.primary,
    },
    tierCtaTextPopular: {
      color: "#fff",
    },
    tierCtaTextFree: {
      color: "#166534",
    },
    trialNote: {
      fontSize: 10,
      color: colors.mutedForeground,
      textAlign: "center" as const,
    },
    trialNotePopular: {
      color: colors.mutedForeground,
    },

    // Included in all
    allIncluded: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      gap: 10,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    allIncludedTitle: {
      fontSize: 11,
      fontWeight: "700" as const,
      color: colors.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 0.6,
    },
    allIncludedList: { gap: 8 },
    includedRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10 },
    includedIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    includedLabel: {
      fontSize: 13,
      fontWeight: "500" as const,
      color: colors.foreground,
      flex: 1,
    },

    restoreBtn: { alignItems: "center" as const, paddingVertical: 10, marginBottom: 2 },
    restoreText: { fontSize: 12, color: colors.mutedForeground },
    disclaimer: {
      fontSize: 10,
      color: colors.mutedForeground,
      textAlign: "center" as const,
      fontStyle: "italic" as const,
      lineHeight: 16,
      paddingHorizontal: 8,
    },
  });
}
