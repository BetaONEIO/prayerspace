import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Check, Sparkles, Star } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

const CONFETTI = [
  { left: "8%", color: "#F59E0B", size: 8, delay: 0, drift: 18 },
  { left: "17%", color: "#F97316", size: 6, delay: 180, drift: -12 },
  { left: "27%", color: "#FBBF24", size: 10, delay: 360, drift: 22 },
  { left: "38%", color: "#FB7185", size: 7, delay: 90, drift: -18 },
  { left: "50%", color: "#FDBA74", size: 9, delay: 450, drift: 14 },
  { left: "62%", color: "#F59E0B", size: 6, delay: 240, drift: -20 },
  { left: "73%", color: "#F97316", size: 10, delay: 40, drift: 16 },
  { left: "84%", color: "#FBBF24", size: 7, delay: 300, drift: -14 },
  { left: "93%", color: "#FB7185", size: 8, delay: 520, drift: 20 },
  { left: "12%", color: "#FDBA74", size: 5, delay: 640, drift: -16 },
  { left: "44%", color: "#F97316", size: 6, delay: 700, drift: 18 },
  { left: "88%", color: "#F59E0B", size: 5, delay: 580, drift: -18 },
] as const;

export default function PlusWelcomeScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const iconScale = useRef(new Animated.Value(0.7)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.85)).current;
  const confettiValues = useRef(CONFETTI.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (process.env.EXPO_OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    Animated.parallel([
      Animated.spring(iconScale, {
        toValue: 1,
        tension: 55,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(iconOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start();

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, {
          toValue: 1.08,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowScale, {
          toValue: 0.85,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    glow.start();

    const confettiAnimations = confettiValues.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(CONFETTI[index].delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 2200,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    confettiAnimations.forEach((animation) => animation.start());

    return () => {
      glow.stop();
      confettiAnimations.forEach((animation) => animation.stop());
    };
  }, [confettiValues, glowScale, iconOpacity, iconScale]);

  const handleContinue = () => {
    if (process.env.EXPO_OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.replace("/onboarding/church-group-type" as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.confettiLayer} pointerEvents="none">
        {CONFETTI.map((piece, index) => (
          <Animated.View
            key={`${piece.left}-${index}`}
            style={[
              styles.confetti,
              {
                left: piece.left,
                width: piece.size,
                height: piece.size * 1.7,
                backgroundColor: piece.color,
                opacity: confettiValues[index].interpolate({
                  inputRange: [0, 0.12, 0.8, 1],
                  outputRange: [0, 1, 1, 0],
                }),
                transform: [
                  {
                    translateY: confettiValues[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [-70, 520],
                    }),
                  },
                  {
                    translateX: confettiValues[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, piece.drift],
                    }),
                  },
                  {
                    rotate: confettiValues[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", `${piece.drift > 0 ? 260 : -260}deg`],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.content}>
        <View style={styles.topLabel}>
          <Sparkles size={16} color={colors.primary} />
          <Text style={styles.topLabelText}>PRAYER SPACE PLUS</Text>
          <Sparkles size={16} color={colors.primary} />
        </View>

        <View style={styles.celebrationArea}>
          <Animated.View
            style={[
              styles.glow,
              { transform: [{ scale: glowScale }], opacity: iconOpacity },
            ]}
          />
          <Animated.View
            style={[
              styles.successCircle,
              { transform: [{ scale: iconScale }], opacity: iconOpacity },
            ]}
          >
            <Star
              size={26}
              color={colors.primaryForeground}
              fill={colors.primaryForeground}
              style={styles.star}
            />
            <Check size={54} color={colors.primaryForeground} strokeWidth={3} />
          </Animated.View>
        </View>

        <View style={styles.copy}>
          <Text style={styles.eyebrow}>WELCOME TO MORE</Text>
          <Text style={styles.title}>You’ve got Prayer Space Plus!</Text>
          <Text style={styles.subtitle}>
            Your private community space is ready. Let’s make it a place where people can pray, connect, and grow together.
          </Text>
        </View>

        <View style={styles.perkRow}>
          <View style={styles.perkDot}>
            <Check size={14} color={colors.primary} strokeWidth={3} />
          </View>
          <Text style={styles.perkText}>Your community tools are unlocked</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.continueButton, pressed && styles.buttonPressed]}
          onPress={handleContinue}
          testID="plus-welcome-continue"
        >
          <Text style={styles.continueButtonText}>Set up my community</Text>
        </Pressable>
        <Text style={styles.nextHint}>First, tell us a little about your community</Text>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    confettiLayer: {
      ...StyleSheet.absoluteFillObject,
      overflow: "hidden",
    },
    confetti: {
      position: "absolute",
      top: 0,
      borderRadius: 3,
    },
    content: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 28,
    },
    topLabel: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      marginBottom: 38,
    },
    topLabelText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: "900" as const,
      letterSpacing: 2,
    },
    celebrationArea: {
      width: 210,
      height: 190,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 18,
    },
    glow: {
      position: "absolute",
      width: 190,
      height: 190,
      borderRadius: 95,
      backgroundColor: colors.primary + "18",
    },
    successCircle: {
      width: 132,
      height: 132,
      borderRadius: 66,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.4,
      shadowRadius: 28,
      elevation: 12,
    },
    star: {
      position: "absolute",
      top: 17,
      right: 18,
    },
    copy: {
      alignItems: "center",
      gap: 14,
    },
    eyebrow: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: "900" as const,
      letterSpacing: 2,
    },
    title: {
      color: colors.foreground,
      fontSize: 31,
      lineHeight: 38,
      fontWeight: "900" as const,
      letterSpacing: -0.8,
      textAlign: "center",
    },
    subtitle: {
      maxWidth: 340,
      color: colors.mutedForeground,
      fontSize: 15,
      lineHeight: 23,
      textAlign: "center",
    },
    perkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      marginTop: 28,
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 999,
      backgroundColor: colors.primary + "12",
    },
    perkDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary + "25",
    },
    perkText: {
      color: colors.foreground,
      fontSize: 12,
      fontWeight: "700" as const,
    },
    actions: {
      paddingHorizontal: 24,
      paddingBottom: 18,
      alignItems: "center",
      gap: 12,
    },
    continueButton: {
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 999,
      paddingVertical: 18,
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 18,
      elevation: 8,
    },
    buttonPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.98 }],
    },
    continueButtonText: {
      color: colors.primaryForeground,
      fontSize: 15,
      fontWeight: "900" as const,
      letterSpacing: 0.3,
    },
    nextHint: {
      color: colors.mutedForeground,
      fontSize: 12,
    },
  });
}