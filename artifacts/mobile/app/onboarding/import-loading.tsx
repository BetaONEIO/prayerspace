import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Users } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

export default function ImportContactsLoading() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const innerSpinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(innerSpinAnim, { toValue: 1, duration: 2200, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ])).start();
    Animated.timing(progressAnim, { toValue: 0.72, duration: 2400, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    const timer = setTimeout(() => router.replace("/(tabs)/(home)" as never), 3000);
    return () => clearTimeout(timer);
  }, [spinAnim, innerSpinAnim, pulseAnim, progressAnim, router]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const innerSpin = innerSpinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-360deg"] });
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.spinnerWrap}>
          <Animated.View style={[styles.outerRing, { transform: [{ rotate: spin }] }]} />
          <Animated.View style={[styles.innerRing, { transform: [{ rotate: innerSpin }] }]} />
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Users size={48} color={colors.primary} />
          </Animated.View>
        </View>
        <View style={styles.textArea}>
          <Text style={styles.title}>Gathering your community...</Text>
          <Text style={styles.quote}>"For where two or three are gathered in my name, there am I among them."</Text>
        </View>
        <View style={styles.progressBg}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    inner: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 0 },
    spinnerWrap: { width: 160, height: 160, alignItems: "center", justifyContent: "center", marginBottom: 48, position: "relative" },
    outerRing: { position: "absolute", width: 160, height: 160, borderRadius: 80, borderWidth: 4, borderColor: colors.primary + "30", borderTopColor: colors.primary },
    innerRing: { position: "absolute", width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: colors.secondary, borderTopColor: colors.accent },
    textArea: { alignItems: "center", gap: 14, marginBottom: 48 },
    title: { fontSize: 22, fontWeight: "800" as const, color: colors.foreground, textAlign: "center" },
    quote: { fontSize: 13, color: colors.mutedForeground, textAlign: "center", fontStyle: "italic", lineHeight: 20, maxWidth: 240 },
    progressBg: { width: 200, height: 6, backgroundColor: colors.secondary, borderRadius: 3, overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3 },
  });
}
