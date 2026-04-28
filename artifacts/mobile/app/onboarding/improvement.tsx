import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Platform, UIManager, LayoutAnimation } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Users, Bell, Sun, Calendar, Moon, Stars } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const COMMUNITY_OPTIONS = [
  { id: "yes", label: "Yes, I'd love that" },
  { id: "maybe", label: "Maybe later" },
  { id: "no", label: "Not right now" },
];

const REMINDER_TIMES = [
  { id: "morning", label: "Morning", sub: "8:00 AM", icon: Sun },
  { id: "afternoon", label: "Afternoon", sub: "12:00 PM", icon: Calendar },
  { id: "evening", label: "Evening", sub: "7:00 PM", icon: Stars },
  { id: "night", label: "Night", sub: "9:00 PM", icon: Moon },
];

export default function OnboardingCommunityNotifications() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [community, setCommunity] = useState<string | null>(null);
  const [reminders, setReminders] = useState<boolean | null>(null);
  const [reminderTime, setReminderTime] = useState<string>("evening");

  const handleReminders = (val: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setReminders(val);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.progressRow}>
          <View style={styles.progressBg}><View style={[styles.progressFill, { width: "80%" }]} /></View>
          <Text style={styles.stepText}>Step 4 of 5</Text>
        </View>

        <AutoScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Community section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <Users size={20} color={colors.primary} />
              </View>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>Would you like to connect with others?</Text>
                <Text style={styles.sectionSub}>Prayer is more powerful when shared.</Text>
              </View>
            </View>
            <View style={styles.pillRow}>
              {COMMUNITY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.id}
                  style={[styles.pill, community === opt.id && styles.pillSelected]}
                  onPress={() => setCommunity(opt.id)}
                >
                  <Text style={[styles.pillText, community === opt.id && styles.pillTextSelected]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Notifications section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <Bell size={20} color={colors.primary} />
              </View>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>Would you like gentle reminders to pray?</Text>
                <Text style={styles.sectionSub}>We'll nudge softly — never spam.</Text>
              </View>
            </View>
            <View style={styles.yesNoRow}>
              <Pressable
                style={[styles.yesNoBtn, reminders === true && styles.yesNoBtnSelected]}
                onPress={() => handleReminders(true)}
              >
                <Text style={[styles.yesNoBtnText, reminders === true && styles.yesNoBtnTextSelected]}>Yes please</Text>
              </Pressable>
              <Pressable
                style={[styles.yesNoBtn, reminders === false && styles.yesNoBtnSelected]}
                onPress={() => handleReminders(false)}
              >
                <Text style={[styles.yesNoBtnText, reminders === false && styles.yesNoBtnTextSelected]}>Not for now</Text>
              </Pressable>
            </View>

            {reminders === true && (
              <View style={styles.timeSection}>
                <Text style={styles.timePrompt}>When works best for you?</Text>
                <View style={styles.timeGrid}>
                  {REMINDER_TIMES.map((t) => {
                    const isSelected = reminderTime === t.id;
                    const Icon = t.icon;
                    return (
                      <Pressable
                        key={t.id}
                        style={[styles.timeCell, isSelected && styles.timeCellSelected]}
                        onPress={() => setReminderTime(t.id)}
                      >
                        <Icon size={22} color={isSelected ? colors.primaryForeground : colors.primary} />
                        <Text style={[styles.timeCellLabel, isSelected && styles.timeCellLabelSelected]}>{t.label}</Text>
                        <Text style={[styles.timeCellSub, isSelected && styles.timeCellSubSelected]}>{t.sub}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        </AutoScrollView>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.continueBtn, pressed && styles.btnPressed]}
            onPress={() => router.push("/onboarding/paywall" as never)}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
            onPress={() => router.push("/onboarding/paywall" as never)}
          >
            <Text style={styles.skipBtnText}>Skip</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    inner: { flex: 1, paddingHorizontal: 24, paddingBottom: 32 },
    progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 32, marginTop: 4 },
    progressBg: { flex: 1, height: 6, backgroundColor: colors.secondary, borderRadius: 3, overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3 },
    stepText: { fontSize: 10, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 1.2, textTransform: "uppercase" },
    scroll: { flex: 1 },
    scrollContent: { gap: 0, paddingBottom: 8 },
    section: { gap: 16 },
    sectionHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    sectionIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
    sectionHeading: { flex: 1, gap: 4 },
    sectionTitle: { fontSize: 18, fontWeight: "800" as const, color: colors.foreground, lineHeight: 26 },
    sectionSub: { fontSize: 13, color: colors.mutedForeground, lineHeight: 18 },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 28 },
    pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    pill: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 100, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card },
    pillSelected: { borderColor: colors.primary, backgroundColor: colors.accent },
    pillText: { fontSize: 14, fontWeight: "600" as const, color: colors.mutedForeground },
    pillTextSelected: { color: colors.foreground, fontWeight: "700" as const },
    yesNoRow: { flexDirection: "row", gap: 12 },
    yesNoBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card, alignItems: "center" },
    yesNoBtnSelected: { borderColor: colors.primary, backgroundColor: colors.accent },
    yesNoBtnText: { fontSize: 15, fontWeight: "700" as const, color: colors.mutedForeground },
    yesNoBtnTextSelected: { color: colors.foreground },
    timeSection: { gap: 12, marginTop: 4 },
    timePrompt: { fontSize: 14, fontWeight: "600" as const, color: colors.mutedForeground },
    timeGrid: { flexDirection: "row", gap: 10 },
    timeCell: { flex: 1, paddingVertical: 14, borderRadius: 16, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card, alignItems: "center", gap: 4 },
    timeCellSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
    timeCellLabel: { fontSize: 12, fontWeight: "700" as const, color: colors.foreground },
    timeCellLabelSelected: { color: colors.primaryForeground },
    timeCellSub: { fontSize: 10, color: colors.mutedForeground },
    timeCellSubSelected: { color: colors.primaryForeground + "CC" },
    actions: { gap: 10, marginTop: 16 },
    continueBtn: { height: 62, backgroundColor: colors.primary, borderRadius: 20, alignItems: "center" as const, justifyContent: "center" as const, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 6 },
    btnPressed: { opacity: 0.9 },
    continueBtnText: { fontSize: 17, fontWeight: "700" as const, color: colors.primaryForeground },
    skipBtn: { paddingVertical: 10, alignItems: "center" },
    skipBtnText: { fontSize: 14, fontWeight: "600" as const, color: colors.mutedForeground },
  });
}
