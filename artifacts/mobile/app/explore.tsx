import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import { Search, Sun, Moon, Music, Play, Heart, ChevronRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

const FILTERS = ["All Topics", "Daily Verse", "Music", "Bible Study"] as const;

export default function ExploreScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeFilter, setActiveFilter] = useState("All Topics");

  const handleFilter = useCallback((f: string) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setActiveFilter(f);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
        <Pressable style={styles.searchBtn} onPress={() => router.push("/search")}>
          <Search size={20} color={colors.secondaryForeground} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow} style={styles.filterScroll}>
        {FILTERS.map((f) => (
          <Pressable key={f} style={[styles.filterChip, activeFilter === f && styles.filterActive]} onPress={() => handleFilter(f)}>
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <AutoScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommended for You</Text>
            <Pressable><Text style={styles.seeAll}>See All</Text></Pressable>
          </View>
          <View style={styles.cardGrid}>
            <Pressable style={styles.gridCard}>
              <View style={[styles.gridCardImage, { backgroundColor: colors.primary + "15" }]}>
                <Sun size={40} color={colors.primary + "60"} />
              </View>
              <View style={styles.gridCardContent}>
                <Text style={styles.gridCardTitle}>Finding Inner Peace</Text>
                <View style={styles.gridCardAuthor}>
                  <Image source={{ uri: "https://randomuser.me/api/portraits/men/42.jpg" }} style={styles.gridCardAvatar} />
                  <Text style={styles.gridCardAuthorText}>PASTOR SAM</Text>
                </View>
              </View>
            </Pressable>
            <Pressable style={styles.gridCard}>
              <View style={[styles.gridCardImage, { backgroundColor: colors.accent }]}>
                <Moon size={40} color={colors.accentForeground + "60"} />
              </View>
              <View style={styles.gridCardContent}>
                <Text style={styles.gridCardTitle}>Nighttime Reflections</Text>
                <View style={styles.gridCardAuthor}>
                  <Image source={{ uri: "https://randomuser.me/api/portraits/women/42.jpg" }} style={styles.gridCardAvatar} />
                  <Text style={styles.gridCardAuthorText}>DR. EMMA</Text>
                </View>
              </View>
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.meditationCard}>
          <View style={styles.meditationBg}><Music size={80} color={colors.primary + "08"} /></View>
          <Text style={styles.meditationTitle}>Guided Meditation</Text>
          <Text style={styles.meditationDesc}>Relax your mind and focus on the divine with our 5-minute guided sessions.</Text>
          <Pressable style={styles.listenBtn} onPress={() => router.push("/audio-player" as never)}>
            <Play size={16} color={colors.primary} />
            <Text style={styles.listenBtnText}>Start Listening</Text>
          </Pressable>
        </Pressable>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trending Prayers</Text>
          <Pressable style={styles.trendingRow}>
            <View style={styles.trendingIcon}><Heart size={22} color={colors.primary + "90"} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.trendingTitle}>Prayer for World Peace</Text>
              <Text style={styles.trendingSub}>12.4K PEOPLE PRAYING</Text>
            </View>
            <ChevronRight size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </AutoScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12 },
    headerTitle: { fontSize: 28, fontWeight: "800" as const, color: colors.foreground },
    searchBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: "center" as const, justifyContent: "center" as const },
    filterScroll: { marginBottom: 8 },
    filterRow: { paddingHorizontal: 24, gap: 8, paddingBottom: 8 },
    filterChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { fontSize: 13, fontWeight: "600" as const, color: colors.mutedForeground },
    filterTextActive: { color: colors.primaryForeground },
    scrollContent: { paddingHorizontal: 24 },
    section: { marginBottom: 28 },
    sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
    sectionTitle: { fontSize: 17, fontWeight: "700" as const, color: colors.foreground, marginBottom: 14 },
    seeAll: { fontSize: 13, fontWeight: "700" as const, color: colors.primary, marginBottom: 14 },
    cardGrid: { flexDirection: "row", gap: 14 },
    gridCard: { flex: 1, backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border + "50", overflow: "hidden" as const },
    gridCardImage: { height: 120, alignItems: "center" as const, justifyContent: "center" as const },
    gridCardContent: { padding: 14 },
    gridCardTitle: { fontSize: 14, fontWeight: "700" as const, color: colors.foreground, marginBottom: 10 },
    gridCardAuthor: { flexDirection: "row", alignItems: "center", gap: 6 },
    gridCardAvatar: { width: 16, height: 16, borderRadius: 8 },
    gridCardAuthorText: { fontSize: 9, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 0.5 },
    meditationCard: { backgroundColor: colors.secondary, borderRadius: 32, padding: 28, borderWidth: 1, borderColor: colors.border + "30", marginBottom: 28, overflow: "hidden" as const },
    meditationBg: { position: "absolute" as const, right: -20, bottom: -20, transform: [{ rotate: "12deg" }] },
    meditationTitle: { fontSize: 24, fontWeight: "800" as const, color: colors.foreground, marginBottom: 8 },
    meditationDesc: { fontSize: 14, color: colors.secondaryForeground, lineHeight: 22, marginBottom: 20 },
    listenBtn: { flexDirection: "row", alignItems: "center" as const, gap: 8, backgroundColor: colors.card, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 999, alignSelf: "flex-start" as const },
    listenBtnText: { fontSize: 14, fontWeight: "700" as const, color: colors.primary },
    trendingRow: { flexDirection: "row", alignItems: "center", gap: 14 },
    trendingIcon: { width: 60, height: 60, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border + "50", alignItems: "center" as const, justifyContent: "center" as const },
    trendingTitle: { fontSize: 15, fontWeight: "700" as const, color: colors.foreground },
    trendingSub: { fontSize: 10, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 1, marginTop: 4 },
  });
}
