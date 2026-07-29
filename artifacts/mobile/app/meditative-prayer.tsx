import React, { useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import { ChevronLeft, Play } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

export default function MeditativePrayerScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const btnScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [btnScale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [btnScale]);

  const handleBegin = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/meditative-prayer-session");
  }, [router]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.secondaryForeground} />
          </Pressable>
          <Text style={styles.headerTitle}>Quiet Time</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.mainContent}>
          <Text style={styles.title}>Spend time with God{"\n"}in prayer</Text>
          <Text style={styles.subtitle}>
            Find a quiet space, breathe deeply,{"\n"}and enter His presence.
          </Text>

          <Animated.View style={{ transform: [{ scale: btnScale }], width: "100%" }}>
            <Pressable style={styles.beginBtn} onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={handleBegin}>
              <Play size={22} color="#fff" />
              <Text style={styles.beginBtnText}>BEGIN PRAYER</Text>
            </Pressable>
          </Animated.View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerVerse}>
            "Be still, and know that I am God." — Psalm 46:10
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    blob1: {
      position: "absolute" as const, top: -96, right: -96,
      width: 256, height: 256, borderRadius: 128,
      backgroundColor: colors.primary + "0D",
    },
    blob2: {
      position: "absolute" as const, bottom: -96, left: -96,
      width: 320, height: 320, borderRadius: 160,
      backgroundColor: colors.primary + "1A",
    },
    safeArea: { flex: 1 },
    header: {
      flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const,
      paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary,
      alignItems: "center" as const, justifyContent: "center" as const,
    },
    headerTitle: { fontSize: 18, fontWeight: "700" as const, color: colors.foreground, letterSpacing: -0.3 },
    headerPlaceholder: { width: 40 },
    mainContent: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: 40 },
    title: {
      fontSize: 28, fontWeight: "800" as const, color: colors.foreground,
      textAlign: "center" as const, letterSpacing: -0.6, lineHeight: 36, marginBottom: 12,
    },
    subtitle: { fontSize: 14, color: colors.mutedForeground, textAlign: "center" as const, lineHeight: 22, marginBottom: 52 },
    beginBtn: {
      backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 20, paddingHorizontal: 32,
      flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const,
      gap: 12, shadowColor: colors.primary, shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.35, shadowRadius: 28, elevation: 10, width: "100%", maxWidth: 300, alignSelf: "center" as const,
    },
    beginBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" as const, letterSpacing: 2 },
    footer: { paddingHorizontal: 40, paddingBottom: 16, alignItems: "center" as const },
    footerVerse: {
      fontSize: 12, color: colors.mutedForeground, fontStyle: "italic" as const,
      textAlign: "center" as const, fontWeight: "500" as const, lineHeight: 20,
    },
  });
}
