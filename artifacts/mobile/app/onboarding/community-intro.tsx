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
  X,
  Gift,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: "Private community space",
    desc: "Only your members can see what's shared inside.",
  },
  {
    icon: Users,
    title: "Member management",
    desc: "Invite and manage your community members with ease.",
  },
  {
    icon: Bell,
    title: "Prayer requests and notifications",
    desc: "Keep your community engaged and praying together.",
  },
];

export default function CommunityIntro() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 13, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleClose = () => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Close button */}
      <Pressable
        style={[styles.closeBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
        onPress={handleClose}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <X size={18} color={colors.mutedForeground} strokeWidth={2.5} />
      </Pressable>

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

        {/* Free tier highlight */}
        <View style={styles.freeCard}>
          <View style={styles.freeCardLeft}>
            <View style={styles.freeIconWrap}>
              <Gift size={16} color="#166534" />
            </View>
            <View style={styles.freeCardText}>
              <Text style={styles.freeCardTitle}>Free to start</Text>
              <Text style={styles.freeCardDesc}>
                1 community · up to 10 members · no payment needed
              </Text>
            </View>
          </View>
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>£0</Text>
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
          <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Start Free</Text>
          <ArrowRight size={18} color={colors.primaryForeground} strokeWidth={2.5} />
        </Pressable>

        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
          Start free with up to 10 members. Upgrade anytime as your community grows.
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    closeBtn: {
      position: "absolute" as const,
      top: 52,
      right: 20,
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      zIndex: 10,
    },
    inner: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 20,
      justifyContent: "center" as const,
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

    // Free tier highlight card
    freeCard: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      backgroundColor: "#F0FDF4",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "#86EFAC",
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    freeCardLeft: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      flex: 1,
    },
    freeIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: "#DCFCE7",
      alignItems: "center" as const,
      justifyContent: "center" as const,
      flexShrink: 0,
    },
    freeCardText: { flex: 1, gap: 2 },
    freeCardTitle: {
      fontSize: 14,
      fontWeight: "800" as const,
      color: "#166534",
    },
    freeCardDesc: {
      fontSize: 11,
      color: "#166534",
      opacity: 0.75,
      lineHeight: 16,
    },
    freeBadge: {
      backgroundColor: "#DCFCE7",
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: "#86EFAC",
    },
    freeBadgeText: {
      fontSize: 15,
      fontWeight: "800" as const,
      color: "#166534",
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
