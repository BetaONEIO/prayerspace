import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, CheckCheck, Mic, Handshake } from "lucide-react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

const GREEN = "#34C759";

export default function ContactStatusScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  useLocalSearchParams<{ id: string }>();

  const timelineEvents = [
    { id: "1", title: "Prayer Acknowledged", desc: "Michael sent a heart back to your prayer. • 2h ago", icon: CheckCheck, iconBg: colors.primary, iconColor: colors.primaryForeground },
    { id: "2", title: "Prayer Recorded", desc: "You lifted up Michael in your morning prayer. • 4h ago", icon: Mic, iconBg: colors.accent, iconColor: colors.primary },
    { id: "3", title: "Became Friends", desc: "Michael joined your prayer circle. • Oct 12, 2023", icon: Handshake, iconBg: colors.secondary, iconColor: colors.secondaryForeground, muted: true },
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}><ArrowLeft size={20} color={colors.secondaryForeground} /></Pressable>
          <Text style={styles.headerTitle}>Prayer Status</Text>
          <View style={{ width: 40 }} />
        </View>

        <AutoScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.profileCard}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: "https://randomuser.me/api/portraits/men/32.jpg" }} style={styles.avatar} />
              <View style={styles.badgeWrapper}><Text style={styles.badgeEmoji}>🏅</Text></View>
            </View>
            <Text style={styles.profileName}>Michael Scott</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.statusText}>Active on PrayerPal</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CONNECTION HISTORY</Text>
            <View style={styles.timeline}>
              <View style={styles.timelineLine} />
              {timelineEvents.map((event) => {
                const Icon = event.icon;
                return (
                  <View key={event.id} style={[styles.timelineItem, event.muted && styles.timelineItemMuted]}>
                    <View style={[styles.timelineIconWrapper, { backgroundColor: event.iconBg }]}>
                      <Icon size={12} color={event.iconColor} />
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineTitle}>{event.title}</Text>
                      <Text style={styles.timelineDesc}>{event.desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </AutoScrollView>
      </SafeAreaView>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 14 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 18, fontWeight: "700" as const, color: colors.foreground },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
    profileCard: { backgroundColor: colors.card, borderRadius: 24, padding: 28, alignItems: "center", gap: 10, marginBottom: 28, borderWidth: 1, borderColor: colors.border + "40" },
    avatarWrapper: { position: "relative", marginBottom: 4 },
    avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: colors.card },
    badgeWrapper: { position: "absolute", bottom: -2, right: -2, backgroundColor: colors.primary, borderRadius: 14, width: 28, height: 28, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: colors.card },
    badgeEmoji: { fontSize: 12 },
    profileName: { fontSize: 20, fontWeight: "700" as const, color: colors.foreground },
    statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN },
    statusText: { fontSize: 12, color: colors.mutedForeground },
    section: { gap: 16 },
    sectionLabel: { fontSize: 10, fontWeight: "800" as const, color: colors.mutedForeground, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
    timeline: { paddingLeft: 32, position: "relative", gap: 28 },
    timelineLine: { position: "absolute", left: 11, top: 8, bottom: 8, width: 2, backgroundColor: colors.border + "50" },
    timelineItem: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
    timelineItemMuted: { opacity: 0.55 },
    timelineIconWrapper: { position: "absolute", left: -32, top: 0, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: colors.background },
    timelineContent: { flex: 1 },
    timelineTitle: { fontSize: 14, fontWeight: "700" as const, color: colors.foreground, marginBottom: 2 },
    timelineDesc: { fontSize: 12, color: colors.mutedForeground, lineHeight: 18 },
  });
}
