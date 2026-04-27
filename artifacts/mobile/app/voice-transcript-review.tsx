import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, TextInput, KeyboardAvoidingView, StatusBar, ActivityIndicator, Alert } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { AutoScrollView } from '@/components/AutoScrollView';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, RotateCcw, ArrowRight, Mic, Pencil, Check, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { transcribeAudio } from "@/lib/transcribe";

export default function VoiceTranscriptReviewScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ duration?: string; audioUri?: string }>();
  const durationSeconds = parseInt(params.duration ?? "0", 10);
  const audioUri = params.audioUri ?? "";
  const [editedText, setEditedText] = useState("");
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [draftText, setDraftText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const { DiscardModal } = useUnsavedChangesWarning(editedText.trim().length > 0);

  const transcribeMutation = useMutation({
    mutationFn: async (uri: string) => transcribeAudio(uri),
    onSuccess: (text) => {
      setEditedText(text);
      setDraftText(text);
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Could not transcribe audio.";
      Alert.alert("Transcription Error", message);
    },
  });

  useEffect(() => {
    if (!audioUri) {
      Alert.alert("Transcription Error", "No audio recording was found. Please record again.");
      return;
    }
    transcribeMutation.mutate(audioUri);
  }, [audioUri, transcribeMutation]);

  const handleContinue = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace({ pathname: "/prayer-mode" as never, params: { transcript: editedText } });
  }, [router, editedText]);

  const parts = editedText ? [{ text: editedText, highlight: false }] : [];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}><ArrowLeft size={20} color={colors.secondaryForeground} /></Pressable>
          <Text style={styles.headerTitle}>Review Prayer</Text>
          <View style={{ width: 40 }} />
        </View>

        <AutoScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.transcriptCard}>
            <Text style={styles.transcriptionLabel}>Transcription</Text>
            {transcribeMutation.isPending ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Transcribing your prayer...</Text>
              </View>
            ) : editedText.trim().length > 0 ? (
              <Text style={styles.transcriptText}>"{editedText}"</Text>
            ) : (
              <Text style={styles.emptyText}>No transcription available. Tap Re-record to try again.</Text>
            )}
            <View style={styles.transcriptMeta}>
              <Mic size={16} color={colors.mutedForeground} />
              <Text style={styles.transcriptMetaText}>{`${Math.floor(durationSeconds / 60).toString().padStart(2, "0")}:${(durationSeconds % 60).toString().padStart(2, "0")} recorded`}</Text>
            </View>
            {!transcribeMutation.isPending && editedText.trim().length > 0 && (
              <Pressable style={styles.editTextBtn} onPress={() => { setDraftText(editedText); setIsEditModalVisible(true); }}>
                <Pencil size={15} color={colors.primary} />
                <Text style={styles.editTextBtnText}>Edit Text</Text>
              </Pressable>
            )}
          </View>
        </AutoScrollView>

        <View style={styles.footer}>
          <Pressable style={[styles.primaryBtn, (transcribeMutation.isPending || editedText.trim().length === 0) && styles.primaryBtnDisabled]} onPress={handleContinue} disabled={transcribeMutation.isPending || editedText.trim().length === 0}>
            <Text style={styles.primaryBtnText}>Continue</Text>
            <ArrowRight size={20} color={colors.primaryForeground} />
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
            <RotateCcw size={20} color={colors.secondaryForeground} />
            <Text style={styles.secondaryBtnText}>Re-record</Text>
          </Pressable>
        </View>

        {isEditModalVisible && (
          <View style={styles.fullScreenOverlay}>
            <SafeAreaView style={styles.modalSafeArea} edges={["top", "bottom"]}>
              <KeyboardAvoidingView style={styles.modalKeyboard} behavior={Platform.OS === "ios" ? "padding" : "height"}>
                <View style={styles.modalFullHeader}>
                  <Pressable style={styles.modalCloseBtn} onPress={() => setIsEditModalVisible(false)}><X size={18} color={colors.mutedForeground} /></Pressable>
                  <Text style={styles.modalTitle}>Edit Transcription</Text>
                  <Pressable style={styles.modalSaveTopBtn} onPress={() => { setEditedText(draftText); setIsEditModalVisible(false); }}><Text style={styles.modalSaveTopText}>Save</Text></Pressable>
                </View>
                <View style={styles.modalBody}>
                  <TextInput ref={inputRef} style={styles.modalInput} value={draftText} onChangeText={setDraftText} multiline autoFocus textAlignVertical="top" placeholder="Your transcription..." placeholderTextColor={colors.mutedForeground + "60"} scrollEnabled />
                  <Pressable style={styles.saveBtn} onPress={() => { setEditedText(draftText); setIsEditModalVisible(false); }}>
                    <Check size={18} color={colors.primaryForeground} />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </Pressable>
                </View>
              </KeyboardAvoidingView>
            </SafeAreaView>
          </View>
        )}
      </SafeAreaView>
      {DiscardModal}
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 14 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 18, fontWeight: "700" as const, color: colors.foreground },
    scrollArea: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 20 },
    transcriptionLabel: { fontSize: 11, fontWeight: "700" as const, color: colors.primary, letterSpacing: 2, textTransform: "uppercase" as const, marginBottom: 4 },
    transcriptCard: { backgroundColor: colors.card, borderRadius: 32, padding: 28, borderWidth: 1, borderColor: colors.border + "60" },
    loadingRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, paddingVertical: 20 },
    loadingText: { fontSize: 15, fontWeight: "600" as const, color: colors.primary },
    emptyText: { fontSize: 15, lineHeight: 24, color: colors.mutedForeground, fontStyle: "italic" as const, paddingVertical: 12 },
    primaryBtnDisabled: { opacity: 0.45, shadowOpacity: 0 },
    transcriptText: { fontSize: 17, lineHeight: 28, color: colors.secondaryForeground, fontStyle: "italic" as const, fontWeight: "500" as const, marginTop: 6 },
    transcriptMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20 },
    transcriptMetaText: { fontSize: 12, color: colors.mutedForeground },
    editTextBtn: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, marginTop: 16, alignSelf: "flex-start" as const, backgroundColor: colors.primary + "15", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
    editTextBtnText: { fontSize: 12, fontWeight: "700" as const, color: colors.primary, letterSpacing: 0.5 },
    footer: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 12, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border + "20", gap: 12 },
    primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 999, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
    primaryBtnText: { fontSize: 16, fontWeight: "700" as const, color: colors.primaryForeground },
    secondaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.secondary, paddingVertical: 18, borderRadius: 999 },
    secondaryBtnText: { fontSize: 16, fontWeight: "700" as const, color: colors.secondaryForeground },
    fullScreenOverlay: { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.background, zIndex: 999 },
    modalSafeArea: { flex: 1, backgroundColor: colors.background },
    modalKeyboard: { flex: 1 },
    modalFullHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border + "30" },
    modalTitle: { fontSize: 17, fontWeight: "700" as const, color: colors.foreground },
    modalCloseBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" },
    modalSaveTopBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.primary + "15" },
    modalSaveTopText: { fontSize: 14, fontWeight: "700" as const, color: colors.primary },
    modalBody: { flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, gap: 16 },
    modalInput: { flex: 1, backgroundColor: colors.card, borderRadius: 20, padding: 18, fontSize: 16, lineHeight: 26, color: colors.foreground, fontWeight: "500" as const, borderWidth: 1.5, borderColor: colors.primary + "40", textAlignVertical: "top" as const },
    saveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 999, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
    saveBtnText: { fontSize: 15, fontWeight: "700" as const, color: colors.primaryForeground },
  });
}
