import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { AutoScrollView } from "@/components/AutoScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MessageCircle, Users, Sun, Calendar, Check } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

const PURPOSES = [
  { id: "prayer", label: "Share prayer requests", icon: MessageCircle },
  { id: "connected", label: "Keep members connected", icon: Users },
  { id: "daily", label: "Encourage daily prayer", icon: Sun },
  { id: "ministry", label: "Organise ministry needs", icon: Calendar },
];

export default function ChurchPurpose() {
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
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: "28.6%" }]} />
          </View>
          <Text style={styles.stepText}>Step 2 of 7</Text>
        </View>

        <View style={styles.headingArea}>
          <Text style={styles.title}>How will you use Prayer Space?</Text>
          <Text style={styles.subtitle}>Pick all that apply. We'll configure things accordingly.</Text>
        </View>

        <AutoScrollView style={styles.list} showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {PURPOSES.map((opt) => {
            const isSelected = selected.has(opt.id);
            const Icon = opt.icon;
            return (
              <Pressable
                key={opt.id}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => toggle(opt.id)}
                testID={`church-purpose-${opt.id}`}
              >
                <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                  <Icon size={24} color={isSelected ? colors.primaryForeground : colors.primary} />
                </View>
                <Text style={styles.cardLabel}>{opt.label}</Text>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Check size={14} color={colors.primaryForeground} strokeWidth={3} />}
                </View>
              </Pressable>
            );
          })}
        </AutoScrollView>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.continueBtn, pressed && styles.btnPressed]}
            onPress={() => router.push("/onboarding/church-size" as never)}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
            onPress={() => router.push("/onboarding/church-size" as never)}
          >
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
    headingArea: { gap: 10, marginBottom: 28 },
    title: { fontSize: 28, fontWeight: "800" as const, color: colors.foreground, lineHeight: 36 },
    subtitle: { fontSize: 15, color: colors.mutedForeground, lineHeight: 22 },
    list: { flex: 1 },
    listContent: { gap: 12, paddingBottom: 8 },
    card: { flexDirection: "row", alignItems: "center", gap: 16, padding: 18, backgroundColor: colors.card, borderRadius: 22, borderWidth: 2, borderColor: colors.border },
    cardSelected: { borderColor: colors.primary + "66", backgroundColor: colors.accent },
    iconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    iconWrapSelected: { backgroundColor: colors.primary },
    cardLabel: { flex: 1, fontSize: 16, fontWeight: "700" as const, color: colors.foreground },
    checkbox: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    checkboxSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
    actions: { gap: 10, marginTop: 20 },
    continueBtn: { height: 62, backgroundColor: colors.primary, borderRadius: 20, alignItems: "center" as const, justifyContent: "center" as const, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 6 },
    btnPressed: { opacity: 0.9 },
    continueBtnText: { fontSize: 17, fontWeight: "700" as const, color: colors.primaryForeground },
    skipBtn: { paddingVertical: 10, alignItems: "center" },
    skipBtnText: { fontSize: 14, fontWeight: "600" as const, color: colors.mutedForeground },
  });
}
