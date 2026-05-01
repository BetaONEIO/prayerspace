import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { AutoScrollView } from "@/components/AutoScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Users,
  ShieldCheck,
  Heart,
  Settings,
  Bell,
  Crown,
  ArrowRight,
  Sparkles,
} from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useOfferings, usePurchasePackage } from "@/hooks/usePurchases";

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: "Private community space",
    desc: "Only your members can see what's shared.",
  },
  {
    icon: Heart,
    title: "Group prayer requests",
    desc: "Post and pray for requests together.",
  },
  {
    icon: Users,
    title: "Member management",
    desc: "Invite people and manage your community.",
  },
  {
    icon: Settings,
    title: "Admin controls",
    desc: "Full settings, moderation, and customisation.",
  },
  {
    icon: Bell,
    title: "Prayer notifications",
    desc: "Keep your group engaged and connected.",
  },
];

export default function CommunityIntro() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(false);

  const { data: offerings } = useOfferings();
  const purchaseMutation = usePurchasePackage();

  const trialPackage =
    offerings?.all?.["church"]?.availablePackages?.find(
      (p) => p.identifier === "church_small"
    ) ?? offerings?.current?.availablePackages?.[0];

  const startingPrice =
    trialPackage?.product?.priceString ?? "$19.99";

  const proceedToOnboarding = () => {
    router.push("/onboarding/church-group-type" as never);
  };

  const handleStartTrial = async () => {
    if (loading) return;

    if (!trialPackage) {
      proceedToOnboarding();
      return;
    }

    setLoading(true);
    try {
      await purchaseMutation.mutateAsync(trialPackage);
    } catch {
      // Soft paywall — never block on cancellation or error
    } finally {
      setLoading(false);
      proceedToOnboarding();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AutoScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroArea}>
          <View style={styles.heroIconCircle}>
            <Crown size={36} color={colors.primary} strokeWidth={1.5} />
          </View>
          <View style={styles.trialBadge}>
            <Sparkles size={11} color={colors.primaryForeground} />
            <Text style={styles.trialBadgeText}>7-day free trial</Text>
          </View>
        </View>

        <View style={styles.headingArea}>
          <Text style={styles.title}>Everything your community needs</Text>
          <Text style={styles.subtitle}>
            Create a private prayer space for your church, ministry, or group.
          </Text>
        </View>

        <View style={styles.benefitsList}>
          {BENEFITS.map((b) => {
            const Icon = b.icon;
            return (
              <View key={b.title} style={styles.benefitRow}>
                <View style={styles.benefitIcon}>
                  <Icon size={16} color={colors.primary} />
                </View>
                <View style={styles.benefitText}>
                  <Text style={styles.benefitTitle}>{b.title}</Text>
                  <Text style={styles.benefitDesc}>{b.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.pricingCard}>
          <View style={styles.pricingRow}>
            <View style={styles.pricingLeft}>
              <Text style={styles.pricingLabel}>Plans start at</Text>
              <Text style={styles.pricingAmount}>{startingPrice}</Text>
              <Text style={styles.pricingCycle}>per month</Text>
            </View>
            <View style={styles.pricingRight}>
              <View style={styles.trialPill}>
                <Text style={styles.trialPillText}>Try free for 7 days</Text>
              </View>
              <Text style={styles.pricingNote}>
                Then billed monthly. Cancel anytime.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && !loading && styles.primaryBtnPressed,
              loading && styles.primaryBtnLoading,
            ]}
            onPress={() => void handleStartTrial()}
            disabled={loading}
            testID="community-intro-trial"
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Start free trial</Text>
                <ArrowRight size={18} color={colors.primaryForeground} strokeWidth={2.5} />
              </>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && styles.secondaryBtnPressed,
            ]}
            onPress={proceedToOnboarding}
            disabled={loading}
            testID="community-intro-continue"
          >
            <Text style={styles.secondaryBtnText}>Continue setup</Text>
          </Pressable>
        </View>

        <Text style={styles.disclaimer}>
          No payment required before completing setup. You'll confirm your plan at the end.
        </Text>
      </AutoScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: {
      paddingHorizontal: 24,
      paddingTop: 40,
      paddingBottom: 48,
    },

    heroArea: {
      alignItems: "center" as const,
      marginBottom: 28,
      gap: 14,
    },
    heroIconCircle: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: colors.primary + "14",
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderWidth: 2,
      borderColor: colors.primary + "22",
    },
    trialBadge: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
    },
    trialBadgeText: {
      fontSize: 12,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
      letterSpacing: 0.3,
    },

    headingArea: {
      gap: 10,
      marginBottom: 28,
      alignItems: "center" as const,
    },
    title: {
      fontSize: 26,
      fontWeight: "800" as const,
      color: colors.foreground,
      lineHeight: 34,
      textAlign: "center" as const,
    },
    subtitle: {
      fontSize: 15,
      color: colors.mutedForeground,
      lineHeight: 22,
      textAlign: "center" as const,
      maxWidth: 300,
    },

    benefitsList: {
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 18,
      gap: 14,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    benefitRow: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
      gap: 14,
    },
    benefitIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      flexShrink: 0,
      marginTop: 1,
    },
    benefitText: { flex: 1, gap: 2 },
    benefitTitle: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: colors.foreground,
    },
    benefitDesc: {
      fontSize: 12,
      color: colors.mutedForeground,
      lineHeight: 17,
    },

    pricingCard: {
      backgroundColor: colors.primary + "0C",
      borderRadius: 20,
      padding: 18,
      marginBottom: 28,
      borderWidth: 1,
      borderColor: colors.primary + "22",
    },
    pricingRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: 16,
    },
    pricingLeft: { gap: 2 },
    pricingLabel: {
      fontSize: 11,
      fontWeight: "700" as const,
      color: colors.mutedForeground,
      letterSpacing: 0.8,
      textTransform: "uppercase" as const,
    },
    pricingAmount: {
      fontSize: 28,
      fontWeight: "800" as const,
      color: colors.primary,
      letterSpacing: -0.5,
    },
    pricingCycle: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontWeight: "500" as const,
    },
    pricingRight: {
      alignItems: "flex-end" as const,
      gap: 8,
      flex: 1,
    },
    trialPill: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
    },
    trialPillText: {
      fontSize: 12,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
    },
    pricingNote: {
      fontSize: 11,
      color: colors.mutedForeground,
      textAlign: "right" as const,
      lineHeight: 16,
    },

    actions: { gap: 12, marginBottom: 16 },
    primaryBtn: {
      height: 62,
      backgroundColor: colors.primary,
      borderRadius: 20,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 10,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 6,
    },
    primaryBtnPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
    primaryBtnLoading: { opacity: 0.8 },
    primaryBtnText: {
      fontSize: 17,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
    },
    secondaryBtn: {
      height: 52,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    secondaryBtnPressed: { opacity: 0.75 },
    secondaryBtnText: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
    },

    disclaimer: {
      fontSize: 12,
      color: colors.mutedForeground,
      textAlign: "center" as const,
      lineHeight: 18,
      opacity: 0.8,
    },
  });
}
