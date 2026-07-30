import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Platform, TextInput, KeyboardAvoidingView, ActivityIndicator, Alert, Modal } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { AutoScrollView } from '@/components/AutoScrollView';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, RotateCcw, ArrowRight, Mic, Pencil, Check, X, AlertCircle } from "lucide-react-native";
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
  const params = useLocalSearchParams<{ duration?: string; audioUri?: string; returnTo?: string; pendingTitle?: string; pendingTag?: string }>();
  const durationSeconds = parseInt(params.duration ?? "0", 10);
  const audioUri = params.audioUri ?? "";
  const returnTo = params.returnTo ?? "prayer-mode";

  // The committed transcription text — what gets passed to the next screen.
  const [editedText, setEditedText] = useState("");
  // Draft inside the edit modal — isolated so changes don't affect the main view.
  const [draftText, setDraftText] = useState("");
  // Separate state for the manual fallback input (transcription returned nothing).
  // Kept independent from editedText so typing doesn't flip the render branch.
  const [manualInputText, setManualInputText] = useState("");

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  // True when the user has typed/edited but not yet pressed Save.
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);
  // Brief loading state shown on the Save button to prevent double-taps and
  // give clear visual confirmation that the save is being processed.
  const [isSaving, setIsSaving] = useState(false);

  // Used by the back-navigation discard guard.
  const [hasEverSaved, setHasEverSaved] = useState(false);
  const { DiscardModal } = useUnsavedChangesWarning(hasEverSaved && hasUnsavedEdits);

  const inputRef = useRef<TextInput>(null);
  const hasStartedRef = useRef(false);
  const continueGuardRef = useRef(false); // prevents rapid double-tap on Continue

  const transcribeMutation = useMutation({
    mutationFn: async (uri: string) => transcribeAudio(uri),
    onSuccess: (text) => {
      setEditedText(text);
      setDraftText(text);
      // Auto-transcribed text is already "saved" — no user action required.
      setHasUnsavedEdits(false);
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Could not transcribe audio.";
      Alert.alert("Transcription Error", message);
    },
  });

  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    if (!audioUri) {
      Alert.alert("Transcription Error", "No audio recording was found. Please record again.");
      return;
    }
    transcribeMutation.mutate(audioUri);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Save handlers ────────────────────────────────────────────────────────────

  /** Commit manual typed text — called from the "Save transcription" button. */
  const handleManualSave = useCallback(() => {
    if (isSaving || !manualInputText.trim()) return;
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSaving(true);
    // Small artificial delay so the user sees the saving state and trusts that
    // their input was captured. All processing is local so it resolves instantly.
    setTimeout(() => {
      setEditedText(manualInputText);
      setHasUnsavedEdits(false);
      setHasEverSaved(true);
      setIsSaving(false);
    }, 320);
  }, [isSaving, manualInputText]);

  /** Commit edits from the modal — called from both Save buttons inside it. */
  const handleModalSave = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditedText(draftText);
    setHasUnsavedEdits(false);
    setHasEverSaved(true);
    setIsEditModalVisible(false);
  }, [draftText]);

  /** Open the edit modal. Snapshot the current editedText into draftText. */
  const openEditModal = useCallback(() => {
    setDraftText(editedText);
    setIsEditModalVisible(true);
  }, [editedText]);

  /** Close the modal without saving. Discard the draft. */
  const closeModalWithoutSaving = useCallback(() => {
    setDraftText(editedText); // reset draft back to last saved value
    setIsEditModalVisible(false);
  }, [editedText]);

  // ── Continue ─────────────────────────────────────────────────────────────────

  const isContinueBlocked =
    hasUnsavedEdits || transcribeMutation.isPending || isSaving;

  const handleContinue = useCallback(() => {
    if (isContinueBlocked || continueGuardRef.current) return;
    continueGuardRef.current = true; // prevent rapid double-tap
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Use manually typed text as fallback when transcription returned nothing.
    const finalText = editedText || manualInputText;
    // Clear the unsaved flag BEFORE navigating so usePreventRemove doesn't
    // intercept this intentional navigation.
    setHasUnsavedEdits(false);
    if (returnTo === "journal") {
      router.replace({
        pathname: "/journal-entry" as never,
        params: {
          transcript: finalText,
          pendingTitle: params.pendingTitle ?? "",
          pendingTag: params.pendingTag ?? "",
        },
      });
    } else {
      router.replace({
        pathname: "/prayer-mode" as never,
        params: { transcript: finalText, audioUri, duration: String(durationSeconds) },
      });
    }
  }, [isContinueBlocked, router, editedText, manualInputText, returnTo, audioUri, durationSeconds, params.pendingTitle, params.pendingTag]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.secondaryForeground} />
          </Pressable>
          <Text style={styles.headerTitle}>Review Prayer</Text>
          <View style={{ width: 40 }} />
        </View>

        <AutoScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.transcriptCard}>
            <Text style={styles.transcriptionLabel}>Transcription</Text>

            {transcribeMutation.isPending ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Transcribing your prayer...</Text>
              </View>

            ) : editedText.trim().length > 0 ? (
              <>
                <Text style={styles.transcriptText}>"{editedText}"</Text>
                <Pressable style={styles.editTextBtn} onPress={openEditModal}>
                  <Pencil size={15} color={colors.primary} />
                  <Text style={styles.editTextBtnText}>Edit Text</Text>
                </Pressable>
              </>

            ) : (
              /* Transcription returned nothing — show manual fallback input */
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  Transcription unavailable — type it below or continue with audio only.
                </Text>
                <TextInput
                  style={[
                    styles.manualInput,
                    hasUnsavedEdits && { borderColor: colors.primary },
                  ]}
                  placeholder="Type your transcription here (optional)…"
                  placeholderTextColor={colors.mutedForeground + "70"}
                  multiline
                  value={manualInputText}
                  onChangeText={(text) => {
                    setManualInputText(text);
                    // Mark as unsaved as soon as the user changes the text.
                    if (text.trim() !== editedText.trim()) {
                      setHasUnsavedEdits(text.trim().length > 0);
                    } else {
                      setHasUnsavedEdits(false);
                    }
                  }}
                  maxLength={1000}
                  textAlignVertical="top"
                />

                {manualInputText.trim().length > 0 && (
                  <Pressable
                    style={[styles.manualSaveBtn, isSaving && styles.btnDisabled]}
                    onPress={handleManualSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <ActivityIndicator size="small" color={colors.primaryForeground} />
                        <Text style={styles.manualSaveBtnText}>Saving…</Text>
                      </>
                    ) : (
                      <>
                        <Check size={15} color={colors.primaryForeground} />
                        <Text style={styles.manualSaveBtnText}>Save transcription</Text>
                      </>
                    )}
                  </Pressable>
                )}
              </View>
            )}

            <View style={styles.transcriptMeta}>
              <Mic size={16} color={colors.mutedForeground} />
              <Text style={styles.transcriptMetaText}>
                {`${Math.floor(durationSeconds / 60).toString().padStart(2, "0")}:${(durationSeconds % 60).toString().padStart(2, "0")} recorded`}
              </Text>
            </View>
          </View>
        </AutoScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
          {/* Unsaved-changes hint — only shown when Continue is blocked by edits */}
          {hasUnsavedEdits && (
            <View style={styles.unsavedHint}>
              <AlertCircle size={14} color={colors.primary} />
              <Text style={styles.unsavedHintText}>
                Please save your transcription before continuing.
              </Text>
            </View>
          )}

          <Pressable
            style={[
              styles.primaryBtn,
              isContinueBlocked && styles.primaryBtnDisabled,
            ]}
            onPress={handleContinue}
            disabled={isContinueBlocked}
          >
            <Text style={styles.primaryBtnText}>Continue</Text>
            <ArrowRight size={20} color={colors.primaryForeground} />
          </Pressable>

          <Pressable
            style={[styles.secondaryBtn, isSaving && styles.btnDisabled]}
            onPress={() => router.back()}
            disabled={isSaving}
          >
            <RotateCcw size={20} color={colors.secondaryForeground} />
            <Text style={styles.secondaryBtnText}>Re-record</Text>
          </Pressable>
        </View>

        {/* Edit transcription modal — isolated from parent scroll/keyboard so
            autoFocus doesn't interfere with the underlying AutoScrollView. */}
        <Modal
          visible={isEditModalVisible}
          transparent={false}
          animationType="slide"
          onRequestClose={closeModalWithoutSaving}
          statusBarTranslucent
        >
          <SafeAreaView style={styles.modalSafeArea} edges={["top", "bottom"]}>
            <KeyboardAvoidingView
              style={styles.modalKeyboard}
              behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
              <View style={styles.modalFullHeader}>
                <Pressable style={styles.modalCloseBtn} onPress={closeModalWithoutSaving}>
                  <X size={18} color={colors.mutedForeground} />
                </Pressable>
                <Text style={styles.modalTitle}>Edit Transcription</Text>
                <Pressable style={styles.modalSaveTopBtn} onPress={handleModalSave}>
                  <Text style={styles.modalSaveTopText}>Save</Text>
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <TextInput
                  ref={inputRef}
                  style={styles.modalInput}
                  value={draftText}
                  onChangeText={setDraftText}
                  multiline
                  autoFocus
                  textAlignVertical="top"
                  placeholder="Your transcription..."
                  placeholderTextColor={colors.mutedForeground + "60"}
                  scrollEnabled
                />
                <Pressable style={styles.saveBtn} onPress={handleModalSave}>
                  <Check size={18} color={colors.primaryForeground} />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
      {DiscardModal}
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingVertical: 14,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.secondary,
      alignItems: "center", justifyContent: "center",
    },
    headerTitle: { fontSize: 18, fontWeight: "700" as const, color: colors.foreground },
    scrollArea: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 20 },
    transcriptionLabel: {
      fontSize: 11, fontWeight: "700" as const, color: colors.primary,
      letterSpacing: 2, textTransform: "uppercase" as const, marginBottom: 4,
    },
    transcriptCard: {
      backgroundColor: colors.card, borderRadius: 32, padding: 28,
      borderWidth: 1, borderColor: colors.border + "60",
    },
    loadingRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, paddingVertical: 20 },
    loadingText: { fontSize: 15, fontWeight: "600" as const, color: colors.primary },
    emptyState: { gap: 12, paddingVertical: 8 },
    emptyText: { fontSize: 14, lineHeight: 22, color: colors.mutedForeground, fontStyle: "italic" as const },
    manualInput: {
      backgroundColor: colors.background, borderRadius: 16, padding: 14,
      fontSize: 15, lineHeight: 24, color: colors.foreground,
      borderWidth: 1.5, borderColor: colors.primary + "40",
      minHeight: 100, textAlignVertical: "top" as const,
    },
    transcriptText: {
      fontSize: 17, lineHeight: 28, color: colors.secondaryForeground,
      fontStyle: "italic" as const, fontWeight: "500" as const, marginTop: 6,
    },
    transcriptMeta: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, marginTop: 20 },
    transcriptMetaText: { fontSize: 12, color: colors.mutedForeground },
    editTextBtn: {
      flexDirection: "row" as const, alignItems: "center" as const, gap: 6,
      marginTop: 16, alignSelf: "flex-start" as const,
      backgroundColor: colors.primary + "15", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    },
    editTextBtnText: { fontSize: 12, fontWeight: "700" as const, color: colors.primary, letterSpacing: 0.5 },

    // Footer
    footer: {
      paddingHorizontal: 24, paddingBottom: 32, paddingTop: 12,
      backgroundColor: colors.background,
      borderTopWidth: 1, borderTopColor: colors.border + "20",
      gap: 12,
    },
    unsavedHint: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      backgroundColor: colors.primary + "12",
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.primary + "30",
    },
    unsavedHintText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "500" as const,
      color: colors.primary,
      lineHeight: 18,
    },
    primaryBtn: {
      flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const,
      gap: 10, backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 999,
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
    },
    primaryBtnDisabled: { opacity: 0.45, shadowOpacity: 0 },
    primaryBtnText: { fontSize: 16, fontWeight: "700" as const, color: colors.primaryForeground },
    secondaryBtn: {
      flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const,
      gap: 10, backgroundColor: colors.secondary, paddingVertical: 18, borderRadius: 999,
    },
    secondaryBtnText: { fontSize: 16, fontWeight: "700" as const, color: colors.secondaryForeground },
    btnDisabled: { opacity: 0.45 },

    // Save button (manual input)
    manualSaveBtn: {
      flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const,
      gap: 8, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 999, marginTop: 4,
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
    },
    manualSaveBtnText: { fontSize: 14, fontWeight: "700" as const, color: colors.primaryForeground },

    // Edit modal
    modalSafeArea: { flex: 1, backgroundColor: colors.background },
    modalKeyboard: { flex: 1 },
    modalFullHeader: {
      flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const,
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: colors.border + "30",
    },
    modalTitle: { fontSize: 17, fontWeight: "700" as const, color: colors.foreground },
    modalCloseBtn: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: colors.secondary, alignItems: "center" as const, justifyContent: "center" as const,
    },
    modalSaveTopBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.primary + "15" },
    modalSaveTopText: { fontSize: 14, fontWeight: "700" as const, color: colors.primary },
    modalBody: { flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, gap: 16 },
    modalInput: {
      flex: 1, backgroundColor: colors.card, borderRadius: 20, padding: 18,
      fontSize: 16, lineHeight: 26, color: colors.foreground, fontWeight: "500" as const,
      borderWidth: 1.5, borderColor: colors.primary + "40", textAlignVertical: "top" as const,
    },
    saveBtn: {
      flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const,
      gap: 8, backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 999,
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
    },
    saveBtnText: { fontSize: 15, fontWeight: "700" as const, color: colors.primaryForeground },
  });
}
