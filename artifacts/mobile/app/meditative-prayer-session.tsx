import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { X, Settings, Music, Pause, Play, BookOpen, PenLine, Loader, Volume2, VolumeX } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Audio, AVPlaybackStatus } from "expo-av";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";

const WORSHIP_TRACK = require("@/assets/christian-worship.mp3");

export default function MeditativePrayerSessionScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { muted: mutedParam } = useLocalSearchParams<{ muted?: string }>();
  const initiallyMuted = mutedParam === "true";

  const [isPlaying, setIsPlaying]           = useState(true);
  const [isMuted, setIsMuted]               = useState(initiallyMuted);
  const [seconds, setSeconds]               = useState(0);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio]  = useState(false);
  const [audioError, setAudioError]          = useState(false);
  const [audioPosition, setAudioPosition]    = useState(0);
  const [audioDuration, setAudioDuration]    = useState(1);

  const soundRef     = useRef<Audio.Sound | null>(null);
  const loadGenRef   = useRef(0);
  const isPlayingRef = useRef(true);
  const isMutedRef   = useRef(initiallyMuted);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Animated values ──────────────────────────────────────────────────────
  const modalSlide   = useRef(new Animated.Value(300)).current;
  const modalOverlay = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const waveOpacity  = useRef(new Animated.Value(1)).current;

  // Ripple rings (3 concentric, staggered)
  const ring1Scale   = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.22)).current;
  const ring2Scale   = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0.18)).current;
  const ring3Scale   = useRef(new Animated.Value(1)).current;
  const ring3Opacity = useRef(new Animated.Value(0.12)).current;

  // Waveform bars (6 columns)
  const pulse1 = useRef(new Animated.Value(0.4)).current;
  const pulse2 = useRef(new Animated.Value(0.6)).current;
  const pulse3 = useRef(new Animated.Value(1  )).current;
  const pulse4 = useRef(new Animated.Value(0.8)).current;
  const pulse5 = useRef(new Animated.Value(0.5)).current;
  const pulse6 = useRef(new Animated.Value(0.7)).current;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Ripple background animation ───────────────────────────────────────────
  useEffect(() => {
    const makeRipple = (
      scale: Animated.Value,
      opacity: Animated.Value,
      delay: number,
    ) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale,   { toValue: 1.55, duration: 3600, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0,    duration: 3600, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scale,   { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.22 - delay * 0.00002, duration: 0, useNativeDriver: true }),
          ]),
        ]),
      );

    const a1 = makeRipple(ring1Scale, ring1Opacity, 0);
    const a2 = makeRipple(ring2Scale, ring2Opacity, 1200);
    const a3 = makeRipple(ring3Scale, ring3Opacity, 2400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  // ── Waveform animation ────────────────────────────────────────────────────
  useEffect(() => {
    const makeWave = (anim: Animated.Value, duration: number, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1,   duration, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.2, duration, useNativeDriver: true }),
        ]),
      );
    const anims = [
      makeWave(pulse1, 1200, 0),
      makeWave(pulse2, 1500, 200),
      makeWave(pulse3, 1000, 400),
      makeWave(pulse4, 1800, 100),
      makeWave(pulse5, 1300, 300),
      makeWave(pulse6, 1600, 500),
    ];
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  // Dim waveform when paused
  useEffect(() => {
    Animated.timing(waveOpacity, {
      toValue: isPlaying ? 1 : 0.3,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isPlaying, waveOpacity]);

  // ── Audio playback status ─────────────────────────────────────────────────
  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setAudioPosition(status.positionMillis);
      if (status.durationMillis && status.durationMillis > 0)
        setAudioDuration(status.durationMillis);
    }
  }, []);

  // ── Load audio ────────────────────────────────────────────────────────────
  const loadAndPlay = useCallback(async () => {
    const myGen = ++loadGenRef.current;
    setAudioError(false);
    setAudioPosition(0);
    if (soundRef.current) {
      try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch {}
      soundRef.current = null;
    }
    if (myGen !== loadGenRef.current) return;
    setIsLoadingAudio(true);
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        // IMPORTANT: do NOT stay active in background — stops when user leaves
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      const { sound } = await Audio.Sound.createAsync(
        WORSHIP_TRACK,
        {
          shouldPlay: true,
          isMuted: isMutedRef.current,
          isLooping: true,
          progressUpdateIntervalMillis: 500,
        },
        onPlaybackStatusUpdate,
      );
      if (myGen !== loadGenRef.current) { sound.unloadAsync().catch(() => {}); return; }
      soundRef.current = sound;
    } catch (e) {
      if (myGen === loadGenRef.current) setAudioError(true);
    } finally {
      if (myGen === loadGenRef.current) setIsLoadingAudio(false);
    }
  }, [onPlaybackStatusUpdate]);

  // ── Mount: load audio / Unmount: stop + unload ────────────────────────────
  useEffect(() => {
    void loadAndPlay();
    return () => {
      ++loadGenRef.current; // invalidate any in-flight load
      soundRef.current?.stopAsync().then(() => soundRef.current?.unloadAsync()).catch(() => {});
      soundRef.current = null;
    };
  }, []);

  // ── Focus / blur: pause when navigating away, resume when returning ───────
  useFocusEffect(
    useCallback(() => {
      // Screen gained focus — resume if we were playing before
      if (isPlayingRef.current && soundRef.current) {
        soundRef.current.playAsync().catch(() => {});
      }
      return () => {
        // Screen lost focus — pause (not stop) so position is preserved
        if (soundRef.current) {
          soundRef.current.pauseAsync().catch(() => {});
        }
      };
    }, []),
  );

  // ── Progress bar animation ────────────────────────────────────────────────
  useEffect(() => {
    if (audioDuration > 0) {
      Animated.timing(progressAnim, {
        toValue: Math.min(audioPosition / audioDuration, 1),
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [audioPosition, audioDuration, progressAnim]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const handlePlayPause = useCallback(async () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !isPlaying;
    setIsPlaying(next);
    isPlayingRef.current = next;
    if (soundRef.current) {
      try { next ? await soundRef.current.playAsync() : await soundRef.current.pauseAsync(); } catch {}
    }
  }, [isPlaying]);

  const handleToggleMute = useCallback(async () => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    isMutedRef.current = nextMuted;
    try {
      await soundRef.current?.setIsMutedAsync(nextMuted);
    } catch {}
  }, [isMuted]);

  const handleClose = useCallback(async () => {
    try { await soundRef.current?.stopAsync(); await soundRef.current?.unloadAsync(); } catch {}
    soundRef.current = null;
    router.back();
  }, [router]);

  const handleFinish = useCallback(async () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try { await soundRef.current?.stopAsync(); await soundRef.current?.unloadAsync(); } catch {}
    soundRef.current = null;
    setShowFinishModal(true);
    Animated.parallel([
      Animated.timing(modalOverlay, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(modalSlide, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  }, [modalOverlay, modalSlide]);

  const handleGoToJournal = useCallback(() => {
    setShowFinishModal(false);
    router.replace("/journal-entry");
  }, [router]);

  const handleMaybeLater = useCallback(() => {
    setShowFinishModal(false);
    router.replace("/");
  }, [router]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Subtle glow blob */}
      <View style={styles.glowCenter} />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={handleClose}>
            <X size={20} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTag}>WITH GOD</Text>
            <Text style={styles.headerSub}>Quiet Session</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.headerBtn}
              onPress={() => { void handleToggleMute(); }}
              accessibilityRole="button"
              accessibilityLabel={isMuted ? "Turn prayer music on" : "Mute prayer music"}
            >
              {isMuted
                ? <VolumeX size={18} color={colors.primary} />
                : <Volume2 size={18} color={colors.primary} />}
            </Pressable>
            <View style={styles.headerBtn}>
              <Settings size={18} color={colors.primary} />
            </View>
          </View>
        </View>

        {/* Main content — ripple rings + timer + waveform */}
        <View style={styles.mainContent}>

          {/* Ripple rings centred behind the timer */}
          <View style={styles.timerWrap}>
            {/* Ring 3 — outermost */}
            <Animated.View style={[
              styles.rippleRing,
              { transform: [{ scale: ring3Scale }], opacity: ring3Opacity, borderColor: colors.primary },
            ]} />
            {/* Ring 2 */}
            <Animated.View style={[
              styles.rippleRing,
              { transform: [{ scale: ring2Scale }], opacity: ring2Opacity, borderColor: colors.primary },
            ]} />
            {/* Ring 1 — innermost, closest to number */}
            <Animated.View style={[
              styles.rippleRing,
              { transform: [{ scale: ring1Scale }], opacity: ring1Opacity, borderColor: colors.primary },
            ]} />

            {/* Timer sits on top */}
            <View style={styles.timerInner}>
              <Text style={styles.timerText}>{formatTime(seconds)}</Text>
              <Text style={styles.timerLabel}>MINUTES IN PRAYER</Text>
            </View>
          </View>

          {/* Animated waveform bars */}
          <Animated.View style={[styles.waveWrap, { opacity: waveOpacity }]}>
            {[
              { anim: pulse1, height: 24 },
              { anim: pulse2, height: 40 },
              { anim: pulse3, height: 32 },
              { anim: pulse4, height: 48 },
              { anim: pulse5, height: 28 },
              { anim: pulse6, height: 36 },
            ].map(({ anim, height }, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    height,
                    opacity: anim,
                    backgroundColor:
                      i === 3 ? colors.primary
                      : i === 2 || i === 5 ? colors.primary + "CC"
                      : colors.primary + "80",
                  },
                ]}
              />
            ))}
          </Animated.View>
        </View>

        {/* Player card */}
        <View style={styles.playerCard}>
          <View style={styles.trackRow}>
            <View style={styles.trackIconWrap}>
              {isLoadingAudio
                ? <Loader size={18} color={colors.primary} />
                : <Music  size={18} color={colors.primary} />}
            </View>
            <View style={styles.trackInfo}>
              <Text style={styles.trackName} numberOfLines={1}>Christian Worship</Text>
              <Text style={styles.trackSub}>
                {isLoadingAudio ? "Loading…" : audioError ? "Unavailable" : "Instrumental worship"}
              </Text>
            </View>
            <View style={styles.trackBadge}>
              <Text style={styles.trackBadgeText}>Worship</Text>
            </View>
          </View>

          <View style={styles.controlsRow}>
            <Pressable style={styles.playBtn} onPress={handlePlayPause}>
              {isPlaying
                ? <Pause size={28} color="#fff" />
                : <Play  size={28} color="#fff" />}
            </Pressable>
          </View>

          <View style={styles.progressBarWrap}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>
            <View style={styles.progressTimes}>
              <Text style={styles.progressTimeText}>{formatTime(Math.floor(audioPosition / 1000))}</Text>
              <Text style={styles.progressTimeText}>{formatTime(Math.floor(audioDuration / 1000))}</Text>
            </View>
          </View>
        </View>

        <Pressable style={styles.finishBtn} onPress={handleFinish}>
          <Text style={styles.finishBtnText}>Finish Prayer Session</Text>
        </Pressable>
      </SafeAreaView>

      {/* Finish modal */}
      <Modal transparent visible={showFinishModal} animationType="none" statusBarTranslucent>
        <Animated.View style={[styles.modalOverlay, { opacity: modalOverlay }]}>
          <Animated.View style={[styles.modalSheet, { transform: [{ translateY: modalSlide }] }]}>
            <View style={styles.modalIconWrap}>
              <BookOpen size={36} color={colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Amen.</Text>
            <Text style={styles.modalDesc}>
              Would you like to record a reflection or a prayer in your journal before you go?
            </Text>
            <Pressable style={styles.journalBtn} onPress={handleGoToJournal}>
              <PenLine size={18} color="#fff" />
              <Text style={styles.journalBtnText}>Add to Journal</Text>
            </Pressable>
            <Pressable style={styles.laterBtn} onPress={handleMaybeLater}>
              <Text style={styles.laterBtnText}>Maybe Later</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  glowCenter: {
    position: "absolute" as const,
    top: "18%",
    left: "10%",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.primary + "08",
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.card + "CC",
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerCenter: { alignItems: "center" as const },
  headerTag: {
    fontSize: 10, fontWeight: "800" as const,
    letterSpacing: 2, color: colors.primary,
  },
  headerSub: {
    fontSize: 14, fontWeight: "700" as const, color: colors.foreground,
  },

  // Main area
  mainContent: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 32,
    gap: 32,
  },

  // Timer + ripple rings
  timerWrap: {
    width: 240,
    height: 240,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  rippleRing: {
    position: "absolute" as const,
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1.5,
  },
  timerInner: { alignItems: "center" as const },
  timerText: {
    fontSize: 52, fontWeight: "800" as const,
    color: colors.foreground,
    letterSpacing: -2,
    fontVariant: ["tabular-nums"] as const,
  },
  timerLabel: {
    fontSize: 9, fontWeight: "800" as const, letterSpacing: 2,
    color: colors.mutedForeground + "80", marginTop: 4,
  },

  // Waveform
  waveWrap: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5, height: 48,
  },
  waveBar: { width: 5, borderRadius: 3 },

  // Player card
  playerCard: {
    backgroundColor: colors.card,
    borderRadius: 40,
    marginHorizontal: 20, marginBottom: 12,
    padding: 24,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06, shadowRadius: 32,
    elevation: 4, gap: 16,
  },
  trackRow: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 12,
  },
  trackIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  trackInfo: { flex: 1 },
  trackName: {
    fontSize: 13, fontWeight: "800" as const,
    color: colors.foreground, letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  trackSub: {
    fontSize: 11, color: colors.mutedForeground,
    fontWeight: "500" as const, marginTop: 2,
  },
  trackBadge: {
    backgroundColor: colors.primary + "15",
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  trackBadgeText: {
    fontSize: 10, fontWeight: "700" as const, color: colors.primary,
  },
  controlsRow: {
    flexDirection: "row" as const, alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  playBtn: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: "center" as const, justifyContent: "center" as const,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20, elevation: 8,
  },
  progressBarWrap: { gap: 6 },
  progressTrack: {
    height: 4, backgroundColor: colors.primary + "18",
    borderRadius: 2, overflow: "hidden" as const,
  },
  progressFill: {
    height: "100%", backgroundColor: colors.primary, borderRadius: 2,
  },
  progressTimes: {
    flexDirection: "row" as const, justifyContent: "space-between" as const,
  },
  progressTimeText: {
    fontSize: 10, color: colors.mutedForeground,
    fontWeight: "600" as const, fontVariant: ["tabular-nums"] as const,
  },

  // Finish button
  finishBtn: {
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: colors.primary, borderRadius: 20,
    paddingVertical: 16, alignItems: "center" as const,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  finishBtnText: {
    fontSize: 14, fontWeight: "800" as const, color: "#fff", letterSpacing: 0.5,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.background + "B8",
    justifyContent: "flex-end" as const,
    paddingHorizontal: 16, paddingBottom: 32,
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderRadius: 40, padding: 32,
    alignItems: "center" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 24,
    elevation: 12, gap: 12,
  },
  modalIconWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: "center" as const, justifyContent: "center" as const,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 28, fontWeight: "800" as const, color: colors.foreground,
  },
  modalDesc: {
    fontSize: 14, color: colors.mutedForeground,
    textAlign: "center" as const, lineHeight: 22, paddingHorizontal: 16,
  },
  journalBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const, justifyContent: "center" as const,
    gap: 8, width: "100%",
    backgroundColor: colors.primary, borderRadius: 20,
    paddingVertical: 18, marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28, shadowRadius: 16, elevation: 6,
  },
  journalBtnText: {
    fontSize: 15, fontWeight: "700" as const, color: "#fff",
  },
  laterBtn: {
    width: "100%",
    backgroundColor: colors.secondary,
    borderRadius: 20, paddingVertical: 18, alignItems: "center" as const,
  },
  laterBtnText: {
    fontSize: 15, fontWeight: "700" as const, color: colors.secondaryForeground,
  },
});
