import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Platform } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import { X, Music, SkipBack, Pause, Play, Square } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

export default function PrayerSessionScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 1500, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
    ]));
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const handlePause = useCallback(() => { if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setIsPaused((p) => !p); }, []);
  const handleStop = useCallback(() => { if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); router.back(); }, [router]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.bgGradient} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={() => router.back()}><X size={22} color={colors.foreground} /></Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>IN PRAYER</Text>
            <Text style={styles.headerTime}>{formatTime(seconds)}</Text>
          </View>
          <Pressable style={styles.headerBtn}><Music size={18} color={colors.primary} /></Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarBorder}>
              <Image source={{ uri: "https://randomuser.me/api/portraits/women/68.jpg" }} style={styles.avatar} />
            </View>
            <Text style={styles.prayingFor}>Emma Wilson</Text>
            <Text style={styles.prayingDesc}>Praying for her mother's recovery and the surgical team.</Text>
          </View>

          <Animated.View style={[styles.transcriptCard, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.transcriptText}>"Lord, we lift up Emma's mother to you today. We ask for your guiding hand upon the surgeons..."</Text>
          </Animated.View>

          <View style={styles.dots}>
            {[0.2, 0.4, 1, 0.4, 0.2].map((opacity, i) => (
              <View key={i} style={[styles.dot, { width: i === 2 ? 14 : i === 1 || i === 3 ? 10 : 8, height: i === 2 ? 14 : i === 1 || i === 3 ? 10 : 8, opacity, backgroundColor: colors.primary }]} />
            ))}
          </View>
        </View>

        <View style={styles.controls}>
          <View style={styles.controlsInner}>
            <Pressable style={styles.controlBtn}><SkipBack size={24} color={colors.secondaryForeground} /></Pressable>
            <Pressable style={styles.playBtn} onPress={handlePause}>
              {isPaused ? <Play size={36} color={colors.primaryForeground} /> : <Pause size={36} color={colors.primaryForeground} />}
            </Pressable>
            <Pressable style={styles.controlBtn} onPress={handleStop}><Square size={24} color={colors.secondaryForeground} /></Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    bgGradient: { position: "absolute" as const, top: 0, left: 0, right: 0, height: 300, backgroundColor: colors.primary + "08" },
    safeArea: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 14 },
    headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card + "80", alignItems: "center" as const, justifyContent: "center" as const },
    headerCenter: { alignItems: "center" as const },
    headerLabel: { fontSize: 10, fontWeight: "700" as const, color: colors.primary, letterSpacing: 2 },
    headerTime: { fontSize: 14, fontWeight: "600" as const, color: colors.foreground, marginTop: 2 },
    content: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: 32, gap: 36 },
    avatarSection: { alignItems: "center" as const, gap: 12 },
    avatarBorder: { width: 100, height: 100, borderRadius: 50, padding: 4, borderWidth: 3, borderColor: colors.primary + "30" },
    avatar: { width: "100%", height: "100%", borderRadius: 50 },
    prayingFor: { fontSize: 28, fontWeight: "800" as const, color: colors.foreground },
    prayingDesc: { fontSize: 14, color: colors.mutedForeground, textAlign: "center" as const, maxWidth: 280, lineHeight: 22 },
    transcriptCard: { backgroundColor: colors.card, borderRadius: 32, padding: 28, borderWidth: 1, borderColor: colors.border, minHeight: 120, justifyContent: "center" as const },
    transcriptText: { fontSize: 18, lineHeight: 28, color: colors.foreground + "CC", fontStyle: "italic" as const, textAlign: "center" as const },
    dots: { flexDirection: "row", alignItems: "center" as const, gap: 10 },
    dot: { borderRadius: 999 },
    controls: { paddingHorizontal: 24, paddingBottom: 32 },
    controlsInner: { flexDirection: "row", alignItems: "center", justifyContent: "center" as const, gap: 28, backgroundColor: colors.card, borderRadius: 999, paddingVertical: 20, paddingHorizontal: 20, borderWidth: 1, borderColor: colors.border },
    controlBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.secondary, alignItems: "center" as const, justifyContent: "center" as const },
    playBtn: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primary, alignItems: "center" as const, justifyContent: "center" as const, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  });
}
