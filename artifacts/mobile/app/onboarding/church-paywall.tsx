import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { AutoScrollView } from "@/components/AutoScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ShieldCheck, Users, Settings, ChevronRight } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useOfferings, usePurchasePackage, useRestorePurchases } from "@/hooks/usePurchases";
import { churchMembershipStore } from "@/lib/churchMembershipStore";
import { communityStore } from "@/lib/communityStore";
import { PurchasesPackage } from "react-native-purchases";

const INCLUDED_FEATURES = [
  { icon: ShieldCheck, label: "Private community" },
  { icon: Settings, label: "Admin controls" },
  { icon: Users, label: "Member management" },
];

interface ChurchTier {
  id: "church_small" | "church_medium" | "church_large";
  label: string;
  memberRange: string;
  fallbackPrice: string;
  tag?: string;
}

const TIERS: ChurchTier[] = [
  {
    id: "church_small",
    label: "Small",
    memberRange: "1 – 50 members",
    fallbackPrice: "$19.99/mo",
  },
  {
    id: "church_medium",
    label: "Medium",
    memberRange: "50 – 150 members",
    fallbackPrice: "$39.99/mo",
    tag: "Most popular",
  },
  {
    id: "church_large",
    label: "Large",
    memberRange: "150+ members",
    fallbackPrice: "$79.99/mo",
  },
];

export default function ChurchPaywall() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [purchasingTier, setPurchasingTier] = useState<ChurchTier["id"] | null>(null);

  const { data: offerings, isLoading: offeringsLoading } = useOfferings();
  const purchaseMutation = usePurchasePackage();
  const restoreMutation = useRestorePurchases();

  const getPackageForTier = (tierId: ChurchTier["id"]): PurchasesPackage | undefined => {
    const churchOffering = offerings?.all?.["church"] ?? offerings?.current;
    return churchOffering?.availablePackages?.find((p) => p.identifier === tierId);
  };

  const getPriceForTier = (tier: ChurchTier): string => {
    const pkg = getPackageForTier(tier.id);
    return pkg?.product?.priceString ?? tier.fallbackPrice;
  };

  const completeOnboarding = (tierId: ChurchTier["id"]) => {
    const { churchName } = churchMembershipStore.getState();
    churchMembershipStore.setOwner(churchName, tierId);
    communityStore.addOwnedCommunity(churchName, tierId);
    router.push("/onboarding/church-complete" as never);
  };

  const handleSelectTier = async (tierId: ChurchTier["id"]) => {
    if (purchasingTier) return;
    setPurchasingTier(tierId);

    const pkg = getPackageForTier(tierId);
    if (!pkg) {
      // No RC package loaded (browser / dev preview) — skip purchase and proceed
      console.log("[ChurchPaywall] No package for tier — proceeding without purchase.");
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
    <SafeAreaView style={styles.container}>
      <AutoScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headingArea}>
          <Text style={styles.title}>Choose a plan for your community</Text>
          <Text style={styles.subtitle}>All plans include everything your church needs to pray together.</Text>
        </View>

        <View style={styles.features}>
          {INCLUDED_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <View key={f.label} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Icon size={16} color={colors.primary} />
                </View>
                <Text style={styles.featureLabel}>{f.label}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.tiers}>
          {TIERS.map((tier) => {
            const isLoading = purchasingTier === tier.id;
            return (
              <Pressable
                key={tier.id}
                style={({ pressed }) => [
                  styles.tierCard,
                  isLoading && styles.tierCardSelected,
                  pressed && !isDisabled && styles.tierCardPressed,
                  isDisabled && !isLoading && styles.tierCardDimmed,
                ]}
                onPress={() => { void handleSelectTier(tier.id); }}
                disabled={isDisabled}
                testID={`church-tier-${tier.id}`}
              >
                {tier.tag && (
                  <View style={[styles.tierTag, !isLoading && styles.tierTagMuted]}>
                    <Text style={[styles.tierTagText, !isLoading && styles.tierTagTextMuted]}>{tier.tag}</Text>
                  </View>
                )}
                <View style={styles.tierTop}>
                  <View style={styles.tierInfo}>
                    <Text style={styles.tierLabel}>{tier.label}</Text>
                    <Text style={styles.tierRange}>{tier.memberRange}</Text>
                  </View>
                  <View style={styles.tierRight}>
                    {offeringsLoading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Text style={[styles.tierPrice, isLoading && { color: colors.primary }]}>
                        {getPriceForTier(tier)}
                      </Text>
                    )}
                    <View style={styles.tierCta}>
                      {isLoading ? (
                        <ActivityIndicator size="small" color={colors.primaryForeground} />
                      ) : (
                        <ChevronRight size={18} color={colors.primaryForeground} strokeWidth={2.5} />
                      )}
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.restoreBtn} onPress={() => { void handleRestore(); }} disabled={!!purchasingTier}>
          <Text style={[styles.restoreText, { color: colors.mutedForeground }]}>Restore previous purchase</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          Billed monthly. Cancel anytime. Privacy Policy &amp; Terms of Service.
        </Text>
      </AutoScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 48 },
    headingArea: { gap: 10, marginBottom: 28 },
    title: { fontSize: 28, fontWeight: "800" as const, color: colors.foreground, lineHeight: 36 },
    subtitle: { fontSize: 15, color: colors.mutedForeground, lineHeight: 22 },
    features: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 18,
      gap: 12,
      marginBottom: 28,
      borderWidth: 1,
      borderColor: colors.border,
    },
    featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    featureIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    featureLabel: { fontSize: 14, fontWeight: "600" as const, color: colors.foreground },
    tiers: { gap: 14, marginBottom: 20 },
    tierCard: {
      padding: 20,
      paddingTop: 26,
      borderRadius: 22,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.card,
      position: "relative",
    },
    tierCardSelected: { borderColor: colors.primary, backgroundColor: colors.accent + "20" },
    tierCardPressed: { opacity: 0.92, transform: [{ scale: 0.985 }] },
    tierCardDimmed: { opacity: 0.6 },
    tierTag: {
      position: "absolute",
      top: -12,
      left: 20,
      backgroundColor: colors.primary,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    tierTagMuted: { backgroundColor: colors.secondary },
    tierTagText: { fontSize: 10, fontWeight: "800" as const, color: colors.primaryForeground, letterSpacing: 0.5 },
    tierTagTextMuted: { color: colors.mutedForeground },
    tierTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    tierInfo: { gap: 3 },
    tierLabel: { fontSize: 18, fontWeight: "800" as const, color: colors.foreground },
    tierRange: { fontSize: 13, color: colors.mutedForeground },
    tierRight: { alignItems: "flex-end", gap: 8 },
    tierPrice: { fontSize: 17, fontWeight: "700" as const, color: colors.mutedForeground },
    tierCta: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    restoreBtn: { alignItems: "center", paddingVertical: 12, marginBottom: 8 },
    restoreText: { fontSize: 13 },
    disclaimer: {
      fontSize: 11,
      color: colors.mutedForeground,
      textAlign: "center",
      fontStyle: "italic",
      lineHeight: 17,
    },
  });
}
