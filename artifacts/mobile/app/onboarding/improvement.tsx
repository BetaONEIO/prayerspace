import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CheckSquare } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

const IMPROVEMENTS = [
  { id: "consistency", label: "Consistency" },
  { id: "gratitude", label: "Expressing Gratitude" },
  { id: "peace", label: "Finding Inner Peace" },
  { id: "spirituality", label: "Deepening Spirituality" },
  { id: "listening", label: "Listening for Answers" },
];

export default function OnboardingImprovement() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selected, setSelected] = useState<Set<string>>(new Set(["gratitude"]));

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
          <View style={styles.progressBg}><View style={[styles.progressFill, { width: "80%" }]} /></View>
          <Text style={styles.stepText}>Step 4 of 5</Text>
        </View>
        <View style={styles.headingArea}>
          <Text style={styles.title}>What would you like to improve?</Text>
          <Text style={styles.subtitle}>Select areas you'd like to focus on in your prayer life.</Text>
        </View>
        <AutoScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {IMPROVEMENTS.map((item) => {
            const isSelected = selected.has(item.id);
            return (
              <Pressable key={item.id} style={[styles.card, isSelected && styles.cardSelected]} onPress={() => toggle(item.id)} testID={`improvement-${item.id}`}>
                <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>{item.label}</Text>
                {isSelected ? <CheckSquare size={24} color={colors.primary} /> : <View style={styles.emptyBox} />}
              </Pressable>
            );
          })}
        </AutoScrollView>
        <Pressable style={({ pressed }) => [styles.continueBtn, pressed && styles.btnPressed]} onPress={() => router.push("/onboarding/paywall" as never)}>
          <Text style={styles.continueBtnText}>Last Step</Text>
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
    listContent: { gap: 12, paddingBottom: 8 },
    card: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 18, paddingHorizontal: 22, backgroundColor: colors.card, borderRadius: 18, borderWidth: 2, borderColor: colors.border },
    cardSelected: { borderColor: colors.primary, backgroundColor: colors.accent },
    cardLabel: { fontSize: 17, fontWeight: "700" as const, color: colors.foreground },
    cardLabelSelected: { color: colors.foreground },
    emptyBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border },
    continueBtn: { height: 62, backgroundColor: colors.primary, borderRadius: 20, alignItems: "center" as const, justifyContent: "center" as const, marginTop: 20, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 6 },
    btnPressed: { opacity: 0.9 },
    continueBtnText: { fontSize: 17, fontWeight: "700" as const, color: colors.primaryForeground },
  });
}
