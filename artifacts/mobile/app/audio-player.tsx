import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronDown, Share2, Shuffle, SkipBack, Play, Pause, SkipForward, Repeat } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

export default function AudioPlayerScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress] = useState(0.45);

  const togglePlay = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPlaying((p) => !p);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.bgGradient} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={() => router.back()}><ChevronDown size={22} color={colors.foreground} /></Pressable>
          <Text style={styles.headerLabel}>NOW PLAYING</Text>
          <Pressable style={styles.headerBtn}><Share2 size={18} color={colors.foreground} /></Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.artworkWrap}>
            <View style={styles.artworkShadow} />
            <Image source={{ uri: "https://randomuser.me/api/portraits/men/42.jpg" }} style={styles.artwork} />
          </View>

          <View style={styles.trackInfo}>
            <Text style={styles.trackTitle}>Prayer for Strength</Text>
            <Text style={styles.trackArtist}>Pastor Samuel Jones</Text>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]}>
                <View style={styles.progressThumb} />
              </View>
            </View>
            <View style={styles.progressTimes}>
              <Text style={styles.timeText}>02:14</Text>
              <Text style={styles.timeText}>05:30</Text>
            </View>
          </View>
        </View>

        <View style={styles.controls}>
          <Pressable><Shuffle size={22} color={colors.mutedForeground} /></Pressable>
          <View style={styles.mainControls}>
            <Pressable style={styles.skipBtn}><SkipBack size={28} color={colors.secondaryForeground} /></Pressable>
            <Pressable style={styles.playBtn} onPress={togglePlay}>
              {isPlaying ? <Pause size={36} color={colors.primaryForeground} /> : <Play size={36} color={colors.primaryForeground} />}
            </Pressable>
            <Pressable style={styles.skipBtn}><SkipForward size={28} color={colors.secondaryForeground} /></Pressable>
          </View>
          <Pressable><Repeat size={22} color={colors.primary} /></Pressable>
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
    headerLabel: { fontSize: 12, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 2 },
    content: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: 32, gap: 36 },
    artworkWrap: { position: "relative" as const },
    artworkShadow: { position: "absolute" as const, top: 8, left: 8, right: -8, bottom: -8, borderRadius: 32, backgroundColor: colors.primary + "18", transform: [{ rotate: "3deg" }] },
    artwork: { width: 256, height: 256, borderRadius: 32, borderWidth: 4, borderColor: colors.card },
    trackInfo: { alignItems: "center" as const, gap: 6 },
    trackTitle: { fontSize: 24, fontWeight: "800" as const, color: colors.foreground },
    trackArtist: { fontSize: 15, fontWeight: "700" as const, color: colors.primary },
    progressSection: { width: "100%", gap: 8, paddingTop: 8 },
    progressTrack: { height: 6, backgroundColor: colors.muted, borderRadius: 3, overflow: "hidden" as const },
    progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3, justifyContent: "center" as const, alignItems: "flex-end" as const },
    progressThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.primary, marginRight: -8 },
    progressTimes: { flexDirection: "row", justifyContent: "space-between" },
    timeText: { fontSize: 10, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 1 },
    controls: { flexDirection: "row", alignItems: "center", justifyContent: "center" as const, paddingHorizontal: 32, paddingBottom: 40, gap: 28 },
    mainControls: { flexDirection: "row", alignItems: "center", gap: 24 },
    skipBtn: { width: 52, height: 52, borderRadius: 26, alignItems: "center" as const, justifyContent: "center" as const },
    playBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: "center" as const, justifyContent: "center" as const, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8 },
  });
}
