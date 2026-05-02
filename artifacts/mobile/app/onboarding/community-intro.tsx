import React, { useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ShieldCheck,
  Users,
  Bell,
  ArrowRight,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useOfferings } from "@/hooks/usePurchases";

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: "Private community space",
    desc: "Only your members can see what's shared inside.",
  },
  {
    icon: Users,
    title: "Member management",
    desc: "Invite and manage your community with ease.",
  },
  {
    icon: Bell,
    title: "Prayer requests and notifications",
    desc: "Keep your group engaged and praying together.",
  },
];

export default function CommunityIntro() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  const { data: offerings } = useOfferings();
  const startingPrice =
    offerings?.all?.["church"]?.availablePackages?.find(
      (p) => p.identifier === "church_small_yearly"
    )?.product?.priceString ??
    offerings?.all?.["church"]?.availablePackages?.find(
      (p) => p.identifier === "church_small"
    )?.product?.priceString ??
    "$191.90";

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 13, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

        {/* Headline */}
        <View style={styles.headingArea}>
          <Text style={styles.title}>Start a prayer community</Text>
          <Text style={styles.subtitle}>
            Create a private space for your church, ministry, group, or Christian Union to pray together.
          </Text>
        </View>

        {/* Compact benefit card */}
        <View style={[styles.benefitsList, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {BENEFITS.map((b, i) => {
            const Icon = b.icon;
            return (
              <View
                key={b.title}
                style={[
                  styles.benefitRow,
                  i < BENEFITS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                ]}
              >
                <View style={[styles.benefitIcon, { backgroundColor: colors.accent }]}>
                  <Icon size={15} color={colors.primary} />
                </View>
                <View style={styles.benefitText}>
                  <Text style={[styles.benefitTitle, { color: colors.foreground }]}>{b.title}</Text>
                  <Text style={[styles.benefitDesc, { color: colors.mutedForeground }]}>{b.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Pricing row */}
        <View style={[styles.pricingCard, { backgroundColor: colors.primary + "0C", borderColor: colors.primary + "25" }]}>
          <View style={styles.pricingRow}>
            <View style={styles.pricingLeft}>
              <Text style={[styles.pricingLabel, { color: colors.mutedForeground }]}>Plans from</Text>
              <View style={styles.pricingAmountRow}>
                <Text style={[styles.pricingAmount, { color: colors.primary }]}>{startingPrice}</Text>
                <Text style={[styles.pricingCycle, { color: colors.mutedForeground }]}>/yr</Text>
              </View>
            </View>
            <View style={styles.pricingRight}>
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>Save 20% yearly</Text>
              </View>
              <Text style={[styles.trialNote, { color: colors.mutedForeground }]}>
                7-day free trial · cancel anytime
              </Text>
            </View>
          </View>
        </View>

        {/* CTA */}
        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: colors.primary, shadowColor: colors.primary },
            pressed && styles.primaryBtnPressed,
          ]}
          onPress={() => {
            if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/onboarding/church-paywall" as never);
          }}
          testID="community-intro-view-plans"
        >
          <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Start free trial</Text>
          <ArrowRight size={18} color={colors.primaryForeground} strokeWidth={2.5} />
        </Pressable>

        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          You'll choose a plan after setup. Cancel before trial ends to avoid charges.
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    inner: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 20,
      justifyContent: "center",
      gap: 20,
    },

    headingArea: { gap: 10 },
    title: {
      fontSize: 28,
      fontWeight: "800" as const,
      color: colors.foreground,
      lineHeight: 35,
      letterSpacing: -0.4,
    },
    subtitle: {
      fontSize: 15,
      color: colors.mutedForeground,
      lineHeight: 22,
    },

    benefitsList: {
      borderRadius: 20,
      borderWidth: 1,
      overflow: "hidden" as const,
    },
    benefitRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    benefitIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      flexShrink: 0,
    },
    benefitText: { flex: 1, gap: 2 },
    benefitTitle: { fontSize: 14, fontWeight: "700" as const },
    benefitDesc: { fontSize: 12, lineHeight: 17 },

    pricingCard: {
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
    },
    pricingRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: 12,
    },
    pricingLeft: { gap: 2 },
    pricingLabel: {
      fontSize: 11,
      fontWeight: "700" as const,
      letterSpacing: 0.7,
      textTransform: "uppercase" as const,
    },
    pricingAmountRow: {
      flexDirection: "row" as const,
      alignItems: "baseline" as const,
      gap: 3,
    },
    pricingAmount: {
      fontSize: 26,
      fontWeight: "800" as const,
      letterSpacing: -0.5,
    },
    pricingCycle: {
      fontSize: 13,
      fontWeight: "600" as const,
    },
    pricingRight: { alignItems: "flex-end" as const, gap: 6 },
    saveBadge: {
      backgroundColor: "#DCFCE7",
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "#86EFAC",
    },
    saveBadgeText: { fontSize: 11, fontWeight: "800" as const, color: "#166534" },
    trialNote: {
      fontSize: 11,
      fontWeight: "500" as const,
      textAlign: "right" as const,
    },

    primaryBtn: {
      height: 58,
      borderRadius: 18,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 10,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 12,
      elevation: 5,
    },
    primaryBtnPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
    primaryBtnText: { fontSize: 17, fontWeight: "700" as const },

    disclaimer: {
      fontSize: 12,
      textAlign: "center" as const,
      lineHeight: 17,
      opacity: 0.75,
    },
  });
}
