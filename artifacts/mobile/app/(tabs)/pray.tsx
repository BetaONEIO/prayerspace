import React, { useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from "react-native";
import { useTabSwipe } from "@/hooks/useTabSwipe";
import { Video, ResizeMode } from "expo-av";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Sun, ChevronLeft } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { useAuth } from "@/providers/AuthProvider";
import { ThemeColors } from "@/constants/colors";
import { useMemo } from "react";

export default function PrayScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const card1Scale = useRef(new Animated.Value(1)).current;
  const card2Scale = useRef(new Animated.Value(1)).current;
  const bgFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(bgFade, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [bgFade]);

  const handlePressIn = useCallback((anim: Animated.Value) => {
    Animated.spring(anim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, []);

  const handlePressOut = useCallback((anim: Animated.Value) => {
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, []);

  const handleStartPrayer = useCallback(() => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/prayer-mode" as never);
  }, [router]);

  const handlePrayerTime = useCallback(() => {
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync();
    }
    router.push("/meditative-prayer" as never);
  }, [router]);

  const { user, profile } = useAuth();
  const displayName = profile?.full_name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Friend";
  const firstName = displayName.split(" ")[0];
  const swipeHandlers = useTabSwipe("/(tabs)/(home)", "/(tabs)/community");

  return (
    <View style={styles.container} {...swipeHandlers}>
      <Animated.View style={[styles.bgImage, { opacity: bgFade }]}>
        <Video
          source={{ uri: "https://r2-pub.rork.com/attachments/uzu7dkckawvvxop6q6j2w.mp4" }}
          style={styles.bgImageInner}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay
          isMuted
          useNativeControls={false}
        />
        <View style={styles.bgOverlay} />
      </Animated.View>

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color={colors.foreground} />
          </Pressable>
          <View style={styles.iconWrap}>
            <Sun size={32} color={colors.primary} />
          </View>
          <Text style={styles.welcomeTitle}>Welcome Back, {firstName}</Text>
          <Text style={styles.welcomeSubtitle}>
            How would you like to pray today?
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          <Animated.View style={{ transform: [{ scale: card1Scale }] }}>
            <Pressable
              style={styles.startPrayerCard}
              onPressIn={() => handlePressIn(card1Scale)}
              onPressOut={() => handlePressOut(card1Scale)}
              onPress={handleStartPrayer}
            >
              <View style={styles.cardBgIcon}>
                <Text style={styles.cardBgEmoji}>🙏</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitleWhite}>Start a Prayer</Text>
                <Text style={styles.cardSubtitleWhite}>
                  Pray privately, send to someone, or share with others
                </Text>
              </View>
            </Pressable>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: card2Scale }] }}>
            <Pressable
              style={styles.communityCard}
              onPressIn={() => handlePressIn(card2Scale)}
              onPressOut={() => handlePressOut(card2Scale)}
              onPress={handlePrayerTime}
            >
              <View style={styles.communityBgIcon}>
                <Text style={styles.cardBgEmoji}>🕊️</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitleDark}>Prayer Space</Text>
                <Text style={styles.cardSubtitleMuted}>Pause, reflect, and spend time with God</Text>
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    bgImage: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    bgImageInner: {
      width: "100%",
      height: "100%",
    },
    bgOverlay: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.background,
      opacity: 0.82,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      alignItems: "center" as const,
      paddingHorizontal: 32,
      paddingTop: 16,
      paddingBottom: 40,
    },
    backButton: {
      alignSelf: "flex-start" as const,
      marginBottom: 20,
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.card,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconWrap: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: colors.primary + "1A",
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: 20,
    },
    welcomeTitle: {
      fontSize: 28,
      fontWeight: "700" as const,
      color: colors.foreground,
      textAlign: "center" as const,
      marginBottom: 10,
      letterSpacing: -0.5,
    },
    welcomeSubtitle: {
      fontSize: 16,
      color: colors.mutedForeground,
      textAlign: "center" as const,
      lineHeight: 24,
      maxWidth: 260,
    },
    cardsContainer: {
      flex: 1,
      paddingHorizontal: 28,
      gap: 16,
      justifyContent: "center" as const,
      paddingBottom: 40,
    },
    startPrayerCard: {
      backgroundColor: colors.primary,
      borderRadius: 36,
      padding: 32,
      overflow: "hidden" as const,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.3,
      shadowRadius: 40,
      elevation: 12,
    },
    communityCard: {
      backgroundColor: colors.card,
      borderRadius: 36,
      padding: 32,
      overflow: "hidden" as const,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.05,
      shadowRadius: 30,
      elevation: 4,
    },
    cardBgIcon: {
      position: "absolute" as const,
      top: "50%" as unknown as number,
      right: -16,
      opacity: 0.1,
      transform: [{ rotate: "12deg" }, { translateY: -50 }],
    },
    communityBgIcon: {
      position: "absolute" as const,
      top: "50%" as unknown as number,
      right: -16,
      opacity: 0.05,
      transform: [{ rotate: "-12deg" }, { translateY: -50 }],
    },
    cardBgEmoji: {
      fontSize: 96,
    },
    cardContent: {
      gap: 8,
    },
    cardTitleWhite: {
      fontSize: 22,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
      letterSpacing: -0.3,
    },
    cardSubtitleWhite: {
      fontSize: 14,
      color: colors.primaryForeground + "CC",
      fontWeight: "500" as const,
      lineHeight: 20,
    },
    cardTitleDark: {
      fontSize: 22,
      fontWeight: "700" as const,
      color: colors.foreground,
      letterSpacing: -0.3,
    },
    cardSubtitleMuted: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontWeight: "500" as const,
      lineHeight: 20,
    },
  });
}
