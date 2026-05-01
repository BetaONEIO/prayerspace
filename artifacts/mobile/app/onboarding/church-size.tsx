import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

const SIZES = [
  { id: "1-50", label: "1 – 50", sublabel: "Small group or new community", emoji: "🌱" },
  { id: "51-150", label: "51 – 150", sublabel: "Growing congregation or group", emoji: "🌿" },
  { id: "151-300", label: "151 – 300", sublabel: "Established community", emoji: "🌳" },
  { id: "300+", label: "300+", sublabel: "Large church or organisation", emoji: "⛪" },
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
            <View style={[styles.progressFill, { width: "66.7%" }]} />
          </View>
          <Text style={styles.stepText}>Step 2 of 3</Text>
        </View>

        <View style={styles.headingArea}>
          <Text style={styles.title}>How many people are in your community?</Text>
          <Text style={styles.subtitle}>This helps us set you up with the right plan.</Text>
        </View>

        <View style={styles.list}>
          {SIZES.map((opt) => {
            const isSelected = selected === opt.id;
            return (
              <Pressable
                key={opt.id}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setSelected(opt.id)}
                testID={`community-size-${opt.id}`}
              >
                <Text style={styles.cardEmoji}>{opt.emoji}</Text>
                <View style={styles.cardText}>
                  <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.cardSublabel}>{opt.sublabel}</Text>
                </View>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.continueBtn,
            !selected && styles.continueBtnDisabled,
            pressed && !!selected && styles.btnPressed,
          ]}
          onPress={() => router.push("/onboarding/church-details" as never)}
          disabled={!selected}
          testID="community-size-continue"
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
    progressRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 36,
      marginTop: 4,
    },
    progressBg: {
      flex: 1,
      height: 6,
      backgroundColor: colors.secondary,
      borderRadius: 3,
      overflow: "hidden",
    },
    progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3 },
    stepText: {
      fontSize: 10,
      fontWeight: "700" as const,
      color: colors.mutedForeground,
      letterSpacing: 1.2,
      textTransform: "uppercase",
    },
    headingArea: { gap: 10, marginBottom: 28 },
    title: { fontSize: 28, fontWeight: "800" as const, color: colors.foreground, lineHeight: 36 },
    subtitle: { fontSize: 15, color: colors.mutedForeground, lineHeight: 22 },
    list: { flex: 1, gap: 12 },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      padding: 20,
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 2,
      borderColor: colors.border,
    },
    cardSelected: { borderColor: colors.primary, backgroundColor: colors.accent },
    cardEmoji: { fontSize: 28 },
    cardText: { flex: 1, gap: 3 },
    cardLabel: { fontSize: 20, fontWeight: "800" as const, color: colors.foreground },
    cardLabelSelected: { color: colors.foreground },
    cardSublabel: { fontSize: 13, color: colors.mutedForeground },
    radio: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    radioSelected: { borderColor: colors.primary },
    radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
    continueBtn: {
      height: 62,
      backgroundColor: colors.primary,
      borderRadius: 20,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginTop: 20,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 6,
    },
    continueBtnDisabled: { opacity: 0.4 },
    btnPressed: { opacity: 0.9 },
    continueBtnText: { fontSize: 17, fontWeight: "700" as const, color: colors.primaryForeground },
  });
}
