import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Home, Heart, Briefcase, Sparkles, Wind, Plus, Check } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

const FOCUS_OPTIONS = [
  { id: "family", label: "Family", icon: Home },
  { id: "health", label: "Health", icon: Heart },
  { id: "work", label: "Work & finances", icon: Briefcase },
  { id: "faith", label: "Faith & growth", icon: Sparkles },
  { id: "anxiety", label: "Anxiety & peace", icon: Wind },
  { id: "other", label: "Other", icon: Plus },
];

export default function OnboardingFocus() {
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
          <View style={styles.progressBg}><View style={[styles.progressFill, { width: "60%" }]} /></View>
          <Text style={styles.stepText}>Step 3 of 5</Text>
        </View>
        <View style={styles.headingArea}>
          <Text style={styles.title}>What would you like prayer for right now?</Text>
          <Text style={styles.subtitle}>Pick as many as feel relevant. You can update this anytime.</Text>
        </View>
        <AutoScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid}>
          {FOCUS_OPTIONS.map((opt) => {
            const isSelected = selected.has(opt.id);
            const IconComp = opt.icon;
            return (
              <Pressable key={opt.id} style={[styles.cell, isSelected && styles.cellSelected]} onPress={() => toggle(opt.id)} testID={`focus-${opt.id}`}>
                {isSelected && (
                  <View style={styles.checkBadge}>
                    <Check size={12} color={colors.primaryForeground} strokeWidth={3} />
                  </View>
                )}
                <View style={[styles.cellIconWrap, isSelected && styles.cellIconWrapSelected]}>
                  <IconComp size={28} color={isSelected ? colors.primaryForeground : colors.primary} />
                </View>
                <Text style={[styles.cellLabel, isSelected && styles.cellLabelSelected]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </AutoScrollView>
        <View style={styles.actions}>
          <Pressable style={({ pressed }) => [styles.continueBtn, pressed && styles.btnPressed]} onPress={() => router.push("/onboarding/improvement" as never)}>
            <Text style={styles.continueBtnText}>Continue</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]} onPress={() => router.push("/onboarding/improvement" as never)}>
            <Text style={styles.skipBtnText}>Skip for now</Text>
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
    progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 36, marginTop: 4 },
    progressBg: { flex: 1, height: 6, backgroundColor: colors.secondary, borderRadius: 3, overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3 },
    stepText: { fontSize: 10, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 1.2, textTransform: "uppercase" },
    headingArea: { gap: 10, marginBottom: 24 },
    title: { fontSize: 28, fontWeight: "800" as const, color: colors.foreground, lineHeight: 36 },
    subtitle: { fontSize: 15, color: colors.mutedForeground, lineHeight: 22 },
    scroll: { flex: 1 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingBottom: 8 },
    cell: { width: "47%", aspectRatio: 1, backgroundColor: colors.card, borderRadius: 24, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center", gap: 10, position: "relative" },
    cellSelected: { borderColor: colors.primary, backgroundColor: colors.accent },
    checkBadge: { position: "absolute", top: 12, right: 12, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    cellIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" },
    cellIconWrapSelected: { backgroundColor: colors.primary },
    cellLabel: { fontSize: 14, fontWeight: "700" as const, color: colors.mutedForeground, textAlign: "center", paddingHorizontal: 8 },
    cellLabelSelected: { color: colors.foreground },
    actions: { gap: 10, marginTop: 16 },
    continueBtn: { height: 62, backgroundColor: colors.primary, borderRadius: 20, alignItems: "center" as const, justifyContent: "center" as const, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 6 },
    btnPressed: { opacity: 0.9 },
    continueBtnText: { fontSize: 17, fontWeight: "700" as const, color: colors.primaryForeground },
    skipBtn: { paddingVertical: 10, alignItems: "center" },
    skipBtnText: { fontSize: 14, fontWeight: "600" as const, color: colors.mutedForeground },
  });
}
