import React, { useState, useCallback, useRef, useEffect, useMemo} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Animated,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Stack } from "expo-router";
import {
  Mic,
  MicOff,
  Sparkles,
  Save,
  X,
  Clock,
  ChevronDown,
  BookOpen,
  Eraser,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useMutation } from "@tanstack/react-query";
import { generateText } from "@rork-ai/toolkit-sdk";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { usePrayer } from "@/providers/PrayerProvider";
import { transcribeAudio } from "@/lib/transcribe";
import ImageAttachment from "@/components/ImageAttachment";
import ImageViewer from "@/components/ImageViewer";

type JournalTag = "gratitude" | "petition" | "reflection" | "praying_for";

const TAG_OPTIONS: { value: JournalTag; label: string; emoji: string }[] = [
  { value: "reflection", label: "Reflection", emoji: "🪞" },
  { value: "gratitude", label: "Gratitude", emoji: "🙏" },
  { value: "petition", label: "Petition", emoji: "📖" },
  { value: "praying_for", label: "Praying For", emoji: "💛" },
];

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function RecordPrayerScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { addJournalEntry } = usePrayer();
  const { isRecording, duration, startRecording, stopRecording, error: recordingError } = useAudioRecording();

  const [rawTranscription, setRawTranscription] = useState("");
  const [editedText, setEditedText] = useState("");
  const [selectedTag, setSelectedTag] = useState<JournalTag>("reflection");
  const [title, setTitle] = useState("");
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim1 = useRef(new Animated.Value(0.3)).current;
  const waveAnim2 = useRef(new Animated.Value(0.3)).current;
  const waveAnim3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!isRecording) {
      pulseAnim.setValue(1);
      waveAnim1.setValue(0.3);
      waveAnim2.setValue(0.3);
      waveAnim3.setValue(0.3);
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );

    const wave1 = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim1, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(waveAnim1, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ])
    );
    const wave2 = Animated.loop(
      Animated.sequence([
        Animated.delay(150),
        Animated.timing(waveAnim2, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(waveAnim2, { toValue: 0.3, duration: 500, useNativeDriver: true }),
      ])
    );
    const wave3 = Animated.loop(
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(waveAnim3, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(waveAnim3, { toValue: 0.3, duration: 350, useNativeDriver: true }),
      ])
    );

    pulse.start();
    wave1.start();
    wave2.start();
    wave3.start();

    return () => {
      pulse.stop();
      wave1.stop();
      wave2.stop();
      wave3.stop();
    };
  }, [isRecording, pulseAnim, waveAnim1, waveAnim2, waveAnim3]);

  const transcribeMutation = useMutation({
    mutationFn: async (audioUri: string) => {
      console.log("[RecordPrayer] Starting transcription...");
      return await transcribeAudio(audioUri);
    },
    onSuccess: (text) => {
      setRawTranscription(text);
      setEditedText(text);
    },
    onError: (err) => {
      console.error("[RecordPrayer] Transcription error:", err);
      Alert.alert("Transcription Error", (err as Error).message || "Could not transcribe audio.");
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: async (text: string) => {
      console.log("[RecordPrayer] Cleaning up transcription with AI...");
      const result = await generateText({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are a prayer journal assistant. Clean up and lightly format the following prayer transcription. Fix grammar, punctuation, and remove filler words, but preserve the speaker's voice, intent, and meaning. Do not add new content. Do not add headers or titles. Return ONLY the cleaned text.\n\nTranscription:\n${text}`,
              },
            ],
          },
        ],
      });
      console.log("[RecordPrayer] Cleanup result:", result.slice(0, 100), "...");
      return result;
    },
    onSuccess: (cleanedText) => {
      setEditedText(cleanedText);
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: (err) => {
      console.error("[RecordPrayer] AI cleanup error:", err);
      Alert.alert("AI Error", "Could not clean up text. You can still edit manually.");
    },
  });

  const handleToggleRecording = useCallback(async () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (isRecording) {
      const uri = await stopRecording();
      if (uri) {
        transcribeMutation.mutate(uri);
      }
    } else {
      setRawTranscription("");
      setEditedText("");
      await startRecording();
    }
  }, [isRecording, startRecording, stopRecording, transcribeMutation]);

  const handleCleanup = useCallback(() => {
    if (!editedText.trim()) return;
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    cleanupMutation.mutate(editedText);
  }, [editedText, cleanupMutation]);

  const handleSave = useCallback(() => {
    if (!editedText.trim()) {
      Alert.alert("Empty Prayer", "Please record or type your prayer before saving.");
      return;
    }

    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const entryTitle = title.trim() || `Prayer - ${new Date().toLocaleDateString()}`;
    addJournalEntry({
      title: entryTitle,
      body: editedText.trim(),
      tag: selectedTag,
      imageUrl: imageUri ?? null,
    });

    console.log("[RecordPrayer] Prayer saved to journal");
    router.back();
  }, [editedText, title, selectedTag, addJournalEntry, router]);

  const handleResetText = useCallback(() => {
    if (rawTranscription) {
      setEditedText(rawTranscription);
    }
  }, [rawTranscription]);

  const isProcessing = transcribeMutation.isPending || cleanupMutation.isPending;
  const hasTranscription = editedText.trim().length > 0;
  const currentTag = TAG_OPTIONS.find((t) => t.value === selectedTag) ?? TAG_OPTIONS[0];

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: "Record Prayer",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerShadowVisible: false,
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.recorderSection}>
            <Text style={styles.sectionLabel}>VOICE RECORDING</Text>
            <Text style={styles.sectionHint}>
              {isRecording
                ? "Speak your prayer aloud..."
                : hasTranscription
                ? "Recording complete"
                : "Tap to begin recording your prayer"}
            </Text>

            <View style={styles.recorderCenter}>
              {isRecording && (
                <View style={styles.waveContainer}>
                  {[waveAnim1, waveAnim2, waveAnim3, waveAnim2, waveAnim1].map((anim, i) => (
                    <Animated.View
                      key={i}
                      style={[
                        styles.waveBar,
                        {
                          transform: [{ scaleY: anim }],
                          backgroundColor: i === 2 ? colors.primary : colors.primary + "80",
                        },
                      ]}
                    />
                  ))}
                </View>
              )}

              <Animated.View style={[styles.micBtnOuter, { transform: [{ scale: pulseAnim }] }]}>
                <Pressable
                  style={[styles.micBtn, isRecording && styles.micBtnActive]}
                  onPress={handleToggleRecording}
                  disabled={isProcessing}
                  testID="record-button"
                >
                  {isRecording ? (
                    <MicOff size={32} color="#FFFFFF" />
                  ) : (
                    <Mic size={32} color={isProcessing ? colors.mutedForeground : colors.primaryForeground} />
                  )}
                </Pressable>
              </Animated.View>

              {isRecording && (
                <View style={styles.durationRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.durationText}>{formatDuration(duration)}</Text>
                </View>
              )}

              {!isRecording && !hasTranscription && !isProcessing && (
                <Text style={styles.tapHint}>Tap the mic to start</Text>
              )}
            </View>

            {transcribeMutation.isPending && (
              <View style={styles.processingCard}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.processingText}>Transcribing your prayer...</Text>
              </View>
            )}

            {recordingError && (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{recordingError}</Text>
              </View>
            )}
          </View>

          {hasTranscription && (
            <>
              <View style={styles.transcriptionSection}>
                <View style={styles.transcriptionHeader}>
                  <Text style={styles.sectionLabel}>TRANSCRIPTION</Text>
                  <View style={styles.transcriptionActions}>
                    {rawTranscription !== editedText && (
                      <Pressable style={styles.actionChip} onPress={handleResetText}>
                        <Eraser size={14} color={colors.mutedForeground} />
                        <Text style={styles.actionChipText}>Reset</Text>
                      </Pressable>
                    )}
                    <Pressable
                      style={[styles.aiChip, cleanupMutation.isPending && styles.aiChipDisabled]}
                      onPress={handleCleanup}
                      disabled={cleanupMutation.isPending}
                    >
                      {cleanupMutation.isPending ? (
                        <ActivityIndicator size={14} color={colors.primary} />
                      ) : (
                        <Sparkles size={14} color={colors.primary} />
                      )}
                      <Text style={styles.aiChipText}>
                        {cleanupMutation.isPending ? "Cleaning..." : "AI Cleanup"}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <TextInput
                  style={styles.transcriptionInput}
                  value={editedText}
                  onChangeText={setEditedText}
                  multiline
                  textAlignVertical="top"
                  placeholder="Your transcribed prayer will appear here..."
                  placeholderTextColor={colors.mutedForeground + "88"}
                  testID="transcription-input"
                />
              </View>

              <View style={styles.detailsSection}>
                <Text style={styles.sectionLabel}>SAVE TO JOURNAL</Text>

                <TextInput
                  style={styles.titleInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Prayer title (optional)"
                  placeholderTextColor={colors.mutedForeground + "88"}
                  testID="title-input"
                />

                <Pressable
                  style={styles.tagSelector}
                  onPress={() => setShowTagPicker(!showTagPicker)}
                >
                  <View style={styles.tagSelectorLeft}>
                    <BookOpen size={16} color={colors.primary} />
                    <Text style={styles.tagSelectorLabel}>Category</Text>
                  </View>
                  <View style={styles.tagSelectorRight}>
                    <Text style={styles.tagSelectorValue}>
                      {currentTag.emoji} {currentTag.label}
                    </Text>
                    <ChevronDown size={16} color={colors.mutedForeground} />
                  </View>
                </Pressable>

                {showTagPicker && (
                  <View style={styles.tagPickerWrap}>
                    {TAG_OPTIONS.map((tag) => {
                      const isSelected = selectedTag === tag.value;
                      return (
                        <Pressable
                          key={tag.value}
                          style={[styles.tagOption, isSelected && styles.tagOptionSelected]}
                          onPress={() => {
                            setSelectedTag(tag.value);
                            setShowTagPicker(false);
                            if (Platform.OS !== "web") {
                              void Haptics.selectionAsync();
                            }
                          }}
                        >
                          <Text style={styles.tagOptionEmoji}>{tag.emoji}</Text>
                          <Text style={[styles.tagOptionLabel, isSelected && styles.tagOptionLabelSelected]}>
                            {tag.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                <View style={styles.imageRow}>
                  <Text style={styles.imageRowLabel}>ATTACH PHOTO</Text>
                  <View style={styles.imageRowContent}>
                    {imageUri ? (
                      <ImageAttachment
                        imageUri={imageUri}
                        onImageSelected={setImageUri}
                        onRemove={() => setImageUri(null)}
                        onPress={() => setViewingImage(imageUri)}
                      />
                    ) : (
                      <ImageAttachment
                        imageUri={null}
                        onImageSelected={setImageUri}
                        onRemove={() => {}}
                        chipMode
                      />
                    )}
                  </View>
                </View>
              </View>

              <Pressable
                style={[styles.saveBtn, !hasTranscription && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!hasTranscription}
                testID="save-button"
              >
                <Save size={20} color={colors.primaryForeground} />
                <Text style={styles.saveBtnText}>Save to Journal</Text>
              </Pressable>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <ImageViewer
        uri={viewingImage}
        visible={!!viewingImage}
        onClose={() => setViewingImage(null)}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  recorderSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: colors.primary,
    letterSpacing: 1.8,
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.foreground,
    marginBottom: 28,
  },
  recorderCenter: {
    alignItems: "center" as const,
    gap: 20,
    paddingVertical: 16,
  },
  waveContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    height: 48,
  },
  waveBar: {
    width: 5,
    height: 48,
    borderRadius: 3,
  },
  micBtnOuter: {
    borderRadius: 999,
  },
  micBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  micBtnActive: {
    backgroundColor: "#C0392B",
    shadowColor: "#C0392B",
  },
  durationRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C0392B",
  },
  durationText: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.foreground,
    fontVariant: ["tabular-nums" as const],
  },
  tapHint: {
    fontSize: 13,
    color: colors.mutedForeground,
    fontWeight: "500" as const,
  },
  processingCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    backgroundColor: colors.primary + "12",
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.primary + "25",
  },
  processingText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  errorCard: {
    backgroundColor: colors.destructive + "12",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.destructive + "25",
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.destructive,
  },
  transcriptionSection: {
    marginBottom: 24,
  },
  transcriptionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 12,
  },
  transcriptionActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  actionChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionChipText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.mutedForeground,
  },
  aiChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.primary + "15",
    borderWidth: 1.5,
    borderColor: colors.primary + "40",
  },
  aiChipDisabled: {
    opacity: 0.6,
  },
  aiChipText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  transcriptionInput: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    fontSize: 15,
    lineHeight: 24,
    color: colors.foreground,
    fontWeight: "500" as const,
    minHeight: 160,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  detailsSection: {
    marginBottom: 28,
  },
  titleInput: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: colors.foreground,
    fontWeight: "600" as const,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  tagSelector: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagSelectorLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  tagSelectorLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.foreground,
  },
  tagSelectorRight: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  tagSelectorValue: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.mutedForeground,
  },
  tagPickerWrap: {
    marginTop: 8,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden" as const,
  },
  tagOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "60",
  },
  tagOptionSelected: {
    backgroundColor: colors.primary + "10",
  },
  tagOptionEmoji: {
    fontSize: 16,
  },
  tagOptionLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.foreground,
  },
  tagOptionLabelSelected: {
    color: colors.primary,
    fontWeight: "700" as const,
  },
  imageRow: {
    marginTop: 12,
    gap: 8,
  },
  imageRowLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: colors.mutedForeground,
    letterSpacing: 1.5,
  },
  imageRowContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  saveBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 18,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  saveBtnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.primaryForeground,
  },
});
