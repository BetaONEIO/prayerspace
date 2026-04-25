import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Platform,
} from "react-native";
import * as StoreReview from "expo-store-review";
import * as Haptics from "expo-haptics";
import { Star, X, Heart } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onReviewed: () => void;
}

export default function ReviewModal({ visible, onClose, onReviewed }: ReviewModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedStars, setSelectedStars] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(300)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const starAnims = useRef([
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
    new Animated.Value(1),
  ]).current;

  useEffect(() => {
    if (visible) {
      setSelectedStars(0);
      setHoveredStar(0);
      setSubmitted(false);
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(sheetAnim, { toValue: 0, tension: 68, friction: 12, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 68, friction: 12, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(sheetAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, backdropAnim, sheetAnim, scaleAnim]);

  const animateStar = useCallback((index: number) => {
    Animated.sequence([
      Animated.spring(starAnims[index], { toValue: 1.4, tension: 200, friction: 5, useNativeDriver: true }),
      Animated.spring(starAnims[index], { toValue: 1, tension: 200, friction: 6, useNativeDriver: true }),
    ]).start();
  }, [starAnims]);

  const handleStarPress = useCallback(async (star: number) => {
    setSelectedStars(star);
    animateStar(star - 1);
    if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    for (let i = 0; i < star; i++) {
      setTimeout(() => animateStar(i), i * 60);
    }
  }, [animateStar]);

  const handleSubmit = useCallback(async () => {
    if (selectedStars === 0) return;
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitted(true);
    onReviewed();
    if (selectedStars >= 4) {
      setTimeout(async () => {
        try {
          const isAvailable = await StoreReview.isAvailableAsync();
          if (isAvailable) await StoreReview.requestReview();
        } catch (e) {
          console.log("[ReviewModal] Store review error:", e);
        }
        setTimeout(() => onClose(), 500);
      }, 1200);
    } else {
      setTimeout(() => onClose(), 1800);
    }
  }, [selectedStars, onReviewed, onClose]);

  const displayedStars = hoveredStar || selectedStars;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetAnim }, { scale: scaleAnim }] }]}>
          {!submitted ? (
            <>
              <Pressable style={styles.closeBtn} onPress={onClose}>
                <X size={16} color={colors.mutedForeground} />
              </Pressable>

              <View style={styles.iconWrap}>
                <View style={styles.iconCircle}>
                  <Heart size={28} color={colors.primary} fill={colors.primary} />
                </View>
              </View>

              <Text style={styles.title}>Enjoying Prayer Space?</Text>
              <Text style={styles.subtitle}>
                Your review helps others discover a place to pray together.
              </Text>

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable
                    key={star}
                    onPress={() => handleStarPress(star)}
                    onPressIn={() => setHoveredStar(star)}
                    onPressOut={() => setHoveredStar(0)}
                    hitSlop={8}
                  >
                    <Animated.View style={{ transform: [{ scale: starAnims[star - 1] }] }}>
                      <Star
                        size={40}
                        color={star <= displayedStars ? "#F5A623" : colors.border}
                        fill={star <= displayedStars ? "#F5A623" : "transparent"}
                        strokeWidth={1.5}
                      />
                    </Animated.View>
                  </Pressable>
                ))}
              </View>

              {selectedStars > 0 && (
                <Text style={styles.ratingLabel}>
                  {selectedStars === 1 && "We're sorry to hear that"}
                  {selectedStars === 2 && "Thanks for the feedback"}
                  {selectedStars === 3 && "We appreciate your honesty"}
                  {selectedStars === 4 && "We're glad you enjoy it!"}
                  {selectedStars === 5 && "That means everything to us 🙏"}
                </Text>
              )}

              <Pressable
                style={[styles.submitBtn, selectedStars === 0 && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={selectedStars === 0}
              >
                <Text style={styles.submitBtnText}>
                  {selectedStars === 0 ? "Tap a star to rate" : "Submit Review"}
                </Text>
              </Pressable>

              <Pressable onPress={onClose}>
                <Text style={styles.skipText}>Maybe later</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.thankYouWrap}>
              <View style={styles.thankYouIconWrap}>
                <View style={styles.thankYouCircle}>
                  <Text style={styles.thankYouEmoji}>🙏</Text>
                </View>
              </View>
              <Text style={styles.thankYouTitle}>
                {selectedStars >= 4 ? "Thank you so much!" : "Thank you for sharing"}
              </Text>
              <Text style={styles.thankYouDesc}>
                {selectedStars >= 4
                  ? "Taking you to the App Store now…"
                  : "Your feedback helps us grow and serve the community better."}
              </Text>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: "flex-end" as const,
      alignItems: "center" as const,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    sheet: {
      width: "100%",
      backgroundColor: colors.card,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingHorizontal: 28,
      paddingTop: 28,
      paddingBottom: 48,
      alignItems: "center" as const,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 24,
    },
    closeBtn: {
      position: "absolute" as const,
      top: 20,
      right: 20,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.secondary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    iconWrap: {
      marginBottom: 20,
      marginTop: 8,
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderWidth: 2,
      borderColor: colors.primary + "30",
    },
    title: {
      fontSize: 22,
      fontWeight: "800" as const,
      color: colors.foreground,
      textAlign: "center" as const,
      marginBottom: 10,
      letterSpacing: -0.4,
    },
    subtitle: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: "center" as const,
      lineHeight: 21,
      marginBottom: 28,
      paddingHorizontal: 12,
      fontWeight: "500" as const,
    },
    starsRow: {
      flexDirection: "row" as const,
      gap: 12,
      marginBottom: 16,
    },
    ratingLabel: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.primary,
      marginBottom: 24,
      textAlign: "center" as const,
    },
    submitBtn: {
      width: "100%",
      backgroundColor: colors.primary,
      paddingVertical: 17,
      borderRadius: 999,
      alignItems: "center" as const,
      marginBottom: 14,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 12,
      elevation: 6,
    },
    submitBtnDisabled: {
      backgroundColor: colors.muted,
      shadowOpacity: 0,
      elevation: 0,
    },
    submitBtnText: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
    },
    skipText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontWeight: "500" as const,
    },
    thankYouWrap: {
      alignItems: "center" as const,
      paddingVertical: 20,
      gap: 14,
    },
    thankYouIconWrap: {
      marginBottom: 6,
    },
    thankYouCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    thankYouEmoji: {
      fontSize: 36,
    },
    thankYouTitle: {
      fontSize: 22,
      fontWeight: "800" as const,
      color: colors.foreground,
      textAlign: "center" as const,
      letterSpacing: -0.4,
    },
    thankYouDesc: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: "center" as const,
      lineHeight: 21,
      paddingHorizontal: 16,
      fontWeight: "500" as const,
    },
  });
}
