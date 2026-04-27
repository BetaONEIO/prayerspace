import React, { useState, useRef, useEffect, useCallback, useMemo} from "react";
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
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { X, Settings, Music, SkipBack, SkipForward, Pause, Play, List, BookOpen, PenLine, VolumeX, Loader } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Audio, AVPlaybackStatus } from "expo-av";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";

interface Track {
  name: string;
  subtitle: string;
  url: string | null;
  attribution: string;
}

const TRACKS: Track[] = [
  {
    name: "Deep Peace",
    subtitle: "Instrumental Worship",
    url: "https://archive.org/download/Time-Lapse_Volume_2_meditations-14215/Lee_Rosevere_-_01_-_Ataraxia.mp3",
    attribution: "Lee Rosevere – Ataraxia (CC BY)",
  },
  {
    name: "Soft Piano",
    subtitle: "Piano Meditations",
    url: "https://archive.org/download/interpretations-and-meditations-for-solo-piano-pynjgd/Harmonic%20Illusion%20-%20Interpretations%20and%20Meditations%20for%20Solo%20Piano%20-%2001%20Lost%20in%20Color%20-Piano%20Version-.mp3",
    attribution: "Harmonic Illusion – Piano Meditations (CC BY)",
  },
  {
    name: "Morning Forest",
    subtitle: "Nature Ambience",
    url: "https://archive.org/download/Time-Lapse_Volume_2_meditations-14215/Lee_Rosevere_-_04_-_Squinting_at_the_Sun.mp3",
    attribution: "Lee Rosevere – Squinting at the Sun (CC BY)",
  },
  {
    name: "Acoustic Reflection",
    subtitle: "Acoustic Instrumental",
    url: "https://archive.org/download/Time-Lapse_Volume_2_meditations-14215/Lee_Rosevere_-_02_-_The_Ambient_Ukulele.mp3",
    attribution: "Lee Rosevere – The Ambient Ukulele (CC BY)",
  },
  {
    name: "Ambient Presence",
    subtitle: "Ambient Sounds",
    url: "https://archive.org/download/Time-Lapse_Volume_2_meditations-14215/Lee_Rosevere_-_03_-_Illuminations.mp3",
    attribution: "Lee Rosevere – Illuminations (CC BY)",
  },
  {
    name: "Silence",
    subtitle: "No Music",
    url: null,
    attribution: "",
  },
];

export default function MeditativePrayerSessionScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{ atmosphere?: string }>();
  const initialAtmosphere = parseInt(params.atmosphere ?? "0", 10);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [seconds, setSeconds] = useState<number>(0);
  const [showFinishModal, setShowFinishModal] = useState<boolean>(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(
    isNaN(initialAtmosphere) ? 0 : Math.min(initialAtmosphere, TRACKS.length - 1)
  );
  const [isLoadingAudio, setIsLoadingAudio] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<boolean>(false);
  const [audioPosition, setAudioPosition] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(1);

  const soundRef = useRef<Audio.Sound | null>(null);
  const modalSlide = useRef(new Animated.Value(300)).current;
  const modalOverlay = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulse1 = useRef(new Animated.Value(0.4)).current;
  const pulse2 = useRef(new Animated.Value(0.6)).current;
  const pulse3 = useRef(new Animated.Value(1)).current;
  const pulse4 = useRef(new Animated.Value(0.8)).current;
  const pulse5 = useRef(new Animated.Value(0.5)).current;
  const pulse6 = useRef(new Animated.Value(0.7)).current;
  const waveOpacity = useRef(new Animated.Value(1)).current;
  const isPlayingRef = useRef<boolean>(true);

  const formatTime = (totalSeconds: number): string => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const startWaveAnimation = useCallback(() => {
    const makeWave = (anim: Animated.Value, duration: number, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.2,
            duration,
            useNativeDriver: true,
          }),
        ])
      );

    makeWave(pulse1, 1200, 0).start();
    makeWave(pulse2, 1500, 200).start();
    makeWave(pulse3, 1000, 400).start();
    makeWave(pulse4, 1800, 100).start();
    makeWave(pulse5, 1300, 300).start();
    makeWave(pulse6, 1600, 500).start();
  }, [pulse1, pulse2, pulse3, pulse4, pulse5, pulse6]);

  useEffect(() => {
    startWaveAnimation();
  }, [startWaveAnimation]);

  useEffect(() => {
    Animated.timing(waveOpacity, {
      toValue: isPlaying ? 1 : 0.3,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isPlaying, waveOpacity]);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setAudioPosition(status.positionMillis);
      if (status.durationMillis && status.durationMillis > 0) {
        setAudioDuration(status.durationMillis);
      }
    }
  }, []);

  const loadAndPlayTrack = useCallback(async (trackIndex: number, shouldPlay: boolean = true) => {
    console.log("[MeditativeSession] Loading track index:", trackIndex);
    setAudioError(false);
    setAudioPosition(0);

    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {
        console.log("[MeditativeSession] Error unloading previous sound:", e);
      }
      soundRef.current = null;
    }

    const track = TRACKS[trackIndex];
    if (!track.url) {
      console.log("[MeditativeSession] Silence mode selected");
      setIsLoadingAudio(false);
      return;
    }

    setIsLoadingAudio(true);
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { shouldPlay, isLooping: true, progressUpdateIntervalMillis: 500 },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
      console.log("[MeditativeSession] Track loaded:", track.name);
    } catch (error) {
      console.log("[MeditativeSession] Audio load error:", error);
      setAudioError(true);
    } finally {
      setIsLoadingAudio(false);
    }
  }, [onPlaybackStatusUpdate]);

  useEffect(() => {
    const setup = async () => {
      if (Platform.OS !== "web") {
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
          });
        } catch (e) {
          console.log("[MeditativeSession] Audio mode setup error:", e);
        }
      }
      await loadAndPlayTrack(currentTrackIndex, true);
    };

    setup();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (audioDuration > 0) {
      const progress = Math.min(audioPosition / audioDuration, 1);
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [audioPosition, audioDuration, progressAnim]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying]);

  const handlePlayPause = useCallback(async () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const nowPlaying = !isPlaying;
    setIsPlaying(nowPlaying);
    isPlayingRef.current = nowPlaying;

    if (soundRef.current) {
      try {
        if (nowPlaying) {
          await soundRef.current.playAsync();
        } else {
          await soundRef.current.pauseAsync();
        }
      } catch (e) {
        console.log("[MeditativeSession] Play/pause error:", e);
      }
    }
  }, [isPlaying]);

  const handleSkipNext = useCallback(async () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const nextIndex = (currentTrackIndex + 1) % TRACKS.length;
    setCurrentTrackIndex(nextIndex);
    await loadAndPlayTrack(nextIndex, isPlayingRef.current);
  }, [currentTrackIndex, loadAndPlayTrack]);

  const handleSkipPrev = useCallback(async () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const prevIndex = (currentTrackIndex - 1 + TRACKS.length) % TRACKS.length;
    setCurrentTrackIndex(prevIndex);
    await loadAndPlayTrack(prevIndex, isPlayingRef.current);
  }, [currentTrackIndex, loadAndPlayTrack]);

  const handleClose = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {}
      soundRef.current = null;
    }
    router.back();
  }, [router]);

  const handleFinish = useCallback(async () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {}
      soundRef.current = null;
    }
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

  const currentTrack = TRACKS[currentTrackIndex];
  const isSilence = currentTrack.url === null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.gradientTop} />
      <View style={styles.gradientBottom} />
      <View style={styles.glowCenter} />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={handleClose}>
            <X size={20} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTag}>WITH GOD</Text>
            <Text style={styles.headerSub}>Quiet Session</Text>
          </View>
          <Pressable style={styles.headerBtn}>
            <Settings size={18} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.mainContent}>
          <View style={styles.timerWrap}>
            <View style={styles.timerRing}>
              <View style={styles.timerInner}>
                <Text style={styles.timerText}>{formatTime(seconds)}</Text>
                <Text style={styles.timerLabel}>MINUTES IN PRAYER</Text>
              </View>
            </View>
          </View>

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
                      i === 3
                        ? colors.primary
                        : i === 2 || i === 5
                        ? colors.primary + "CC"
                        : colors.primary + "80",
                  },
                ]}
              />
            ))}
          </Animated.View>
        </View>

        <View style={styles.playerCard}>
          <View style={styles.trackRow}>
            <View style={styles.trackIconWrap}>
              {isSilence ? (
                <VolumeX size={18} color={colors.primary} />
              ) : isLoadingAudio ? (
                <Loader size={18} color={colors.primary} />
              ) : (
                <Music size={18} color={colors.primary} />
              )}
            </View>
            <View style={styles.trackInfo}>
              <Text style={styles.trackName} numberOfLines={1}>
                {currentTrack.name}
              </Text>
              <Text style={styles.trackSub}>
                {isLoadingAudio
                  ? "Loading..."
                  : audioError
                  ? "Unavailable"
                  : currentTrack.subtitle}
              </Text>
            </View>
            <View style={styles.trackBadge}>
              <Text style={styles.trackBadgeText}>
                {currentTrackIndex + 1}/{TRACKS.length}
              </Text>
            </View>
          </View>

          <View style={styles.controlsRow}>
            <Pressable style={styles.controlBtn} onPress={handleSkipPrev}>
              <SkipBack size={24} color={colors.mutedForeground} />
            </Pressable>
            <Pressable style={styles.playBtn} onPress={handlePlayPause}>
              {isPlaying ? (
                <Pause size={28} color="#fff" />
              ) : (
                <Play size={28} color="#fff" />
              )}
            </Pressable>
            <Pressable style={styles.controlBtn} onPress={handleSkipNext}>
              <SkipForward size={24} color={colors.mutedForeground} />
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
            {!isSilence && (
              <View style={styles.progressTimes}>
                <Text style={styles.progressTimeText}>
                  {formatTime(Math.floor(audioPosition / 1000))}
                </Text>
                <Text style={styles.progressTimeText}>
                  {formatTime(Math.floor(audioDuration / 1000))}
                </Text>
              </View>
            )}
          </View>

          {!isSilence && currentTrack.attribution ? (
            <Text style={styles.attributionText} numberOfLines={1}>
              {currentTrack.attribution}
            </Text>
          ) : null}
        </View>

        <Pressable style={styles.finishBtn} onPress={handleFinish}>
          <Text style={styles.finishBtnText}>Finish Prayer Session</Text>
        </Pressable>
      </SafeAreaView>

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
  gradientTop: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "#FFF9F2",
    opacity: 0.7,
  },
  gradientBottom: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "#FFF5ED",
    opacity: 0.6,
  },
  glowCenter: {
    position: "absolute" as const,
    top: "20%",
    left: "10%",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.primary + "08",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerCenter: {
    alignItems: "center" as const,
  },
  headerTag: {
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 2,
    color: colors.primary,
  },
  headerSub: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.foreground,
  },
  mainContent: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 32,
    gap: 28,
  },
  timerWrap: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  timerRing: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 2,
    borderColor: colors.primary + "18",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  timerInner: {
    alignItems: "center" as const,
  },
  timerText: {
    fontSize: 52,
    fontWeight: "800" as const,
    color: colors.foreground,
    letterSpacing: -2,
    fontVariant: ["tabular-nums"] as const,
  },
  timerLabel: {
    fontSize: 9,
    fontWeight: "800" as const,
    letterSpacing: 2,
    color: colors.mutedForeground + "80",
    marginTop: 4,
  },
  waveWrap: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    height: 48,
  },
  waveBar: {
    width: 5,
    borderRadius: 3,
  },
  playerCard: {
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 40,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 32,
    elevation: 4,
    gap: 16,
  },
  trackRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  trackIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  trackInfo: {
    flex: 1,
  },
  trackName: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: colors.foreground,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  trackSub: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontWeight: "500" as const,
    marginTop: 2,
  },
  trackBadge: {
    backgroundColor: colors.primary + "15",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trackBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  controlsRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 0,
  },
  controlBtn: {
    width: 56,
    height: 56,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginHorizontal: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  progressBarWrap: {
    gap: 6,
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.primary + "18",
    borderRadius: 2,
    overflow: "hidden" as const,
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressTimes: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
  },
  progressTimeText: {
    fontSize: 10,
    color: colors.mutedForeground,
    fontWeight: "600" as const,
    fontVariant: ["tabular-nums"] as const,
  },
  attributionText: {
    fontSize: 9,
    color: colors.mutedForeground + "60",
    textAlign: "center" as const,
    fontStyle: "italic" as const,
    fontWeight: "500" as const,
  },
  finishBtn: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center" as const,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  finishBtnText: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: "#fff",
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(58,47,41,0.25)",
    justifyContent: "flex-end" as const,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderRadius: 40,
    padding: 32,
    alignItems: "center" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
    gap: 12,
  },
  modalIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: colors.foreground,
  },
  modalDesc: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center" as const,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  journalBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 18,
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 6,
  },
  journalBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: "#fff",
  },
  laterBtn: {
    width: "100%",
    backgroundColor: colors.secondary,
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center" as const,
  },
  laterBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.secondaryForeground,
  },
});
