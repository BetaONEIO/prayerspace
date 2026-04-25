import React, { useRef, useEffect, useCallback, useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Platform, Modal } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BookOpen, ChevronRight, BookmarkPlus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { usePrayer } from "@/providers/PrayerProvider";
import { markAsPrayed, markAsJournaled } from "@/mocks/prayerSessionState";

export default function PraySelectionScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { senderName, prayerId, prayerRequest, contactAvatar } = useLocalSearchParams<{ senderName: string; prayerId: string; prayerRequest?: string; contactAvatar?: string }>();
  const { addJournalEntry } = usePrayer();
  const [showJournalPrompt, setShowJournalPrompt] = useState(false);

  const slideAnim = useRef(new Animated.Value(80)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const promptScaleAnim = useRef(new Animated.Value(0.85)).current;
  const promptFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }, []);

  const openJournalPrompt = useCallback(() => {
    setShowJournalPrompt(true);
    Animated.parallel([
      Animated.spring(promptScaleAnim, { toValue: 1, useNativeDriver: true, tension: 180, friction: 12 }),
      Animated.timing(promptFadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePrayForThem = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (prayerId) markAsPrayed(prayerId);
    openJournalPrompt();
  }, [prayerId, openJournalPrompt]);

  const handleAddToJournal = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (prayerId) { markAsPrayed(prayerId); markAsJournaled(prayerId); }
    addJournalEntry({ title: `Praying for ${senderName ?? "Someone"}`, body: `Prayer request from ${senderName ?? "Someone"}.`, tag: "praying_for", contactName: senderName ?? undefined, contactAvatar: contactAvatar ?? undefined, prayerRequest: prayerRequest ?? undefined });
    router.replace({ pathname: "/journal-added-success", params: { senderName: senderName ?? "Someone" } });
  }, [addJournalEntry, senderName, contactAvatar, prayerRequest, router, prayerId]);

  const handleJournalYes = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (prayerId) markAsJournaled(prayerId);
    addJournalEntry({ title: `Praying for ${senderName ?? "Someone"}`, body: `Prayer request from ${senderName ?? "Someone"}.`, tag: "praying_for", contactName: senderName ?? undefined, contactAvatar: contactAvatar ?? undefined, prayerRequest: prayerRequest ?? undefined });
    setShowJournalPrompt(false);
    router.replace({ pathname: "/journal-added-success", params: { senderName: senderName ?? "Someone" } });
  }, [addJournalEntry, senderName, router, prayerId]);

  return (
    <View style={styles.overlay} testID="pray-selection-screen">
      <Animated.View style={[styles.sheet, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle} />

        <Text style={styles.title}>Join in Prayer</Text>
        <Text style={styles.subtitle}>
          How would you like to lift up{"\n"}
          <Text style={styles.subtitleName}>{senderName ?? "this person"}</Text>'s request today?
        </Text>

        <View style={styles.options}>
          <Pressable style={({ pressed }) => [styles.optionCard, styles.optionCardPrimary, pressed && styles.pressed]} onPress={handlePrayForThem} testID="pray-now-btn">
            <View style={styles.optionIconWrap}><Text style={styles.prayIconEmoji}>🙏</Text></View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitleLight}>Pray</Text>
              <Text style={styles.optionSubLight}>{`LET ${(senderName ?? "THEM").toUpperCase()} KNOW YOU'RE PRAYING`}</Text>
            </View>
            <ChevronRight size={20} color={colors.primaryForeground + "80"} />
          </Pressable>

          <Pressable style={({ pressed }) => [styles.optionCard, styles.optionCardSecondary, pressed && styles.pressed]} onPress={handleAddToJournal} testID="add-to-journal-btn">
            <View style={[styles.optionIconWrap, styles.optionIconWrapSecondary]}><BookOpen size={28} color={colors.primary} /></View>
            <View style={styles.optionText}>
              <Text style={styles.optionTitleDark}>Add to Prayer Journal</Text>
              <Text style={styles.optionSubDark}>SAVE FOR YOUR PRAYER TIME</Text>
            </View>
            <ChevronRight size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <Pressable style={styles.cancelBtn} onPress={() => router.back()} testID="cancel-btn">
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>

        <SafeAreaView edges={["bottom"]} />
      </Animated.View>

      <Modal visible={showJournalPrompt} transparent animationType="none" statusBarTranslucent>
        <View style={styles.promptOverlay}>
          <Animated.View style={[styles.promptCard, { opacity: promptFadeAnim, transform: [{ scale: promptScaleAnim }] }]}>
            <View style={styles.promptIconWrap}><BookmarkPlus size={32} color={colors.primary} /></View>
            <Text style={styles.promptTitle}>Add to Prayer Journal?</Text>
            <Text style={styles.promptBody}>
              Would you like to save{" "}
              <Text style={styles.promptName}>{senderName ?? "this person"}</Text>
              's request to your Prayer Journal so you can continue praying for them?
            </Text>
            <View style={styles.promptActions}>
              <Pressable style={({ pressed }) => [styles.promptBtnYes, pressed && styles.pressed]} onPress={handleJournalYes} testID="journal-yes-btn">
                <Text style={styles.promptBtnYesText}>Yes, Add It</Text>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.promptBtnLater, pressed && styles.pressed]} onPress={() => { setShowJournalPrompt(false); router.back(); }} testID="journal-later-btn">
                <Text style={styles.promptBtnLaterText}>Maybe Later</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    sheet: { backgroundColor: colors.background, borderTopLeftRadius: 40, borderTopRightRadius: 40, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
    handle: { width: 48, height: 5, borderRadius: 3, backgroundColor: colors.muted, alignSelf: "center" as const, marginBottom: 28 },
    title: { fontSize: 26, fontWeight: "800" as const, color: colors.foreground, textAlign: "center" as const, marginBottom: 8 },
    subtitle: { fontSize: 14, color: colors.mutedForeground, fontWeight: "500" as const, textAlign: "center" as const, lineHeight: 22, marginBottom: 28 },
    subtitleName: { fontWeight: "700" as const, color: colors.foreground },
    options: { gap: 14, marginBottom: 24 },
    optionCard: { flexDirection: "row", alignItems: "center", gap: 16, padding: 20, borderRadius: 28 },
    optionCardPrimary: { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 20, elevation: 6 },
    optionCardSecondary: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
    pressed: { opacity: 0.88 },
    optionIconWrap: { width: 56, height: 56, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center" as const, justifyContent: "center" as const },
    optionIconWrapSecondary: { backgroundColor: colors.accent },
    prayIconEmoji: { fontSize: 28 },
    optionText: { flex: 1, gap: 4 },
    optionTitleLight: { fontSize: 17, fontWeight: "800" as const, color: colors.primaryForeground },
    optionSubLight: { fontSize: 9, fontWeight: "700" as const, color: "rgba(255,255,255,0.65)", letterSpacing: 1 },
    optionTitleDark: { fontSize: 17, fontWeight: "800" as const, color: colors.foreground },
    optionSubDark: { fontSize: 9, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 1 },
    cancelBtn: { paddingVertical: 16, alignItems: "center" as const },
    cancelText: { fontSize: 13, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 1, textTransform: "uppercase" as const },
    promptOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: 28 },
    promptCard: { backgroundColor: colors.card, borderRadius: 32, padding: 32, width: "100%" as const, alignItems: "center" as const },
    promptIconWrap: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.accent, alignItems: "center" as const, justifyContent: "center" as const, marginBottom: 20 },
    promptTitle: { fontSize: 22, fontWeight: "800" as const, color: colors.foreground, textAlign: "center" as const, marginBottom: 10 },
    promptBody: { fontSize: 14, color: colors.mutedForeground, textAlign: "center" as const, lineHeight: 22, marginBottom: 28 },
    promptName: { fontWeight: "700" as const, color: colors.foreground },
    promptActions: { width: "100%" as const, gap: 10 },
    promptBtnYes: { backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 16, alignItems: "center" as const, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 14, elevation: 6 },
    promptBtnYesText: { fontSize: 16, fontWeight: "800" as const, color: colors.primaryForeground },
    promptBtnLater: { paddingVertical: 14, alignItems: "center" as const },
    promptBtnLaterText: { fontSize: 14, fontWeight: "600" as const, color: colors.mutedForeground },
  });
}
