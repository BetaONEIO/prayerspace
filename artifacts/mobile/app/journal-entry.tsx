import React, { useState, useCallback, useRef, useEffect, useMemo} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Modal,
  Alert,
  ActivityIndicator,
  NativeSyntheticEvent,
  TextInputSelectionChangeEventData,
  TextStyle,
} from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router";
import {
  ChevronLeft,
  Heart,
  HandHeart,
  BookOpen,
  Mic,
  Type,
  Square,
  CheckCircle,
  Edit3,
  X,
  Bold,
  Italic,
  List,
  Heading2,
  Pencil,
  ArrowLeft,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { useMutation } from "@tanstack/react-query";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";
import { usePrayer } from "@/providers/PrayerProvider";
import FormattedText from "@/components/FormattedText";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { useAudioRecording } from "@/hooks/useAudioRecording";
import { transcribeAudio } from "@/lib/transcribe";

type Mode = "text" | "voice";
type Tag = "gratitude" | "petition" | "reflection";



const TAGS: { id: Tag; label: string; Icon: typeof Heart }[] = [
  { id: "gratitude", label: "Gratitude", Icon: Heart },
  { id: "petition", label: "Petition", Icon: HandHeart },
  { id: "reflection", label: "Reflection", Icon: BookOpen },
];

export default function JournalEntryScreen() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const themeColors = useThemeColors();
  const colors = themeColors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { addJournalEntry, updateJournalEntry, journal } = usePrayer();

  const isEditing = !!editId;
  const existingEntry = useMemo(
    () => (editId ? journal.find((e) => e.id === editId) : undefined),
    [editId, journal]
  );

  const [mode, setMode] = useState<Mode>("text");
  const [title, setTitle] = useState(existingEntry?.title ?? "");
  const [body, setBody] = useState(existingEntry?.body ?? "");
  const [activeTag, setActiveTag] = useState<Tag>(
    existingEntry?.tag && existingEntry.tag !== "praying_for"
      ? (existingEntry.tag as Tag)
      : "reflection"
  );

  useEffect(() => {
    if (!existingEntry) return;
    setTitle(existingEntry.title);
    setBody(existingEntry.body);
    if (existingEntry.tag !== "praying_for") {
      setActiveTag(existingEntry.tag as Tag);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingEntry?.id]);

  const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [isBodyFocused, setIsBodyFocused] = useState(false);
  const bodyInputRef = useRef<TextInput>(null);

  const { isRecording, duration, startRecording, stopRecording, error: recordingError } = useAudioRecording();
  const [hasRecorded, setHasRecorded] = useState(false);

  const transcribeMutation = useMutation({
    mutationFn: async (audioUri: string) => transcribeAudio(audioUri),
    onSuccess: (text) => {
      setTranscriptText(text);
    },
    onError: (err) => {
      Alert.alert("Transcription Error", (err as Error).message || "Could not transcribe audio. Please try again.");
      setShowTranscriptModal(false);
    },
  });

  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [transcriptText, setTranscriptText] = useState("");
  const [editingTranscript, setEditingTranscript] = useState(false);
  const [pendingSeconds, setPendingSeconds] = useState(0);

  const hasUnsavedWork = title.trim().length > 0 || body.trim().length > 0 || hasRecorded || isRecording;
  const { DiscardModal } = useUnsavedChangesWarning(hasUnsavedWork);

  const [showSavedToast, setShowSavedToast] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastScale = useRef(new Animated.Value(0.85)).current;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const modeSlide = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isRecording) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(rippleAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(rippleAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseLoop.current?.stop();
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [isRecording, pulseAnim, rippleAnim]);

  const triggerSavedToast = useCallback((goBack = false) => {
    setShowSavedToast(true);
    Animated.parallel([
      Animated.spring(toastScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }),
      Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastScale, { toValue: 0.85, duration: 200, useNativeDriver: true }),
        Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setShowSavedToast(false);
        if (goBack) {
          router.back();
        } else {
          router.push("/journal");
        }
      });
    }, 2000);
  }, [toastOpacity, toastScale, router]);

  const switchMode = useCallback((next: Mode) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setMode(next);
    Animated.spring(modeSlide, {
      toValue: next === "text" ? 0 : 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 6,
    }).start();
  }, [modeSlide]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleStartRecording = useCallback(async () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setHasRecorded(false);
    setTranscriptText("");
    await startRecording();
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const uri = await stopRecording();
    setPendingSeconds(duration);
    setEditingTranscript(false);
    setShowTranscriptModal(true);
    console.log("[JournalEntry] Voice recording stopped at", duration, "seconds, URI:", uri);
    if (uri) {
      transcribeMutation.mutate(uri);
    }
  }, [duration, stopRecording, transcribeMutation]);

  const handleConfirmTranscript = useCallback(() => {
    setShowTranscriptModal(false);
    setHasRecorded(true);
    setBody(transcriptText);
    console.log("[JournalEntry] Transcript confirmed");
  }, [transcriptText]);

  const handleSave = useCallback(() => {
    if (isEditing && editId) {
      if (!body.trim()) {
        Alert.alert("Empty Entry", "Please write something before saving.");
        return;
      }
      const entryTitle = title.trim() || "Prayer Entry";
      console.log("[JournalEntry] Updating entry:", { editId, title: entryTitle, tag: activeTag });
      updateJournalEntry(editId, { title: entryTitle, body: body.trim(), tag: activeTag });
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      triggerSavedToast(true);
      return;
    }

    if (mode === "text") {
      if (!body.trim()) {
        Alert.alert("Empty Entry", "Please write something before saving.");
        return;
      }
      const entryTitle = title.trim() || "Prayer Entry";
      console.log("[JournalEntry] Saving text entry:", { title: entryTitle, tag: activeTag });
      addJournalEntry({ title: entryTitle, body: body.trim(), tag: activeTag });
    } else {
      if (!hasRecorded) {
        Alert.alert("No Recording", "Please record your prayer before saving.");
        return;
      }
      const entryTitle = title.trim() || "Voice Prayer";
      const voiceBody = transcriptText.trim()
        ? transcriptText.trim()
        : `Voice prayer recorded — ${formatTime(pendingSeconds)} duration.${body.trim() ? "\n\n" + body.trim() : ""}`;
      console.log("[JournalEntry] Saving voice entry:", { title: entryTitle, duration: pendingSeconds });
      addJournalEntry({ title: entryTitle, body: voiceBody, tag: activeTag });
    }

    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    triggerSavedToast(false);
  }, [isEditing, editId, mode, title, body, activeTag, hasRecorded, pendingSeconds, transcriptText, addJournalEntry, updateJournalEntry, triggerSavedToast]);

  const handleSelectionChange = useCallback(
    (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
      setSelection(e.nativeEvent.selection);
    },
    []
  );

  const insertFormatting = useCallback(
    (type: "bold" | "italic" | "bullet" | "heading") => {
      const start = selection.start;
      const end = selection.end;
      const selected = body.slice(start, end);
      let before = body.slice(0, start);
      let after = body.slice(end);
      let insert = "";
      let cursorOffset = 0;

      if (type === "bold") {
        if (selected.length > 0) {
          insert = `**${selected}**`;
          cursorOffset = insert.length;
        } else {
          insert = "****";
          cursorOffset = 2;
        }
      } else if (type === "italic") {
        if (selected.length > 0) {
          insert = `_${selected}_`;
          cursorOffset = insert.length;
        } else {
          insert = "__";
          cursorOffset = 1;
        }
      } else if (type === "bullet") {
        const lineStart = before.lastIndexOf("\n") + 1;
        const linePrefix = before.slice(lineStart);
        if (linePrefix.startsWith("• ")) {
          insert = selected.length > 0 ? selected : "";
          before = before.slice(0, lineStart) + linePrefix.slice(2);
          cursorOffset = insert.length;
        } else {
          if (start === 0 || before.endsWith("\n")) {
            insert = `• ${selected}`;
          } else {
            insert = `\n• ${selected}`;
          }
          cursorOffset = insert.length;
        }
      } else if (type === "heading") {
        const lineStart = before.lastIndexOf("\n") + 1;
        const linePrefix = before.slice(lineStart);
        if (linePrefix.startsWith("## ")) {
          insert = selected.length > 0 ? selected : "";
          before = before.slice(0, lineStart) + linePrefix.slice(3);
          cursorOffset = insert.length;
        } else {
          if (start === 0 || before.endsWith("\n")) {
            insert = `## ${selected}`;
          } else {
            insert = `\n## ${selected}`;
          }
          cursorOffset = insert.length;
        }
      }

      const newText = before + insert + after;
      setBody(newText);
      const newCursor = before.length + cursorOffset;
      setTimeout(() => {
        setSelection({ start: newCursor, end: newCursor });
      }, 10);
      console.log("[JournalEntry] Formatting applied:", type);
      if (!isBodyFocused) {
        setIsBodyFocused(true);
        bodyInputRef.current?.focus();
      }
    },
    [body, selection, isBodyFocused]
  );

  const canSave =
    mode === "text" ? body.trim().length > 0 : hasRecorded;

  const rippleScale = rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
  const rippleOpacity = rippleAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.1, 0] });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.bgAccent} pointerEvents="none" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.secondaryForeground} />
          </Pressable>
        </View>
        <View style={styles.toggleSection}>
          <View style={styles.togglePill}>
            <Pressable
              style={[styles.toggleTab, mode === "text" && styles.toggleTabActive]}
              onPress={() => switchMode("text")}
            >
              <Pencil size={14} color={mode === "text" ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.toggleTabLabel, mode === "text" && styles.toggleTabLabelActive]}>Text</Text>
            </Pressable>
            <Pressable
              style={[styles.toggleTab, mode === "voice" && styles.toggleTabActive]}
              onPress={() => switchMode("voice")}
            >
              <Mic size={14} color={mode === "voice" ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.toggleTabLabel, mode === "voice" && styles.toggleTabLabelActive]}>Voice</Text>
            </Pressable>
          </View>
          <Text style={styles.toggleSubtext}>
            Share a prayer request, a praise report, or simply give thanks — whatever's on your heart, you can share it here.
          </Text>
        </View>

          {mode === "text" ? (
          <AutoScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.titleCard}>
              <Text style={styles.titleLabel}>Prayer Title</Text>
              <TextInput
                style={styles.titleInput}
                placeholder="Enter a title..."
                placeholderTextColor={colors.mutedForeground + "50"}
                value={title}
                onChangeText={setTitle}
                returnKeyType="next"
              />
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagRow}
            >
              {TAGS.map(({ id, label, Icon }) => {
                const isActive = activeTag === id;
                return (
                  <Pressable
                    key={id}
                    style={[styles.tagChip, isActive && styles.tagChipActive]}
                    onPress={() => setActiveTag(id)}
                  >
                    <Icon size={13} color={isActive ? colors.accentForeground : colors.mutedForeground} />
                    <Text style={[styles.tagText, isActive && styles.tagTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.formattingToolbar}>
              <Pressable
                style={styles.fmtBtn}
                onPress={() => insertFormatting("bold")}
              >
                <Bold size={15} color={colors.secondaryForeground} />
              </Pressable>
              <Pressable
                style={styles.fmtBtn}
                onPress={() => insertFormatting("italic")}
              >
                <Italic size={15} color={colors.secondaryForeground} />
              </Pressable>
              <View style={styles.fmtDivider} />
              <Pressable
                style={styles.fmtBtn}
                onPress={() => insertFormatting("bullet")}
              >
                <List size={15} color={colors.secondaryForeground} />
              </Pressable>
              <Pressable
                style={styles.fmtBtn}
                onPress={() => insertFormatting("heading")}
              >
                <Heading2 size={15} color={colors.secondaryForeground} />
              </Pressable>
              <View style={{ flex: 1 }} />
              {!isBodyFocused && body.length > 0 && (
                <Pressable
                  style={styles.fmtEditBtn}
                  onPress={() => {
                    setIsBodyFocused(true);
                    setTimeout(() => bodyInputRef.current?.focus(), 50);
                  }}
                >
                  <Pencil size={12} color={colors.accentForeground} />
                  <Text style={styles.fmtEditBtnText}>Edit</Text>
                </Pressable>
              )}
            </View>

            <Pressable
              style={styles.bodyCard}
              onPress={() => {
                setIsBodyFocused(true);
                setTimeout(() => bodyInputRef.current?.focus(), 50);
              }}
              activeOpacity={1}
            >
              <View style={styles.quoteBar} />
              <View style={{ flex: 1 }}>
                <TextInput
                  ref={bodyInputRef}
                  style={[styles.bodyInput, body.length > 0 && { color: "transparent" }]}
                  placeholder="Pour your heart out here..."
                  placeholderTextColor={colors.mutedForeground + "35"}
                  multiline
                  value={body}
                  onChangeText={setBody}
                  selection={selection}
                  onSelectionChange={handleSelectionChange}
                  onFocus={() => setIsBodyFocused(true)}
                  onBlur={() => setIsBodyFocused(false)}
                  textAlignVertical="top"
                />
                {body.length > 0 && (
                  <View style={styles.formattedOverlay} pointerEvents="none">
                    <FormattedText text={body} baseStyle={styles.bodyInput} />
                  </View>
                )}
              </View>
            </Pressable>

            <View style={styles.autoSaveRow}>
              <View style={styles.autoSaveDot} />
              <Text style={styles.autoSaveText}>AUTO-SAVING</Text>
            </View>
          </AutoScrollView>
        ) : (
          <AutoScrollView
            contentContainerStyle={styles.voiceScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.titleCard}>
              <Text style={styles.titleLabel}>Prayer Title</Text>
              <TextInput
                style={styles.titleInput}
                placeholder="Enter a title..."
                placeholderTextColor={colors.mutedForeground + "50"}
                value={title}
                onChangeText={setTitle}
                returnKeyType="done"
              />
            </View>

            <View style={styles.voiceCenter}>
              <View style={styles.timerWrap}>
                <Text style={styles.timerText}>{formatTime(isRecording ? duration : pendingSeconds)}</Text>
                <Text style={styles.timerLabel}>
                  {isRecording ? "RECORDING" : hasRecorded ? "COMPLETED" : "READY"}
                </Text>
              </View>

              <View style={styles.micOuter}>
                {isRecording && (
                  <Animated.View
                    style={[
                      styles.ripple,
                      { transform: [{ scale: rippleScale }], opacity: rippleOpacity },
                    ]}
                  />
                )}
                <Animated.View
                  style={[styles.micBtn, { transform: [{ scale: pulseAnim }] }]}
                >
                  {!isRecording && !hasRecorded ? (
                    <Pressable style={styles.micBtnInner} onPress={handleStartRecording}>
                      <Mic size={40} color={colors.primaryForeground} />
                    </Pressable>
                  ) : isRecording ? (
                    <View style={styles.micBtnInner}>
                      <Mic size={40} color={colors.primaryForeground} />
                    </View>
                  ) : (
                    <Pressable style={[styles.micBtnInner, styles.micBtnDone]} onPress={handleStartRecording}>
                      <Mic size={40} color={colors.primary} />
                    </Pressable>
                  )}
                </Animated.View>
              </View>

              {!isRecording && !hasRecorded && (
                <Text style={styles.tapToRecord}>Tap to start recording</Text>
              )}

              {isRecording && (
                <View style={styles.recordingControls}>
                  <Pressable style={styles.stopBtn} onPress={handleStopRecording}>
                    <Square size={22} color={colors.primaryForeground} fill={colors.primaryForeground} />
                    <Text style={styles.stopBtnText}>Stop & Transcribe</Text>
                  </Pressable>
                </View>
              )}

              {hasRecorded && (
                <View style={styles.recordedBanner}>
                  <View style={styles.recordedDot} />
                  <Text style={styles.recordedText}>
                    Recording complete · {formatTime(pendingSeconds)}
                  </Text>
                  <Pressable onPress={handleStartRecording}>
                    <Text style={styles.reRecordText}>Re-record</Text>
                  </Pressable>
                </View>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagRow}
            >
              {TAGS.map(({ id, label, Icon }) => {
                const isActive = activeTag === id;
                return (
                  <Pressable
                    key={id}
                    style={[styles.tagChip, isActive && styles.tagChipActive]}
                    onPress={() => setActiveTag(id)}
                  >
                    <Icon size={13} color={isActive ? colors.accentForeground : colors.mutedForeground} />
                    <Text style={[styles.tagText, isActive && styles.tagTextActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {hasRecorded && (
              <View style={styles.bodyCard}>
                <View style={styles.quoteBar} />
                <TextInput
                  style={[styles.bodyInput, { minHeight: 80 }]}
                  placeholder="Add a note to your prayer (optional)..."
                  placeholderTextColor={colors.mutedForeground + "35"}
                  multiline
                  value={body}
                  onChangeText={setBody}
                  textAlignVertical="top"
                />
              </View>
            )}
          </AutoScrollView>
        )}

        <Pressable
          style={[styles.journalBtn, !canSave && styles.journalBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <BookOpen size={18} color={colors.primaryForeground} />
          <Text style={styles.journalBtnText}>{isEditing ? "Save Changes" : "Save to Prayer Journal"}</Text>
        </Pressable>
      </KeyboardAvoidingView>

      {/* Transcript Review Modal */}
      <Modal
        visible={showTranscriptModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTranscriptModal(false)}
      >
        <BlurView intensity={18} tint="dark" style={styles.modalOverlay}>
          <View style={styles.transcriptSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.transcriptHeader}>
              <View style={styles.transcriptIconWrap}>
                {transcribeMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                  <Mic size={22} color={colors.primaryForeground} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.transcriptTitle}>
                  {transcribeMutation.isPending ? "Transcribing…" : "Voice Prayer Transcribed"}
                </Text>
                <Text style={styles.transcriptSubtitle}>{formatTime(pendingSeconds)} · Review before saving</Text>
              </View>
              <Pressable style={styles.transcriptCloseBtn} onPress={() => setShowTranscriptModal(false)}>
                <X size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <View style={styles.transcriptDivider} />

            {transcribeMutation.isPending ? (
              <View style={styles.transcriptLoadingWrap}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.transcriptLoadingText}>Converting your prayer to text…</Text>
              </View>
            ) : (
              <ScrollView style={styles.transcriptScrollArea} showsVerticalScrollIndicator={false}>
                <View style={styles.transcriptBodyCard}>
                  <View style={styles.quoteBar} />
                  {editingTranscript ? (
                    <TextInput
                      style={[styles.bodyInput, { minHeight: 140, fontSize: 15 }]}
                      multiline
                      value={transcriptText}
                      onChangeText={setTranscriptText}
                      textAlignVertical="top"
                      autoFocus
                    />
                  ) : (
                    <Text style={styles.transcriptBody}>{transcriptText}</Text>
                  )}
                </View>
              </ScrollView>
            )}

            <View style={styles.transcriptActions}>
              <Pressable
                style={[styles.transcriptEditBtn, transcribeMutation.isPending && { opacity: 0.4 }]}
                onPress={() => setEditingTranscript((v) => !v)}
                disabled={transcribeMutation.isPending}
              >
                <Edit3 size={18} color={colors.accentForeground} />
                <Text style={styles.transcriptEditBtnText}>
                  {editingTranscript ? "Done Editing" : "Edit"}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.transcriptConfirmBtn, transcribeMutation.isPending && { opacity: 0.4 }]}
                onPress={handleConfirmTranscript}
                disabled={transcribeMutation.isPending}
              >
                <CheckCircle size={18} color={colors.primaryForeground} />
                <Text style={styles.transcriptConfirmBtnText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* Saved Toast */}
      {showSavedToast && (
        <Animated.View
          style={[
            styles.savedToast,
            { opacity: toastOpacity, transform: [{ scale: toastScale }] },
          ]}
          pointerEvents="none"
        >
          <View style={styles.savedToastIconWrap}>
            <CheckCircle size={26} color={colors.primaryForeground} />
          </View>
          <View>
            <Text style={styles.savedToastTitle}>Journal Entry Saved</Text>
            <Text style={styles.savedToastSub}>Taking you to your journal...</Text>
          </View>
        </Animated.View>
      )}
      {DiscardModal}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  bgAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 260,
    backgroundColor: colors.accent,
    opacity: 0.45,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card + "CC",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.foreground,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: colors.primaryForeground,
    letterSpacing: 0.5,
  },
  toggleSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  togglePill: {
    flexDirection: "row" as const,
    backgroundColor: colors.secondary,
    borderRadius: 16,
    padding: 4,
    marginBottom: 14,
  },
  toggleTab: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  toggleTabActive: {
    backgroundColor: colors.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleTabLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.mutedForeground,
  },
  toggleTabLabelActive: {
    color: colors.primary,
    fontWeight: "700" as const,
  },
  toggleSubtext: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.foreground,
    textAlign: "center" as const,
    opacity: 0.75,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  voiceScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  titleCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  titleLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: colors.primary,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
    marginBottom: 6,
  },
  titleInput: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: colors.foreground,
    paddingVertical: 0,
  },
  tagRow: {
    gap: 8,
    paddingBottom: 16,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.primary + "25",
  },
  tagText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.mutedForeground,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  tagTextActive: { color: colors.accentForeground },
  bodyCard: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 24,
    marginBottom: 16,
    flexDirection: "row" as const,
    gap: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border + "40",
  },
  quoteBar: {
    width: 3,
    borderRadius: 99,
    backgroundColor: colors.primary,
    opacity: 0.35,
    alignSelf: "stretch",
  },
  bodyInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 26,
    color: colors.foreground,
    padding: 0,
    minHeight: 200,
  },
  formattedOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    minHeight: 200,
  },
  formattingToolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  fmtBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.secondary,
  },
  fmtDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  fmtHint: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: colors.mutedForeground + "80",
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
  },
  fmtEditBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.primary + "20",
  },
  fmtEditBtnText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.accentForeground,
    letterSpacing: 0.3,
  },
  autoSaveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "flex-end",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  autoSaveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D4782F",
  },
  autoSaveText: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: colors.mutedForeground,
    letterSpacing: 1.5,
  },
  voiceCenter: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 20,
  },
  timerWrap: {
    alignItems: "center",
    gap: 4,
  },
  timerText: {
    fontSize: 48,
    fontWeight: "200" as const,
    color: colors.foreground,
    letterSpacing: -1,
    fontVariant: ["tabular-nums"] as const,
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: colors.primary,
    letterSpacing: 3,
  },
  micOuter: {
    width: 130,
    height: 130,
    alignItems: "center",
    justifyContent: "center",
  },
  ripple: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.primary,
  },
  micBtn: {
    width: 110,
    height: 110,
    borderRadius: 55,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 10,
  },
  micBtnInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  micBtnDone: {
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.primary + "40",
    shadowColor: "transparent",
    elevation: 0,
  },
  tapToRecord: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.mutedForeground,
    letterSpacing: 0.2,
  },
  recordingControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  ctrlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.foreground,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  stopBtnText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.primaryForeground,
  },
  recordedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#D4782F12",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#D4782F30",
  },
  recordedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D4782F",
  },
  recordedText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#D4782F",
    flex: 1,
  },
  reRecordText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  journalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: Platform.OS === "ios" ? 16 : 24,
    marginTop: 4,
    backgroundColor: colors.secondary,
    borderRadius: 999,
    paddingVertical: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  journalBtnDisabled: { opacity: 0.4 },
  journalBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.foreground,
    letterSpacing: 0.2,
  },

  // Transcript Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(58,47,41,0.35)",
    justifyContent: "flex-end",
  },
  transcriptSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
    maxHeight: "92%",
    minHeight: "65%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 20,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 99,
    backgroundColor: colors.muted,
    alignSelf: "center",
    marginBottom: 20,
  },
  transcriptHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  transcriptIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  transcriptTitle: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: colors.foreground,
  },
  transcriptSubtitle: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.mutedForeground,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  transcriptCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  transcriptDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 18,
    opacity: 0.6,
  },
  transcriptLoadingWrap: {
    flex: 1,
    minHeight: 200,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 16,
    marginBottom: 20,
  },
  transcriptLoadingText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: colors.mutedForeground,
    textAlign: "center" as const,
  },
  transcriptScrollArea: {
    flex: 1,
    minHeight: 200,
    marginBottom: 20,
  },
  transcriptBodyCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    flexDirection: "row",
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border + "60",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  transcriptBody: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    color: colors.secondaryForeground,
    fontStyle: "italic" as const,
  },
  transcriptActions: {
    flexDirection: "row",
    gap: 12,
  },
  transcriptEditBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.primary + "20",
  },
  transcriptEditBtnText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.accentForeground,
  },
  transcriptConfirmBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
  transcriptConfirmBtnText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.primaryForeground,
  },

  // Saved Toast
  savedToast: {
    position: "absolute",
    bottom: 110,
    left: 24,
    right: 24,
    backgroundColor: colors.foreground,
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    shadowColor: colors.foreground,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  savedToastIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  savedToastTitle: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: colors.primaryForeground,
  },
  savedToastSub: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: colors.primaryForeground,
    opacity: 0.6,
    marginTop: 2,
  },
});
