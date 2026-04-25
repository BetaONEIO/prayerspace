import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Sun, Stars, Moon, Calendar, Check } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

const HABITS = [
  { id: "morning", label: "Every morning", sublabel: "Start the day with peace", icon: Sun },
  { id: "multiple", label: "Multiple times daily", sublabel: "Throughout the day", icon: Stars },
  { id: "bedtime", label: "Before bed", sublabel: "Reflect and rest", icon: Moon },
  { id: "occasional", label: "Occasionally", sublabel: "When I feel the need", icon: Calendar },
];

export default function OnboardingHabits() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selected, setSelected] = useState<string>("morning");

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.progressRow}>
          <View style={styles.progressBg}><View style={[styles.progressFill, { width: "40%" }]} /></View>
          <Text style={styles.stepText}>Step 2 of 5</Text>
        </View>
        <View style={styles.headingArea}>
          <Text style={styles.title}>How often do you pray?</Text>
          <Text style={styles.subtitle}>This helps us set gentle reminders that fit your lifestyle.</Text>
        </View>
        <AutoScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {HABITS.map((habit) => {
            const isSelected = selected === habit.id;
            const IconComp = habit.icon;
            return (
              <Pressable key={habit.id} style={[styles.card, isSelected && styles.cardSelected]} onPress={() => setSelected(habit.id)} testID={`habit-${habit.id}`}>
                <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                  <IconComp size={28} color={isSelected ? colors.primaryForeground : colors.primary} />
                </View>
                <View style={styles.textWrap}>
                  <Text style={styles.cardLabel}>{habit.label}</Text>
                  <Text style={styles.cardSublabel}>{habit.sublabel}</Text>
                </View>
                {isSelected && <View style={styles.checkBadge}><Check size={16} color={colors.primary} strokeWidth={3} /></View>}
              </Pressable>
            );
          })}
        </AutoScrollView>
        <Pressable style={({ pressed }) => [styles.continueBtn, pressed && styles.btnPressed]} onPress={() => router.push("/onboarding/focus" as never)}>
          <Text style={styles.continueBtnText}>Continue</Text>
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
    headingArea: { gap: 10, marginBottom: 28 },
    title: { fontSize: 28, fontWeight: "800" as const, color: colors.foreground, lineHeight: 36 },
    subtitle: { fontSize: 15, color: colors.mutedForeground, lineHeight: 22 },
    list: { flex: 1 },
    listContent: { gap: 14, paddingBottom: 8 },
    card: { flexDirection: "row", alignItems: "center", gap: 18, padding: 20, backgroundColor: colors.card, borderRadius: 24, borderWidth: 2, borderColor: colors.border },
    cardSelected: { borderColor: colors.primary, backgroundColor: colors.accent },
    iconWrap: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" },
    iconWrapSelected: { backgroundColor: colors.primary },
    textWrap: { flex: 1, gap: 3 },
    cardLabel: { fontSize: 18, fontWeight: "700" as const, color: colors.foreground },
    cardSublabel: { fontSize: 13, color: colors.mutedForeground },
    checkBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    continueBtn: { height: 62, backgroundColor: colors.primary, borderRadius: 20, alignItems: "center" as const, justifyContent: "center" as const, marginTop: 20, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 6 },
    btnPressed: { opacity: 0.9 },
    continueBtnText: { fontSize: 17, fontWeight: "700" as const, color: colors.primaryForeground },
  });
}
