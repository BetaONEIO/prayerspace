import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Platform } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import { X, Pause, Play, Square } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { fadeOutAndPause } from "@/lib/audioFade";

// Bundled worship track — loops continuously until paused or session ends
const WORSHIP_TRACK = require("@/assets/christian-worship.mp3");
const MUSIC_VOLUME = 0.55;

export default function PrayerSessionScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [soundLoaded, setSoundLoaded] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const audioTransitionRef = useRef(false);

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  // ── Pulse animation ───────────────────────────────────────────────────────
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 1500, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 1500, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  // ── Load & play audio on mount ────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        // Allow audio to play alongside silent/ring modes on iOS
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        const { sound } = await Audio.Sound.createAsync(
          WORSHIP_TRACK,
          { shouldPlay: true, isLooping: true, volume: MUSIC_VOLUME },
        );

        if (!mounted) {
          await sound.unloadAsync();
          return;
        }

        soundRef.current = sound;
        setSoundLoaded(true);
      } catch (e) {
        console.warn("[PrayerSession] Could not load worship track:", e);
      }
    };

    void load();

    return () => {
      mounted = false;
      soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, []);

  // ── Pause / resume ────────────────────────────────────────────────────────
  const handlePause = useCallback(async () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const sound = soundRef.current;
    if (!sound) {
      setIsPaused((p) => !p);
      return;
    }
    if (audioTransitionRef.current) return;

    audioTransitionRef.current = true;
    try {
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) return;
      if (status.isPlaying) {
        await fadeOutAndPause(sound);
        setIsPaused(true);
      } else {
        await sound.setVolumeAsync(MUSIC_VOLUME);
        await sound.playAsync();
        setIsPaused(false);
      }
    } catch {}
    finally {
      audioTransitionRef.current = false;
    }
  }, []);

  // ── Stop & go back ────────────────────────────────────────────────────────
  const handleStop = useCallback(async () => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await soundRef.current?.stopAsync();
      await soundRef.current?.unloadAsync();
      soundRef.current = null;
    } catch {}
    router.back();
  }, [router]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Subtle warm tint — keeps the dark background dominant */}
      <View style={styles.bgTint} />
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={() => router.back()}>
            <X size={22} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>IN PRAYER</Text>
            <Text style={styles.headerTime}>{formatTime(seconds)}</Text>
          </View>
          {/* Music indicator — no tap needed, it auto-plays */}
          <View style={styles.headerBtn}>
            <Text style={{ fontSize: 18 }}>🎵</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarBorder}>
              <Image
                source={{ uri: "https://randomuser.me/api/portraits/women/68.jpg" }}
                style={styles.avatar}
              />
            </View>
            <Text style={styles.prayingFor}>Emma Wilson</Text>
            <Text style={styles.prayingDesc}>
              Praying for her mother's recovery and the surgical team.
            </Text>
          </View>

          <Animated.View style={[styles.transcriptCard, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.transcriptText}>
              "Lord, we lift up Emma's mother to you today. We ask for your guiding hand upon the surgeons..."
            </Text>
          </Animated.View>

          <View style={styles.dots}>
            {[0.2, 0.4, 1, 0.4, 0.2].map((opacity, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    width:  i === 2 ? 14 : i === 1 || i === 3 ? 10 : 8,
                    height: i === 2 ? 14 : i === 1 || i === 3 ? 10 : 8,
                    opacity,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Controls — play/pause + finish only, no track navigation */}
        <View style={styles.controls}>
          <View style={styles.controlsInner}>
            <Pressable style={styles.playBtn} onPress={handlePause}>
              {isPaused
                ? <Play  size={36} color={colors.primaryForeground} />
                : <Pause size={36} color={colors.primaryForeground} />}
            </Pressable>
            <Pressable style={styles.stopBtn} onPress={handleStop}>
              <Square size={24} color={colors.secondaryForeground} />
            </Pressable>
          </View>
          <Text style={styles.stopHint}>Tap ■ to finish your prayer session</Text>
        </View>

      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    // ── Root — always matches the app's background token (dark = #0F172A) ──
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    bgTint: {
      position: "absolute" as const,
      top: 0, left: 0, right: 0,
      height: 280,
      // Very light primary wash — barely visible in dark mode
      backgroundColor: colors.primary + "0A",
    },
    safeArea: {
      flex: 1,
      // Explicit background so SafeAreaView never shows system default colour
      backgroundColor: colors.background,
    },

    // Header
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingVertical: 14,
    },
    headerBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: colors.card + "80",
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    headerCenter: { alignItems: "center" as const },
    headerLabel: {
      fontSize: 10, fontWeight: "700" as const,
      color: colors.primary, letterSpacing: 2,
    },
    headerTime: {
      fontSize: 14, fontWeight: "600" as const,
      color: colors.foreground, marginTop: 2,
    },

    // Content
    content: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingHorizontal: 32,
      gap: 36,
    },
    avatarSection: { alignItems: "center" as const, gap: 12 },
    avatarBorder: {
      width: 100, height: 100, borderRadius: 50,
      padding: 4, borderWidth: 3,
      borderColor: colors.primary + "30",
    },
    avatar: { width: "100%", height: "100%", borderRadius: 50 },
    prayingFor: {
      fontSize: 28, fontWeight: "800" as const, color: colors.foreground,
    },
    prayingDesc: {
      fontSize: 14, color: colors.mutedForeground,
      textAlign: "center" as const, maxWidth: 280, lineHeight: 22,
    },
    transcriptCard: {
      backgroundColor: colors.card,
      borderRadius: 32, padding: 28,
      borderWidth: 1, borderColor: colors.border,
      minHeight: 120, justifyContent: "center" as const,
    },
    transcriptText: {
      fontSize: 18, lineHeight: 28,
      color: colors.foreground + "CC",
      fontStyle: "italic" as const,
      textAlign: "center" as const,
    },
    dots: { flexDirection: "row", alignItems: "center" as const, gap: 10 },
    dot:  { borderRadius: 999 },

    // Controls
    controls: {
      paddingHorizontal: 24,
      paddingBottom: 32,
      alignItems: "center" as const,
      gap: 14,
    },
    controlsInner: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center" as const,
      gap: 24,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 20,
      paddingHorizontal: 32,
      borderWidth: 1,
      borderColor: colors.border,
    },
    playBtn: {
      width: 76, height: 76, borderRadius: 38,
      backgroundColor: colors.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.4, shadowRadius: 16,
      elevation: 8,
    },
    stopBtn: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: colors.secondary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    stopHint: {
      fontSize: 12,
      color: colors.mutedForeground,
      textAlign: "center" as const,
    },
  });
}
