import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { AutoScrollView } from "@/components/AutoScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

const SIZES = [
  { id: "1-20", label: "1 – 20", sublabel: "Just getting started", emoji: "🌱" },
  { id: "20-50", label: "20 – 50", sublabel: "Growing community", emoji: "🌿" },
  { id: "50-150", label: "50 – 150", sublabel: "Established congregation", emoji: "🌳" },
  { id: "150+", label: "150+", sublabel: "Large church", emoji: "⛪" },
];

export default function ChurchSize() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.progressRow}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: "42.9%" }]} />
          </View>
          <Text style={styles.stepText}>Step 3 of 7</Text>
        </View>

        <View style={styles.headingArea}>
          <Text style={styles.title}>How many people are in your group?</Text>
          <Text style={styles.subtitle}>We'll recommend the right plan for your size.</Text>
        </View>

        <AutoScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {SIZES.map((opt) => {
            const isSelected = selected === opt.id;
            return (
              <Pressable
                key={opt.id}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setSelected(opt.id)}
                testID={`church-size-${opt.id}`}
              >
                <Text style={styles.cardEmoji}>{opt.emoji}</Text>
                <View style={styles.cardText}>
                  <Text style={styles.cardLabel}>{opt.label}</Text>
                  <Text style={styles.cardSublabel}>{opt.sublabel}</Text>
                </View>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </AutoScrollView>

        <Pressable
          style={({ pressed }) => [
            styles.continueBtn,
            !selected && styles.continueBtnDisabled,
            pressed && selected && styles.btnPressed,
          ]}
          onPress={() => router.push("/onboarding/church-setup" as never)}
          disabled={!selected}
          testID="church-size-continue"
        >
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
    card: { flexDirection: "row", alignItems: "center", gap: 16, padding: 20, backgroundColor: colors.card, borderRadius: 22, borderWidth: 2, borderColor: colors.border },
    cardSelected: { borderColor: colors.primary, backgroundColor: colors.accent },
    cardEmoji: { fontSize: 28 },
    cardText: { flex: 1, gap: 3 },
    cardLabel: { fontSize: 20, fontWeight: "800" as const, color: colors.foreground },
    cardSublabel: { fontSize: 13, color: colors.mutedForeground },
    radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    radioSelected: { borderColor: colors.primary },
    radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
    continueBtn: { height: 62, backgroundColor: colors.primary, borderRadius: 20, alignItems: "center" as const, justifyContent: "center" as const, marginTop: 20, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 6 },
    continueBtnDisabled: { opacity: 0.4 },
    btnPressed: { opacity: 0.9 },
    continueBtnText: { fontSize: 17, fontWeight: "700" as const, color: colors.primaryForeground },
  });
}
