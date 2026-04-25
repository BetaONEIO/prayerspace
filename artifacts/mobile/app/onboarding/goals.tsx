import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Heart, Users, Leaf, BookOpen, Check } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

const GOALS = [
  { id: "faith", label: "Strengthen my faith", icon: Heart },
  { id: "community", label: "Connect with community", icon: Users },
  { id: "mindfulness", label: "Daily mindfulness", icon: Leaf },
  { id: "journal", label: "Journal my journey", icon: BookOpen },
];

export default function OnboardingGoals() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.progressRow}>
          <View style={styles.progressBg}><View style={[styles.progressFill, { width: "20%" }]} /></View>
          <Text style={styles.stepText}>Step 1 of 5</Text>
        </View>
        <View style={styles.headingArea}>
          <Text style={styles.title}>Why are you using PrayerPal?</Text>
          <Text style={styles.subtitle}>Select all that apply to help us personalize your experience.</Text>
        </View>
        <AutoScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {GOALS.map((goal) => {
            const isSelected = selected.has(goal.id);
            const IconComp = goal.icon;
            return (
              <Pressable key={goal.id} style={[styles.card, isSelected && styles.cardSelected]} onPress={() => toggle(goal.id)} testID={`goal-${goal.id}`}>
                <View style={styles.cardLeft}>
                  <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                    <IconComp size={24} color={isSelected ? colors.primaryForeground : colors.primary} />
                  </View>
                  <Text style={styles.cardLabel}>{goal.label}</Text>
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Check size={14} color={colors.primaryForeground} strokeWidth={3} />}
                </View>
              </Pressable>
            );
          })}
        </AutoScrollView>
        <Pressable style={({ pressed }) => [styles.continueBtn, pressed && styles.btnPressed]} onPress={() => router.push("/onboarding/habits" as never)}>
          <Text style={styles.continueBtnText}>Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    inner: { flex: 1, paddingHorizontal: 24, paddingBottom: 32, gap: 0 },
    progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 36, marginTop: 4 },
    progressBg: { flex: 1, height: 6, backgroundColor: colors.secondary, borderRadius: 3, overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3 },
    stepText: { fontSize: 10, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 1.2, textTransform: "uppercase" },
    headingArea: { gap: 10, marginBottom: 28 },
    title: { fontSize: 28, fontWeight: "800" as const, color: colors.foreground, lineHeight: 36 },
    subtitle: { fontSize: 15, color: colors.mutedForeground, lineHeight: 22 },
    list: { flex: 1 },
    listContent: { gap: 12, paddingBottom: 8 },
    card: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18, backgroundColor: colors.card, borderRadius: 20, borderWidth: 2, borderColor: colors.border },
    cardSelected: { borderColor: colors.primary + "66", backgroundColor: colors.accent },
    cardLeft: { flexDirection: "row", alignItems: "center", gap: 16 },
    iconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" },
    iconWrapSelected: { backgroundColor: colors.primary },
    cardLabel: { fontSize: 17, fontWeight: "700" as const, color: colors.foreground },
    checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
    checkboxSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
    continueBtn: { height: 62, backgroundColor: colors.primary, borderRadius: 20, alignItems: "center" as const, justifyContent: "center" as const, marginTop: 20, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 6 },
    btnPressed: { opacity: 0.9 },
    continueBtnText: { fontSize: 17, fontWeight: "700" as const, color: colors.primaryForeground },
  });
}
