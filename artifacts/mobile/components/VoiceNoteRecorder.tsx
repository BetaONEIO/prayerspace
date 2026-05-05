import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
  Animated,
} from "react-native";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { Mic, Square, Play, Pause, RotateCcw, Trash2, Check } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import ThemedSwitch from "@/components/ThemedSwitch";

type RecorderState = "idle" | "recording" | "preview";

interface Props {
  onAttach: (
    uri: string,
    durationMs: number,
    includeAudio: boolean,
    includeTranscription: boolean,
    transcription?: string
  ) => void;
  onDiscard: () => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function VoiceNoteRecorder({ onAttach, onDiscard }: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const [state, setState] = useState<RecorderState>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackMs, setPlaybackMs] = useState(0);

  const [includeAudio, setIncludeAudio] = useState(true);
  const [transcriptionText, setTranscriptionText] = useState("");

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasFinishedRef = useRef(false);

  // Pulse animation for recording dot
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Guaranteed cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
      Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state === "recording") {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.35, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert("Microphone Access", "Please allow microphone access to record a voice prayer.");
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;
      setDurationMs(0);
      setState("recording");
      timerRef.current = setInterval(() => {
        setDurationMs((prev) => prev + 100);
      }, 100);
    } catch (err) {
      console.error("[VoiceNoteRecorder] start error:", err);
      Alert.alert("Recording Error", "Could not start recording. Please try again.");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      const status = await recordingRef.current.getStatusAsync();
      const dur = (status as { durationMillis?: number }).durationMillis ?? durationMs;
      recordingRef.current = null;
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRecordedUri(uri ?? null);
      setRecordedDuration(dur);
      setPlaybackMs(0);
      setIsPlaying(false);
      setState("preview");
    } catch (err) {
      console.error("[VoiceNoteRecorder] stop error:", err);
    }
  }, [durationMs]);

  const loadSound = useCallback(async (uri: string) => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    hasFinishedRef.current = false;
    const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) return;
      setPlaybackMs(status.positionMillis);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPlaybackMs(0);
        hasFinishedRef.current = true;
      }
    });
    soundRef.current = sound;
  }, []);

  useEffect(() => {
    if (state === "preview" && recordedUri) {
      void loadSound(recordedUri);
    }
    return () => {
      if (soundRef.current) {
        void soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, [state, recordedUri]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlayback = useCallback(async () => {
    if (!soundRef.current) return;
    if (isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      if (Platform.OS !== "web") void Haptics.selectionAsync();
      if (hasFinishedRef.current) {
        await soundRef.current.setPositionAsync(0);
        hasFinishedRef.current = false;
      }
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleReRecord = useCallback(async () => {
    if (soundRef.current) { await soundRef.current.unloadAsync(); soundRef.current = null; }
    setIsPlaying(false);
    setPlaybackMs(0);
    setRecordedUri(null);
    setRecordedDuration(0);
    setIncludeAudio(true);
    setTranscriptionText("");
    setState("idle");
  }, []);

  const handleDiscard = useCallback(async () => {
    if (soundRef.current) { await soundRef.current.unloadAsync(); soundRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch {}
      recordingRef.current = null;
    }
    setState("idle");
    setRecordedUri(null);
    setDurationMs(0);
    setIncludeAudio(true);
    setTranscriptionText("");
    onDiscard();
  }, [onDiscard]);

  const hasTranscription = transcriptionText.trim().length > 0;
  const canAttach = includeAudio || hasTranscription;

  const handleAttach = useCallback(() => {
    if (!recordedUri || !canAttach) return;
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAttach(
      recordedUri,
      recordedDuration,
      includeAudio,
      hasTranscription,
      hasTranscription ? transcriptionText.trim() : undefined
    );
  }, [recordedUri, recordedDuration, includeAudio, hasTranscription, transcriptionText, canAttach, onAttach]);

  const progressFraction = recordedDuration > 0 ? Math.min(playbackMs / recordedDuration, 1) : 0;

  if (state === "idle") {
    return (
      <View style={styles.idleRow}>
        <Pressable style={styles.micBtn} onPress={startRecording}>
          <Mic size={20} color={colors.primary} />
        </Pressable>
        <Text style={styles.idleHint}>Tap to record a voice prayer</Text>
        <Pressable style={styles.discardLinkBtn} onPress={handleDiscard}>
          <Text style={styles.discardLinkText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  if (state === "recording") {
    return (
      <View style={styles.recordingContainer}>
        <View style={styles.recordingRow}>
          <Animated.View style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
          <Text style={styles.recordingTimer}>{formatDuration(durationMs)}</Text>
          <Text style={styles.recordingLabel}>Recording…</Text>
        </View>
        <Pressable style={styles.stopBtn} onPress={stopRecording}>
          <Square size={18} color="#fff" fill="#fff" />
          <Text style={styles.stopBtnText}>Stop</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.previewContainer}>
      {/* Audio player preview */}
      <View style={styles.playerRow}>
        <Pressable style={styles.playBtn} onPress={togglePlayback}>
          {isPlaying
            ? <Pause size={16} color="#fff" fill="#fff" />
            : <Play size={16} color="#fff" fill="#fff" />
          }
        </Pressable>
        <View style={styles.progressWrap}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressFraction * 100}%` }]} />
          </View>
          <View style={styles.durationRow}>
            <Text style={styles.durationText}>{formatDuration(playbackMs)}</Text>
            <Text style={styles.durationText}>{formatDuration(recordedDuration)}</Text>
          </View>
        </View>
      </View>

      {/* Transcription / caption card */}
      <View style={styles.transcriptionCard}>
        <View style={styles.transcriptionCardHeader}>
          <Text style={styles.transcriptionCardLabel}>TRANSCRIPTION</Text>
          <Mic size={14} color={colors.primary} />
        </View>
        <TextInput
          style={styles.transcriptionCardInput}
          placeholder="Add a caption or transcription (optional)…"
          placeholderTextColor={colors.mutedForeground + "80"}
          multiline
          value={transcriptionText}
          onChangeText={setTranscriptionText}
          maxLength={500}
          textAlignVertical="top"
        />
      </View>

      {/* Include original audio toggle */}
      <View style={styles.optionsSection}>
        <View style={styles.audioToggleRow}>
          <View style={styles.audioToggleLeft}>
            <Mic size={16} color={includeAudio ? colors.primary : colors.mutedForeground} />
            <View style={styles.audioToggleTextWrap}>
              <Text style={[styles.optionText, includeAudio && { color: colors.foreground, fontWeight: "600" as const }]}>
                Include original audio
              </Text>
              <Text style={styles.optionSubtext}>Share audio + transcript with your post</Text>
            </View>
          </View>
          <ThemedSwitch value={includeAudio} onValueChange={setIncludeAudio} />
        </View>
        {!canAttach && (
          <Text style={styles.validationHint}>Add a caption or turn on audio to post</Text>
        )}
      </View>

      <View style={styles.previewActions}>
        <Pressable style={styles.reRecordBtn} onPress={handleReRecord}>
          <RotateCcw size={14} color={colors.mutedForeground} />
          <Text style={styles.reRecordText}>Re-record</Text>
        </Pressable>
        <Pressable style={styles.discardBtn} onPress={handleDiscard}>
          <Trash2 size={14} color="#dc2626" />
          <Text style={styles.discardText}>Discard</Text>
        </Pressable>
        <Pressable
          style={[styles.attachBtn, { backgroundColor: canAttach ? colors.primary : colors.border }]}
          onPress={handleAttach}
          disabled={!canAttach}
        >
          <Check size={14} color="#fff" strokeWidth={2.5} />
          <Text style={styles.attachText}>Use recording</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    idleRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      paddingVertical: 8,
    },
    micBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + "15",
      borderWidth: 1.5,
      borderColor: colors.primary + "30",
      borderStyle: "dashed" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    idleHint: {
      flex: 1,
      fontSize: 13,
      color: colors.mutedForeground,
    },
    discardLinkBtn: { paddingHorizontal: 4 },
    discardLinkText: { fontSize: 13, color: colors.mutedForeground },

    recordingContainer: {
      alignItems: "center" as const,
      gap: 16,
      paddingVertical: 12,
    },
    recordingRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
    },
    recordingDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: "#ef4444",
    },
    recordingTimer: {
      fontSize: 24,
      fontWeight: "700" as const,
      color: colors.foreground,
      fontVariant: ["tabular-nums"] as const,
    },
    recordingLabel: {
      fontSize: 13,
      color: colors.mutedForeground,
    },
    stopBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 24,
      backgroundColor: "#ef4444",
    },
    stopBtnText: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: "#fff",
    },

    previewContainer: {
      gap: 12,
      paddingVertical: 4,
    },
    playerRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      backgroundColor: colors.accent,
      borderRadius: 16,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    playBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    progressWrap: { flex: 1, gap: 4 },
    progressTrack: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      overflow: "hidden" as const,
    },
    progressFill: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.primary,
    },
    durationRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
    },
    durationText: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontVariant: ["tabular-nums"] as const,
    },

    optionsSection: {
      backgroundColor: colors.accent,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      gap: 10,
    },
    optionsLabel: {
      fontSize: 10,
      fontWeight: "700" as const,
      color: colors.mutedForeground,
      letterSpacing: 1,
    },
    optionRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
    },
    toggleBox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.background,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    optionText: {
      fontSize: 14,
      color: colors.mutedForeground,
    },
    optionSubtext: {
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 1,
    },
    audioToggleRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
    },
    audioToggleLeft: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      flex: 1,
    },
    audioToggleTextWrap: {
      flex: 1,
    },
    validationHint: {
      fontSize: 11,
      color: "#ef4444",
      marginTop: 2,
    },

    transcriptionCard: {
      backgroundColor: colors.accent,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      gap: 6,
    },
    transcriptionCardHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
    },
    transcriptionCardLabel: {
      fontSize: 10,
      fontWeight: "700" as const,
      letterSpacing: 1.5,
      color: colors.mutedForeground,
    },
    transcriptionCardInput: {
      fontSize: 14,
      color: colors.foreground,
      minHeight: 52,
      fontStyle: "italic" as const,
      padding: 0,
    },

    previewActions: {
      flexDirection: "row" as const,
      gap: 8,
      alignItems: "center" as const,
    },
    reRecordBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.accent,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reRecordText: { fontSize: 12, fontWeight: "600" as const, color: colors.mutedForeground },
    discardBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: "#fef2f2",
      borderWidth: 1,
      borderColor: "#fecaca",
    },
    discardText: { fontSize: 12, fontWeight: "600" as const, color: "#dc2626" },
    attachBtn: {
      flex: 1,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 20,
    },
    attachText: { fontSize: 13, fontWeight: "700" as const, color: "#fff" },
  });
}
