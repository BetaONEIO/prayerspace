import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Mail, Bell, Calendar, Users } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import ThemedSwitch from "@/components/ThemedSwitch";

export default function EmailConsentScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [prefs, setPrefs] = useState({ immediate: true, weekly: true, contacts: true });
  const toggle = (key: keyof typeof prefs) => setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.backRow}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.secondaryForeground} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.iconCircle}><Mail size={42} color={colors.primary} /></View>
        <View style={styles.textBlock}>
          <Text style={styles.title}>Never miss a prayer.</Text>
          <Text style={styles.subtitle}>Allow PrayerPal to send you emails when someone in your circle lifts you up, or for important community updates.</Text>
        </View>
        <View style={styles.optionsCard}>
          {[
            { key: "immediate" as const, icon: Bell, label: "Immediate Alerts" },
            { key: "weekly" as const, icon: Calendar, label: "Weekly Inspiration" },
            { key: "contacts" as const, icon: Users, label: "Contact Notifications" },
          ].map(({ key, icon: Icon, label }) => (
            <View key={key} style={styles.optionRow}>
              <View style={styles.optionLeft}><Icon size={20} color={colors.primary} /><Text style={styles.optionText}>{label}</Text></View>
              <ThemedSwitch value={prefs[key]} onValueChange={() => toggle(key)} />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.acceptBtn} onPress={() => router.push("/(tabs)/(home)")}>
          <Text style={styles.acceptBtnText}>Accept & Continue</Text>
        </Pressable>
        <Pressable style={styles.skipBtn} onPress={() => router.back()}>
          <Text style={styles.skipBtnText}>Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    backRow: { paddingHorizontal: 24, paddingTop: 8 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" },
    body: { flex: 1, paddingHorizontal: 32, alignItems: "center", justifyContent: "center", gap: 28 },
    iconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary + "14", alignItems: "center", justifyContent: "center" },
    textBlock: { alignItems: "center", gap: 12 },
    title: { fontSize: 22, fontWeight: "800" as const, color: colors.foreground, textAlign: "center" },
    subtitle: { fontSize: 15, color: colors.mutedForeground, textAlign: "center", lineHeight: 22 },
    optionsCard: { width: "100%", backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.border + "60", overflow: "hidden", padding: 4, gap: 4 },
    optionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
    optionLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    optionText: { fontSize: 14, fontWeight: "600" as const, color: colors.foreground },
    footer: { paddingHorizontal: 32, paddingBottom: 24, gap: 10 },
    acceptBtn: { backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 999, alignItems: "center", shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    acceptBtnText: { fontSize: 16, fontWeight: "700" as const, color: colors.primaryForeground },
    skipBtn: { paddingVertical: 10, alignItems: "center" },
    skipBtnText: { fontSize: 14, fontWeight: "600" as const, color: colors.mutedForeground },
  });
}
