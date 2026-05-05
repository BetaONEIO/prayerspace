import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import { Play, Pause } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

interface Props {
  audioUrl: string;
  audioDuration?: number;
  audioTranscription?: string;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function VoiceNotePlayer({ audioUrl, audioDuration = 0, audioTranscription }: Props) {
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(audioDuration);
  const [transcriptionExpanded, setTranscriptionExpanded] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
        const { sound } = await Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: false });
        if (!mounted) { await sound.unloadAsync(); return; }
        sound.setOnPlaybackStatusUpdate((status) => {
          if (!status.isLoaded) return;
          const pos = status.positionMillis;
          const dur = status.durationMillis ?? audioDuration;
          setPositionMs(pos);
          setDurationMs(dur);
          const fraction = dur > 0 ? Math.min(pos / dur, 1) : 0;
          progressAnim.setValue(fraction);
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPositionMs(0);
            progressAnim.setValue(0);
          }
        });
        soundRef.current = sound;
        setIsLoaded(true);
      } catch (err) {
        console.error("[VoiceNotePlayer] load error:", err);
      }
    };
    void load();
    return () => {
      mounted = false;
      if (soundRef.current) {
        void soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, [audioUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlayback = useCallback(async () => {
    if (!soundRef.current || !isLoaded) return;
    if (isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      if (Platform.OS !== "web") void Haptics.selectionAsync();
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
  }, [isPlaying, isLoaded]);

  const displayDuration = durationMs || audioDuration;
  const fraction = displayDuration > 0 ? positionMs / displayDuration : 0;

  return (
    <View style={styles.container}>
      <View style={styles.playerRow}>
        <Pressable
          style={[styles.playBtn, { backgroundColor: colors.primary }]}
          onPress={togglePlayback}
          disabled={!isLoaded}
        >
          {isPlaying
            ? <Pause size={14} color="#fff" fill="#fff" />
            : <Play size={14} color="#fff" fill="#fff" />
          }
        </Pressable>

        <View style={styles.progressSection}>
          <View style={styles.waveformContainer}>
            {/* Static waveform bars */}
            {WAVEFORM_HEIGHTS.map((h, i) => {
              const barFraction = i / WAVEFORM_HEIGHTS.length;
              const isPast = barFraction <= fraction;
              return (
                <View
                  key={i}
                  style={[
                    styles.waveBar,
                    {
                      height: h,
                      backgroundColor: isPast ? colors.primary : colors.border,
                    },
                  ]}
                />
              );
            })}
          </View>
          <View style={styles.timingRow}>
            <Text style={styles.timingText}>
              {isPlaying || positionMs > 0 ? formatDuration(positionMs) : formatDuration(displayDuration)}
            </Text>
            {isPlaying && positionMs > 0 && (
              <Text style={styles.timingText}>{formatDuration(displayDuration)}</Text>
            )}
          </View>
        </View>

        <View style={styles.voiceBadge}>
          <Text style={styles.voiceBadgeText}>🎙</Text>
        </View>
      </View>

      {audioTranscription && (
        <View style={styles.transcriptionBox}>
          <Text
            style={styles.transcriptionText}
            numberOfLines={transcriptionExpanded ? undefined : 2}
          >
            {audioTranscription}
          </Text>
          {audioTranscription.length > 80 && (
            <Pressable onPress={() => setTranscriptionExpanded((v) => !v)}>
              <Text style={[styles.readMoreText, { color: colors.primary }]}>
                {transcriptionExpanded ? "Show less" : "Read more"}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const WAVEFORM_HEIGHTS = [
  8, 14, 20, 16, 10, 18, 24, 16, 12, 20,
  28, 18, 10, 16, 22, 14, 8, 18, 24, 14,
  10, 20, 16, 12, 18, 24, 16, 8, 14, 20,
];

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: 8,
      marginVertical: 4,
    },
    playerRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      backgroundColor: colors.accent,
      borderRadius: 14,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    playBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    progressSection: {
      flex: 1,
      gap: 4,
    },
    waveformContainer: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 2,
      height: 28,
    },
    waveBar: {
      flex: 1,
      borderRadius: 2,
    },
    timingRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
    },
    timingText: {
      fontSize: 10,
      color: colors.mutedForeground,
      fontVariant: ["tabular-nums"] as const,
    },
    voiceBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.background,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    voiceBadgeText: {
      fontSize: 14,
    },
    transcriptionBox: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.muted + "60",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    transcriptionText: {
      fontSize: 13,
      color: colors.foreground,
      lineHeight: 18,
      fontStyle: "italic" as const,
    },
    readMoreText: {
      fontSize: 12,
      fontWeight: "600" as const,
      marginTop: 2,
    },
  });
}
