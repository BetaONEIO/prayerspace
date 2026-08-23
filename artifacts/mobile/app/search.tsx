import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, Search as SearchIcon, Flame, Heart, Sun, Globe } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { dismissKeyboard } from "@/lib/keyboard";


export default function SearchScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [query, setQuery] = useState("");

  const TOPICS = [
    { label: "Healing", icon: Flame, bg: colors.accent },
    { label: "Family", icon: Heart, bg: colors.primary + "0A" },
    { label: "Wisdom", icon: Sun, bg: colors.secondary },
    { label: "Peace", icon: Globe, bg: colors.card },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}><ChevronLeft size={20} color={colors.secondaryForeground} /></Pressable>
        <View style={styles.searchBar}>
          <SearchIcon size={18} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search prayers, people, groups..."
            placeholderTextColor={colors.mutedForeground + "80"}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={dismissKeyboard}
          />
        </View>
      </View>

      <AutoScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>POPULAR TOPICS</Text>
          <View style={styles.topicsGrid}>
            {TOPICS.map((t) => {
              const Icon = t.icon;
              return (
                <Pressable key={t.label} style={[styles.topicCard, { backgroundColor: t.bg }]}>
                  <Icon size={18} color={colors.primary + "90"} />
                  <Text style={styles.topicLabel}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </AutoScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 24, paddingVertical: 14 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: "center" as const, justifyContent: "center" as const },
    searchBar: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: colors.border + "50" },
    searchInput: { flex: 1, fontSize: 14, color: colors.foreground, padding: 0 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
    section: { marginBottom: 28 },
    sectionTitle: { fontSize: 10, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 1.5, marginBottom: 14, paddingHorizontal: 4 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    recentChip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border + "90", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999 },
    recentText: { fontSize: 13, fontWeight: "500" as const, color: colors.foreground },
    personRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
    personLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
    personAvatar: { width: 48, height: 48, borderRadius: 24 },
    personName: { fontSize: 14, fontWeight: "700" as const, color: colors.foreground },
    personSub: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
    followBtn: { backgroundColor: colors.secondary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
    followText: { fontSize: 10, fontWeight: "700" as const, color: colors.secondaryForeground, letterSpacing: 0.5 },
    topicsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    topicCard: { width: "47%", flexDirection: "row", alignItems: "center", gap: 10, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: colors.primary + "15" },
    topicLabel: { fontSize: 13, fontWeight: "700" as const, color: colors.foreground },
  });
}
