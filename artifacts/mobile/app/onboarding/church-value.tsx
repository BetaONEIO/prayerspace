import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { AutoScrollView } from "@/components/AutoScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Heart, MessageCircle, Users } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

const BENEFITS = [
  {
    id: "pray",
    icon: Heart,
    title: "Pray together",
    desc: "Share requests, intercede for one another, and see how prayer changes things.",
  },
  {
    id: "connected",
    icon: MessageCircle,
    title: "Stay connected",
    desc: "Keep everyone in the loop with updates, announcements, and words of encouragement.",
  },
  {
    id: "support",
    icon: Users,
    title: "Support your members",
    desc: "Know who needs prayer, who needs help, and be there for them in the right moment.",
  },
];

export default function ChurchValue() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.progressRow}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: "100%" }]} />
          </View>
          <Text style={styles.stepText}>Step 7 of 7</Text>
        </View>

        <AutoScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.headingArea}>
            <Text style={styles.title}>Your community is almost ready</Text>
            <Text style={styles.subtitle}>
              Here's what Prayer Space gives your group from day one.
            </Text>
          </View>

          <View style={styles.benefitList}>
            {BENEFITS.map((b) => {
              const Icon = b.icon;
              return (
                <View key={b.id} style={styles.benefitCard}>
                  <View style={styles.benefitIcon}>
                    <Icon size={22} color={colors.primary} />
                  </View>
                  <View style={styles.benefitText}>
                    <Text style={styles.benefitTitle}>{b.title}</Text>
                    <Text style={styles.benefitDesc}>{b.desc}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </AutoScrollView>

        <Pressable
          style={({ pressed }) => [styles.ctaBtn, pressed && styles.btnPressed]}
          onPress={() => router.push("/onboarding/church-paywall" as never)}
          testID="church-value-cta"
        >
          <Text style={styles.ctaBtnText}>See pricing plans</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    inner: { flex: 1, paddingHorizontal: 24, paddingBottom: 32 },
    progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 36, marginTop: 4 },
    progressBg: { flex: 1, height: 6, backgroundColor: colors.secondary, borderRadius: 3, overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3 },
    stepText: { fontSize: 10, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 1.2, textTransform: "uppercase" },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 8 },
    headingArea: { gap: 12, marginBottom: 36 },
    title: { fontSize: 30, fontWeight: "800" as const, color: colors.foreground, lineHeight: 38 },
    subtitle: { fontSize: 16, color: colors.mutedForeground, lineHeight: 24 },
    benefitList: { gap: 16 },
    benefitCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 16,
      padding: 20,
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },
    benefitIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
    benefitText: { flex: 1, gap: 5 },
    benefitTitle: { fontSize: 16, fontWeight: "800" as const, color: colors.foreground },
    benefitDesc: { fontSize: 14, color: colors.mutedForeground, lineHeight: 20 },
    ctaBtn: { height: 66, backgroundColor: colors.primary, borderRadius: 22, alignItems: "center" as const, justifyContent: "center" as const, marginTop: 24, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 8 },
    btnPressed: { opacity: 0.9 },
    ctaBtnText: { fontSize: 18, fontWeight: "700" as const, color: colors.primaryForeground },
  });
}
