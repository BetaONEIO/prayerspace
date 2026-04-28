import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import * as StoreReview from "expo-store-review";
import * as Haptics from "expo-haptics";
import { X, ArrowLeft, Send } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { markAsRated } from "@/hooks/useReviewPrompt";

interface SmartRatingModalProps {
  visible: boolean;
  onClose: () => void;
  onRated: () => void;
}

type Step = "ask" | "feedback" | "thanks_review" | "thanks_feedback";

export default function SmartRatingModal({ visible, onClose, onRated }: SmartRatingModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [step, setStep] = useState<Step>("ask");
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(320)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;
  const iconBounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep("ask");
      setFeedbackText("");
      setSubmitting(false);
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(sheetAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 65, friction: 11, useNativeDriver: true }),
      ]).start(() => {
        Animated.sequence([
          Animated.spring(iconBounce, { toValue: -10, tension: 200, friction: 6, useNativeDriver: true }),
          Animated.spring(iconBounce, { toValue: 0, tension: 200, friction: 7, useNativeDriver: true }),
        ]).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(sheetAnim, { toValue: 320, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, backdropAnim, sheetAnim, scaleAnim, iconBounce]);

  const handleYes = useCallback(async () => {
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await markAsRated();
    onRated();
    setStep("thanks_review");
    setTimeout(async () => {
      try {
        const isAvailable = await StoreReview.isAvailableAsync();
        if (isAvailable) {
          await StoreReview.requestReview();
        }
      } catch (e) {
        console.log("[SmartRating] Store review error:", e);
      }
      setTimeout(() => onClose(), 1600);
    }, 900);
  }, [onRated, onClose]);

  const handleNotReally = useCallback(async () => {
    if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("feedback");
  }, []);

  const handleSubmitFeedback = useCallback(async () => {
    if (!feedbackText.trim()) return;
    if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubmitting(true);
    console.log("[SmartRating] Feedback submitted:", feedbackText.trim());
    setStep("thanks_feedback");
    setTimeout(() => onClose(), 2200);
  }, [feedbackText, onClose]);

  const handleSkipFeedback = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.root}>
          <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          </Animated.View>

          <Animated.View
            style={[
              styles.sheet,
              { transform: [{ translateY: sheetAnim }, { scale: scaleAnim }] },
            ]}
          >
            {step === "ask" && (
              <>
                <Pressable style={styles.closeBtn} onPress={onClose}>
                  <X size={16} color={colors.mutedForeground} />
                </Pressable>

                <Animated.View style={[styles.iconWrap, { transform: [{ translateY: iconBounce }] }]}>
                  <View style={styles.iconCircle}>
                    <Text style={styles.iconEmoji}>🙏</Text>
                  </View>
                </Animated.View>

                <Text style={styles.title}>Are you enjoying{"\n"}Prayer Space?</Text>
                <Text style={styles.subtitle}>
                  Your experience matters to us and to the community.
                </Text>

                <View style={styles.choiceRow}>
                  <Pressable style={[styles.choiceBtn, styles.choiceBtnYes]} onPress={handleYes}>
                    <Text style={styles.choiceBtnYesText}>Yes 🙏</Text>
                  </Pressable>
                  <Pressable style={[styles.choiceBtn, styles.choiceBtnNo]} onPress={handleNotReally}>
                    <Text style={styles.choiceBtnNoText}>Not really</Text>
                  </Pressable>
                </View>

                <Pressable onPress={onClose} style={styles.laterBtn}>
                  <Text style={styles.laterText}>Maybe later</Text>
                </Pressable>
              </>
            )}

            {step === "feedback" && (
              <>
                <Pressable style={styles.backBtn} onPress={() => setStep("ask")}>
                  <ArrowLeft size={18} color={colors.foreground} />
                </Pressable>
                <Pressable style={styles.closeBtn} onPress={onClose}>
                  <X size={16} color={colors.mutedForeground} />
                </Pressable>

                <View style={styles.iconWrap}>
                  <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
                    <Text style={styles.iconEmoji}>💬</Text>
                  </View>
                </View>

                <Text style={styles.title}>We'd love to know more</Text>
                <Text style={styles.subtitle}>
                  Share privately what we could do better — your feedback goes straight to the team.
                </Text>

                <View style={[styles.feedbackInputWrap, { borderColor: colors.border, backgroundColor: colors.secondary }]}>
                  <TextInput
                    style={[styles.feedbackInput, { color: colors.foreground }]}
                    placeholder="What could we improve?"
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                    value={feedbackText}
                    onChangeText={setFeedbackText}
                    autoFocus
                  />
                </View>

                <Pressable
                  style={[
                    styles.submitBtn,
                    (!feedbackText.trim() || submitting) && styles.submitBtnDisabled,
                  ]}
                  onPress={handleSubmitFeedback}
                  disabled={!feedbackText.trim() || submitting}
                >
                  <Send size={15} color={colors.primaryForeground} />
                  <Text style={styles.submitBtnText}>Send Feedback</Text>
                </Pressable>

                <Pressable onPress={handleSkipFeedback} style={styles.laterBtn}>
                  <Text style={styles.laterText}>Skip</Text>
                </Pressable>
              </>
            )}

            {step === "thanks_review" && (
              <View style={styles.thanksWrap}>
                <View style={[styles.iconCircle, { backgroundColor: colors.accent }]}>
                  <Text style={styles.iconEmoji}>🙌</Text>
                </View>
                <Text style={styles.thanksTitle}>Thank you so much!</Text>
                <Text style={styles.thanksDesc}>
                  Opening the App Store so you can share your experience…
                </Text>
              </View>
            )}

            {step === "thanks_feedback" && (
              <View style={styles.thanksWrap}>
                <View style={[styles.iconCircle, { backgroundColor: colors.accent }]}>
                  <Text style={styles.iconEmoji}>🙏</Text>
                </View>
                <Text style={styles.thanksTitle}>Thank you for sharing</Text>
                <Text style={styles.thanksDesc}>
                  Your feedback helps us serve the community better.
                </Text>
              </View>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
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
      paddingTop: 32,
      paddingBottom: 48,
      alignItems: "center" as const,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.14,
      shadowRadius: 28,
      elevation: 28,
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
    backBtn: {
      position: "absolute" as const,
      top: 20,
      left: 20,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.secondary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    iconWrap: {
      marginBottom: 22,
      marginTop: 8,
    },
    iconCircle: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: colors.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderWidth: 2,
      borderColor: colors.primary + "20",
    },
    iconEmoji: {
      fontSize: 34,
    },
    title: {
      fontSize: 23,
      fontWeight: "800" as const,
      color: colors.foreground,
      textAlign: "center" as const,
      marginBottom: 10,
      letterSpacing: -0.5,
      lineHeight: 30,
    },
    subtitle: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: "center" as const,
      lineHeight: 21,
      marginBottom: 30,
      paddingHorizontal: 10,
      fontWeight: "500" as const,
    },
    choiceRow: {
      flexDirection: "row" as const,
      gap: 12,
      width: "100%",
      marginBottom: 14,
    },
    choiceBtn: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 999,
      alignItems: "center" as const,
    },
    choiceBtnYes: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 12,
      elevation: 6,
    },
    choiceBtnYesText: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
    },
    choiceBtnNo: {
      backgroundColor: colors.secondary,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    choiceBtnNoText: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    laterBtn: {
      marginTop: 2,
      padding: 8,
    },
    laterText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontWeight: "500" as const,
    },
    feedbackInputWrap: {
      width: "100%",
      borderWidth: 1.5,
      borderRadius: 16,
      padding: 14,
      marginBottom: 20,
      minHeight: 110,
    },
    feedbackInput: {
      fontSize: 14,
      lineHeight: 21,
      textAlignVertical: "top" as const,
      minHeight: 80,
    },
    submitBtn: {
      width: "100%",
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 999,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      flexDirection: "row" as const,
      gap: 8,
      marginBottom: 10,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.26,
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
    thanksWrap: {
      alignItems: "center" as const,
      paddingVertical: 12,
      gap: 16,
    },
    thanksTitle: {
      fontSize: 22,
      fontWeight: "800" as const,
      color: colors.foreground,
      textAlign: "center" as const,
      letterSpacing: -0.4,
    },
    thanksDesc: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: "center" as const,
      lineHeight: 21,
      paddingHorizontal: 16,
      fontWeight: "500" as const,
    },
  });
}
