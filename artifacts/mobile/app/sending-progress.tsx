import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

export default function SendingProgressScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { sendToFeed, recipientCount: recipientCountParam } = useLocalSearchParams<{ sendToFeed?: string; recipientCount?: string }>();
  const isFeedOnly = sendToFeed === "true" && (recipientCountParam === "0" || !recipientCountParam);
  const recipientCount = parseInt(recipientCountParam ?? "0", 10);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.6)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 2000, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0.6, duration: 700, useNativeDriver: true }),
    ])).start();
    Animated.timing(progressAnim, { toValue: 1, duration: 2500, useNativeDriver: false }).start(() => {
      setTimeout(() => {
        router.replace(`/sent-confirmation?sendToFeed=${sendToFeed ?? "false"}&recipientCount=${recipientCountParam ?? "0"}` as never);
      }, 400);
    });
  }, [spinAnim, pulseAnim, progressAnim, router]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <View style={styles.container}>
      <View style={styles.spinnerWrapper}>
        <View style={styles.spinnerTrack} />
        <Animated.View style={[styles.spinnerArc, { transform: [{ rotate: spin }] }]} />
        <View style={styles.spinnerInner}>
          <Animated.Text style={[styles.planeEmoji, { opacity: pulseAnim }]}>✉️</Animated.Text>
        </View>
      </View>

      <Text style={styles.title}>{isFeedOnly ? "Sharing your prayer" : "Sending your prayer"}</Text>
      <Text style={styles.subtitle}>Sharing your blessings with the world...</Text>

      <View style={styles.progressCard}>
        <View style={styles.progressRow}>
          <View style={styles.progressDot} />
          <View style={styles.progressInfo}>
            <Text style={styles.progressLabel}>
              {isFeedOnly ? "Sharing to Feed" : `Sending to ${recipientCount} ${recipientCount === 1 ? "person" : "people"}`}
            </Text>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
            </View>
          </View>
          <Animated.Text style={[styles.progressPct, { opacity: pulseAnim }]}>66%</Animated.Text>
        </View>
      </View>

      <Text style={styles.disclaimer}>Some messages may be sent through different channels</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
    spinnerWrapper: { width: 120, height: 120, alignItems: "center", justifyContent: "center", marginBottom: 36 },
    spinnerTrack: { position: "absolute", width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: colors.primary + "20" },
    spinnerArc: { position: "absolute", width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: "transparent", borderTopColor: colors.primary },
    spinnerInner: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primary + "0C", alignItems: "center", justifyContent: "center" },
    planeEmoji: { fontSize: 32 },
    title: { fontSize: 22, fontWeight: "700" as const, color: colors.foreground, textAlign: "center", marginBottom: 10 },
    subtitle: { fontSize: 14, color: colors.mutedForeground, textAlign: "center", lineHeight: 22, marginBottom: 32 },
    progressCard: { width: "100%", backgroundColor: colors.card, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: colors.border + "60", marginBottom: 16 },
    progressRow: { flexDirection: "row", alignItems: "center", gap: 14 },
    progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
    progressInfo: { flex: 1 },
    progressLabel: { fontSize: 13, fontWeight: "600" as const, color: colors.foreground, marginBottom: 8 },
    progressTrack: { height: 4, backgroundColor: colors.secondary, borderRadius: 2, overflow: "hidden" },
    progressBar: { height: "100%", backgroundColor: colors.primary, borderRadius: 2 },
    progressPct: { fontSize: 12, fontWeight: "700" as const, color: colors.primary },
    disclaimer: { fontSize: 10, color: colors.mutedForeground + "80", textAlign: "center", textTransform: "uppercase", letterSpacing: 1, fontWeight: "700" as const },
  });
}
