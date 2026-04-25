import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import { ChevronLeft, ChevronRight, Heart, Users, Flame, Trophy } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

const WEEK_DATA = [
  { day: "M", height: 0.4, fill: 0.6 },
  { day: "T", height: 0.6, fill: 0.8 },
  { day: "W", height: 0.3, fill: 0.4 },
  { day: "T", height: 1.0, fill: 1.0 },
  { day: "F", height: 0.7, fill: 0.9 },
  { day: "S", height: 0.5, fill: 0.7 },
  { day: "S", height: 0.4, fill: 0.5 },
];

export default function PrayerStatsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={colors.secondaryForeground} />
        </Pressable>
        <Text style={styles.headerTitle}>Your Journey</Text>
        <View style={{ width: 40 }} />
      </View>

      <AutoScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.streakCard}>
          <View style={styles.streakIconBg}>
            <Flame size={80} color={colors.primaryForeground + "15"} />
          </View>
          <Text style={styles.streakLabel}>CURRENT STREAK</Text>
          <View style={styles.streakRow}>
            <Text style={styles.streakNumber}>12</Text>
            <Text style={styles.streakUnit}>DAYS</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>
          <Text style={styles.streakSub}>Keep going! Your longest streak is 24 days.</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Heart size={22} color={colors.primary} />
            <Text style={styles.statNumber}>342</Text>
            <Text style={styles.statLabel}>PRAYERS OFFERED</Text>
          </View>
          <View style={styles.statCard}>
            <Users size={22} color={colors.primary} />
            <Text style={styles.statNumber}>84</Text>
            <Text style={styles.statLabel}>PEOPLE PRAYED FOR</Text>
          </View>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Prayer Activity</Text>
            <View style={styles.chartLegend}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>THIS WEEK</Text>
            </View>
          </View>
          <View style={styles.chartArea}>
            {WEEK_DATA.map((item, index) => (
              <View key={index} style={styles.barCol}>
                <View style={[styles.barBg, { flex: item.height }]}>
                  <View style={[styles.barFill, { flex: item.fill }]} />
                </View>
                <Text style={styles.barLabel}>{item.day}</Text>
              </View>
            ))}
          </View>
        </View>

        <Pressable style={styles.achievementCard}>
          <View style={styles.achievementIcon}>
            <Trophy size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.achievementTitle}>View Achievements</Text>
            <Text style={styles.achievementSub}>You have 4 new badges</Text>
          </View>
          <ChevronRight size={20} color={colors.primary} />
        </Pressable>

        <View style={{ height: 40 }} />
      </AutoScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 24, paddingVertical: 14,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary,
      alignItems: "center" as const, justifyContent: "center" as const,
    },
    headerTitle: { fontSize: 18, fontWeight: "700" as const, color: colors.foreground },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
    streakCard: {
      backgroundColor: colors.primary, borderRadius: 32, padding: 28, marginBottom: 20,
      overflow: "hidden" as const, shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8,
    },
    streakIconBg: { position: "absolute" as const, right: -10, bottom: -10, transform: [{ rotate: "12deg" }] },
    streakLabel: { fontSize: 10, fontWeight: "700" as const, color: colors.primaryForeground + "CC", letterSpacing: 2, marginBottom: 8 },
    streakRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 20 },
    streakNumber: { fontSize: 56, fontWeight: "800" as const, color: colors.primaryForeground, lineHeight: 56 },
    streakUnit: { fontSize: 18, fontWeight: "800" as const, color: colors.primaryForeground, marginBottom: 6 },
    progressBar: { height: 8, backgroundColor: colors.primaryForeground + "33", borderRadius: 4, overflow: "hidden" as const, marginBottom: 12 },
    progressFill: { width: "85%", height: "100%", backgroundColor: colors.primaryForeground, borderRadius: 4 },
    streakSub: { fontSize: 13, color: colors.primaryForeground + "CC", fontWeight: "500" as const },
    statsGrid: { flexDirection: "row", gap: 14, marginBottom: 20 },
    statCard: {
      flex: 1, backgroundColor: colors.card, padding: 22, borderRadius: 24,
      borderWidth: 1, borderColor: colors.border + "50",
    },
    statNumber: { fontSize: 28, fontWeight: "800" as const, color: colors.foreground, marginTop: 12, marginBottom: 4 },
    statLabel: { fontSize: 9, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 1 },
    chartCard: {
      backgroundColor: colors.card, padding: 24, borderRadius: 28,
      borderWidth: 1, borderColor: colors.border + "50", marginBottom: 20,
    },
    chartHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
    chartTitle: { fontSize: 16, fontWeight: "700" as const, color: colors.foreground },
    chartLegend: { flexDirection: "row", alignItems: "center", gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
    legendText: { fontSize: 9, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 0.5 },
    chartArea: { height: 160, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 4 },
    barCol: { alignItems: "center" as const, gap: 10, flex: 1, height: "100%", justifyContent: "flex-end" as const },
    barBg: { width: 28, backgroundColor: colors.primary + "18", borderTopLeftRadius: 6, borderTopRightRadius: 6, justifyContent: "flex-end" as const, overflow: "hidden" as const },
    barFill: { backgroundColor: colors.primary, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
    barLabel: { fontSize: 10, fontWeight: "700" as const, color: colors.mutedForeground },
    achievementCard: {
      backgroundColor: colors.accent, borderRadius: 28, padding: 22,
      flexDirection: "row", alignItems: "center", gap: 14,
      borderWidth: 1, borderColor: colors.primary + "15",
    },
    achievementIcon: {
      width: 48, height: 48, borderRadius: 24, backgroundColor: colors.card,
      alignItems: "center" as const, justifyContent: "center" as const,
    },
    achievementTitle: { fontSize: 15, fontWeight: "700" as const, color: colors.foreground },
    achievementSub: { fontSize: 12, color: colors.mutedForeground, fontWeight: "500" as const, marginTop: 2 },
  });
}
