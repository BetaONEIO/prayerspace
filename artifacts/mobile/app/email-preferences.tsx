import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import ThemedSwitch from "@/components/ThemedSwitch";

export default function EmailPreferencesScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [prefs, setPrefs] = useState({ prayerNotifications: true, groupActivity: true, dailyVerse: false, weeklySummary: true });
  const toggle = (key: keyof typeof prefs) => setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}><ArrowLeft size={20} color={colors.secondaryForeground} /></Pressable>
        <Text style={styles.title}>Email Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <AutoScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Core Emails</Text>
        <View style={styles.card}>
          {[
            { key: "prayerNotifications" as const, title: "Prayer Notifications", sub: "When someone prays for you specifically." },
            { key: "groupActivity" as const, title: "Group Activity", sub: "New requests in your joined groups.", isLast: true },
          ].map(({ key, title, sub, isLast }) => (
            <View key={key} style={[styles.toggleRow, !isLast && styles.toggleRowBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>{title}</Text>
                <Text style={styles.toggleSub}>{sub}</Text>
              </View>
              <ThemedSwitch value={prefs[key]} onValueChange={() => toggle(key)} />
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Digests & Updates</Text>
        <View style={styles.card}>
          {[
            { key: "dailyVerse" as const, title: "Daily Verse & Inspiration", sub: "Start your day with a curated verse." },
            { key: "weeklySummary" as const, title: "Weekly Spiritual Summary", sub: "A summary of your streaks and activity.", isLast: true },
          ].map(({ key, title, sub, isLast }) => (
            <View key={key} style={[styles.toggleRow, !isLast && styles.toggleRowBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>{title}</Text>
                <Text style={styles.toggleSub}>{sub}</Text>
              </View>
              <ThemedSwitch value={prefs[key]} onValueChange={() => toggle(key)} />
            </View>
          ))}
        </View>

        <View style={styles.consentCard}>
          <Text style={styles.consentTitle}>Mass Email Consent</Text>
          <Text style={styles.consentDesc}>Allow your contacts to send you "I prayed for you" mass email notifications if you don't have the app installed.</Text>
          <Pressable style={styles.revokeBtn}><Text style={styles.revokeBtnText}>Revoke Consent</Text></Pressable>
        </View>
      </AutoScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border + "50" },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 19, fontWeight: "700" as const, color: colors.foreground },
    content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 8 },
    sectionLabel: { fontSize: 11, fontWeight: "800" as const, color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10, marginTop: 16 },
    card: { backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border + "50", overflow: "hidden" },
    toggleRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
    toggleRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border + "40" },
    toggleTitle: { fontSize: 14, fontWeight: "700" as const, color: colors.foreground, marginBottom: 3 },
    toggleSub: { fontSize: 12, color: colors.mutedForeground, lineHeight: 17 },
    consentCard: { marginTop: 24, backgroundColor: colors.secondary, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: colors.border + "50", gap: 12 },
    consentTitle: { fontSize: 15, fontWeight: "700" as const, color: colors.foreground },
    consentDesc: { fontSize: 13, color: colors.mutedForeground, lineHeight: 19 },
    revokeBtn: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary, borderRadius: 16, paddingVertical: 12, alignItems: "center", marginTop: 4 },
    revokeBtnText: { fontSize: 13, fontWeight: "700" as const, color: colors.primary },
  });
}
