import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Users } from "lucide-react-native";
import { Stack, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";

export default function WritePrayerScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [prayerText, setPrayerText] = useState("");

  const { DiscardModal } = useUnsavedChangesWarning(prayerText.trim().length > 0);

  const handleContinue = useCallback(() => {
    if (!prayerText.trim()) return;
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/select-contacts", params: { prayerText } });
  }, [prayerText, router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}><ArrowLeft size={20} color={colors.secondaryForeground} /></Pressable>
            <Text style={styles.headerTitle}>Write Prayer</Text>
            <View style={{ width: 40 }} />
          </View>

          <AutoScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Write your prayer</Text>
            <Text style={styles.subtitle}>Write a message to encourage the people you've prayed for today.</Text>

            <View style={styles.textareaWrapper}>
              <TextInput style={styles.textarea} placeholder="Hi, I prayed for peace, strength, and blessing over you today..." placeholderTextColor={colors.mutedForeground + "60"} value={prayerText} onChangeText={setPrayerText} multiline textAlignVertical="top" autoFocus={false} />
              <Text style={styles.helperText}>Optional — you can send this to one or many.</Text>
            </View>
          </AutoScrollView>

          <View style={styles.footer}>
            <Pressable style={[styles.continueBtn, !prayerText.trim() && styles.continueBtnDisabled]} onPress={handleContinue} disabled={!prayerText.trim()}>
              <Text style={styles.continueBtnText}>Choose people</Text>
              <Users size={20} color={colors.primaryForeground} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {DiscardModal}
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 14 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 17, fontWeight: "600" as const, color: colors.foreground },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },
    title: { fontSize: 24, fontWeight: "700" as const, color: colors.foreground, marginBottom: 8, marginTop: 8 },
    subtitle: { fontSize: 15, color: colors.mutedForeground, lineHeight: 22, marginBottom: 24 },
    textareaWrapper: { backgroundColor: colors.card, borderRadius: 24, padding: 24, minHeight: 260, borderWidth: 2, borderColor: colors.border + "40" },
    textarea: { fontSize: 17, color: colors.foreground, lineHeight: 26, flex: 1, minHeight: 200 },
    helperText: { fontSize: 11, color: colors.mutedForeground + "80", marginTop: 12 },
    footer: { padding: 24, paddingBottom: Platform.OS === "android" ? 24 : 16, backgroundColor: colors.background },
    continueBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 },
    continueBtnDisabled: { opacity: 0.45 },
    continueBtnText: { fontSize: 16, fontWeight: "700" as const, color: colors.primaryForeground },
  });
}
