import React, { useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from "react-native";
import { AutoScrollView } from "@/components/AutoScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ShieldCheck,
  Users,
  Heart,
  Settings,
  Bell,
  ArrowRight,
} from "lucide-react-native";
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
    icon: Heart,
    title: "Group prayer requests",
    desc: "Post and pray for requests together as a community.",
  },
  {
    icon: Users,
    title: "Member management",
    desc: "Invite people and manage your community with ease.",
  },
  {
    icon: Settings,
    title: "Admin controls",
    desc: "Full settings, moderation, and customisation tools.",
  },
  {
    icon: Bell,
    title: "Prayer notifications",
    desc: "Keep your group engaged, connected, and praying.",
  },
];

const COMMUNITY_TYPES = ["Church", "Ministry", "Christian Union", "Small Group", "Prayer Group"];

export default function CommunityIntro() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

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
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 12, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <Animated.View style={[styles.flex, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <AutoScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroArea}>
            <View style={styles.heroIconCircle}>
              <Text style={styles.heroEmoji}>🙏</Text>
            </View>
            <Text style={styles.heroLabel}>Community feature</Text>
          </View>

          <View style={styles.headingArea}>
            <Text style={styles.title}>Your community,{"\n"}your prayer space</Text>
            <Text style={styles.subtitle}>
              Create a private, dedicated space for your church, ministry, Christian Union, small group, or prayer group to pray together.
            </Text>
          </View>

          <View style={styles.typeRow}>
            {COMMUNITY_TYPES.map((t) => (
              <View key={t} style={styles.typePill}>
                <Text style={styles.typePillText}>{t}</Text>
              </View>
            ))}
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
            <View style={styles.pricingInner}>
              <View style={styles.pricingLeft}>
                <Text style={styles.pricingLabel}>Plans from</Text>
                <Text style={styles.pricingAmount}>{startingPrice}</Text>
                <Text style={styles.pricingCycle}>per year</Text>
              </View>
              <View style={styles.pricingRight}>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>Save 20% yearly</Text>
                </View>
                <Text style={styles.pricingNote}>
                  Monthly billing also available.{"\n"}Cancel anytime.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && styles.primaryBtnPressed,
              ]}
              onPress={() => router.push("/onboarding/church-paywall" as never)}
              testID="community-intro-view-plans"
            >
              <Text style={styles.primaryBtnText}>View plans</Text>
              <ArrowRight size={18} color={colors.primaryForeground} strokeWidth={2.5} />
            </Pressable>
          </View>

          <Text style={styles.disclaimer}>
            You'll complete community setup after choosing a plan.
          </Text>
        </AutoScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    scroll: { flex: 1 },
    content: { paddingHorizontal: 24, paddingTop: 36, paddingBottom: 48 },

    heroArea: { alignItems: "center", marginBottom: 28, gap: 14 },
    heroIconCircle: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.primary + "22",
    },
    heroEmoji: { fontSize: 40 },
    heroLabel: {
      fontSize: 12,
      fontWeight: "700" as const,
      color: colors.primary,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      backgroundColor: colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary + "30",
    },

    headingArea: { gap: 10, marginBottom: 20, alignItems: "center" },
    title: {
      fontSize: 30,
      fontWeight: "800" as const,
      color: colors.foreground,
      lineHeight: 38,
      textAlign: "center",
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 15,
      color: colors.mutedForeground,
      lineHeight: 23,
      textAlign: "center",
      maxWidth: 320,
    },

    typeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "center",
      marginBottom: 28,
    },
    typePill: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typePillText: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
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
    benefitRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
    benefitIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      marginTop: 1,
    },
    benefitText: { flex: 1, gap: 2 },
    benefitTitle: { fontSize: 14, fontWeight: "700" as const, color: colors.foreground },
    benefitDesc: { fontSize: 12, color: colors.mutedForeground, lineHeight: 17 },

    pricingCard: {
      backgroundColor: colors.primary + "0C",
      borderRadius: 20,
      padding: 18,
      marginBottom: 28,
      borderWidth: 1,
      borderColor: colors.primary + "22",
    },
    pricingInner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
    },
    pricingLeft: { gap: 2 },
    pricingLabel: {
      fontSize: 11,
      fontWeight: "700" as const,
      color: colors.mutedForeground,
      letterSpacing: 0.8,
      textTransform: "uppercase",
    },
    pricingAmount: {
      fontSize: 28,
      fontWeight: "800" as const,
      color: colors.primary,
      letterSpacing: -0.5,
    },
    pricingCycle: { fontSize: 12, color: colors.mutedForeground, fontWeight: "500" as const },
    pricingRight: { alignItems: "flex-end", gap: 8, flex: 1 },
    saveBadge: {
      backgroundColor: "#DCFCE7",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#86EFAC",
    },
    saveBadgeText: { fontSize: 11, fontWeight: "800" as const, color: "#166534" },
    pricingNote: {
      fontSize: 11,
      color: colors.mutedForeground,
      textAlign: "right",
      lineHeight: 16,
    },

    actions: { gap: 12, marginBottom: 16 },
    primaryBtn: {
      height: 62,
      backgroundColor: colors.primary,
      borderRadius: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 6,
    },
    primaryBtnPressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
    primaryBtnText: { fontSize: 17, fontWeight: "700" as const, color: colors.primaryForeground },

    disclaimer: {
      fontSize: 12,
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 18,
      opacity: 0.8,
    },
  });
}
