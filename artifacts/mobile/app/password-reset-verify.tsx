import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { AutoScrollView } from "@/components/AutoScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import * as Haptics from "expo-haptics";

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CODE_BOX_SIZE = Math.max(44, Math.min(56, Math.floor((SCREEN_WIDTH - 28 * 2 - 10 * (CODE_LENGTH - 1)) / CODE_LENGTH)));

export default function PasswordResetVerifyScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { email } = useLocalSearchParams<{ email: string }>();

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [error, setError] = useState("");

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 340, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
    ]).start();

    // Start countdown immediately — email was just sent by previous screen
    startCountdown();
    // Focus first box
    setTimeout(() => inputRefs.current[0]?.focus(), 400);

    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  const startCountdown = useCallback(() => {
    setCountdown(RESEND_COOLDOWN);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { if (countdownRef.current) clearInterval(countdownRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  }, []);

  const triggerShake = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleDigitChange = useCallback((text: string, index: number) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    if (cleaned.length > 1) {
      // Handle paste
      const pasted = cleaned.slice(0, CODE_LENGTH).split("");
      const newDigits = [...digits];
      pasted.forEach((d, i) => { if (index + i < CODE_LENGTH) newDigits[index + i] = d; });
      setDigits(newDigits);
      inputRefs.current[Math.min(index + pasted.length, CODE_LENGTH - 1)]?.focus();
      return;
    }
    const newDigits = [...digits];
    newDigits[index] = cleaned;
    setDigits(newDigits);
    if (cleaned && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }, [digits]);

  const handleKeyPress = useCallback((key: string, index: number) => {
    if (key === "Backspace" && !digits[index] && index > 0) {
      const newDigits = [...digits];
      newDigits[index - 1] = "";
      setDigits(newDigits);
      inputRefs.current[index - 1]?.focus();
    }
  }, [digits]);

  const handleVerify = useCallback(async () => {
    const code = digits.join("");
    if (code.length < CODE_LENGTH) {
      setError(`Please enter the full ${CODE_LENGTH}-digit code.`);
      triggerShake();
      return;
    }
    if (!email) {
      setError("Missing email. Please go back and try again.");
      triggerShake();
      return;
    }
    setIsVerifying(true);
    setError("");
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "recovery",
      });
      if (verifyError) {
        const msg = (verifyError.message ?? "").toLowerCase();
        let userMsg = "Invalid code. Please try again.";
        if (msg.includes("expired") || msg.includes("invalid")) {
          userMsg = "That code is invalid or expired. Request a new one below.";
        } else if (msg.includes("rate limit") || msg.includes("too many")) {
          userMsg = "Too many attempts. Please wait a moment and try again.";
        }
        setError(userMsg);
        triggerShake();
        setDigits(Array(CODE_LENGTH).fill(""));
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Keyboard.dismiss();
        router.replace({
          pathname: "/password-reset-new",
          params: { email },
        } as never);
      }
    } catch {
      setError("Network error. Please try again.");
      triggerShake();
    } finally {
      setIsVerifying(false);
    }
  }, [digits, email, triggerShake, router]);

  // Auto-submit when all digits filled
  useEffect(() => {
    const code = digits.join("");
    if (code.length === CODE_LENGTH && !isVerifying) void handleVerify();
  }, [digits]);

  const handleResend = useCallback(async () => {
    if (!email || countdown > 0 || isSending) return;
    setIsSending(true);
    setError("");
    try {
      const { error: resendError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: undefined,
      });
      if (resendError) {
        const msg = (resendError.message ?? "").toLowerCase();
        if (msg.includes("rate limit") || msg.includes("too many") || msg.includes("for security")) {
          setError("Too many requests. Please wait before trying again.");
        } else {
          setError(resendError.message || "Failed to resend. Please try again.");
        }
      } else {
        startCountdown();
        setDigits(Array(CODE_LENGTH).fill(""));
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsSending(false);
    }
  }, [email, countdown, isSending, startCountdown]);

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + "*".repeat(Math.min(b.length, 4)) + c)
    : "";
  const isComplete = digits.every((d) => d !== "");

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <AutoScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Pressable style={styles.backBtn} onPress={() => router.back()} testID="pr-verify-back">
              <ArrowLeft size={20} color={colors.foreground} />
            </Pressable>

            {/* Icon */}
            <View style={styles.iconWrap}>
              <Mail size={28} color={colors.primary} />
            </View>

            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>
              We sent a {CODE_LENGTH}-digit code to
            </Text>
            <Text style={styles.emailText}>{maskedEmail}</Text>
            <Text style={styles.hint}>Enter the code below to continue.</Text>

            {/* Code boxes */}
            <Animated.View style={[styles.codeArea, { transform: [{ translateX: shakeAnim }] }]}>
              <View style={styles.codeRow}>
                {Array(CODE_LENGTH).fill(null).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.digitBox,
                      digits[i] ? styles.digitBoxFilled : undefined,
                      error ? styles.digitBoxError : undefined,
                    ]}
                  >
                    <TextInput
                      ref={(ref) => { inputRefs.current[i] = ref; }}
                      style={styles.digitInput}
                      value={digits[i]}
                      onChangeText={(t) => handleDigitChange(t, i)}
                      onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                      keyboardType="number-pad"
                      maxLength={1}
                      textContentType="oneTimeCode"
                      autoComplete="one-time-code"
                      selectTextOnFocus
                      editable={!isVerifying}
                      caretHidden
                      testID={`pr-digit-${i}`}
                    />
                  </View>
                ))}
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </Animated.View>

            {/* Verify button */}
            <Pressable
              style={[styles.verifyBtn, (!isComplete || isVerifying) && styles.verifyBtnDisabled]}
              onPress={handleVerify}
              disabled={!isComplete || isVerifying}
              testID="pr-verify-btn"
            >
              {isVerifying ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <>
                  <ShieldCheck size={18} color={colors.primaryForeground} />
                  <Text style={styles.verifyBtnText}>Verify Code</Text>
                </>
              )}
            </Pressable>

            {/* Resend */}
            <View style={styles.resendRow}>
              {isSending ? (
                <ActivityIndicator size="small" color={colors.mutedForeground} />
              ) : countdown > 0 ? (
                <Text style={styles.resendCountdown}>
                  Resend code in <Text style={styles.resendBold}>{countdown}s</Text>
                </Text>
              ) : (
                <Pressable onPress={handleResend} testID="pr-resend-btn">
                  <Text style={styles.resendLink}>Resend code</Text>
                </Pressable>
              )}
            </View>
            <Text style={styles.spamNote}>Can't find it? Check your spam or junk folder.</Text>
          </Animated.View>
        </AutoScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 28,
      paddingTop: 8,
      paddingBottom: 40,
    },
    backBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.secondary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginTop: 8,
      marginBottom: 36,
    },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: 24,
      backgroundColor: colors.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: 24,
      borderWidth: 1.5,
      borderColor: colors.primary + "30",
    },
    title: {
      fontSize: 28,
      fontWeight: "800" as const,
      color: colors.foreground,
      letterSpacing: -0.5,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 15,
      color: colors.mutedForeground,
      lineHeight: 22,
    },
    emailText: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.foreground,
      marginTop: 2,
      marginBottom: 6,
    },
    hint: {
      fontSize: 14,
      color: colors.mutedForeground,
      marginBottom: 36,
    },
    codeArea: {
      alignItems: "center" as const,
      marginBottom: 28,
    },
    codeRow: {
      flexDirection: "row" as const,
      gap: 10,
      marginBottom: 14,
      justifyContent: "center" as const,
    },
    digitBox: {
      width: CODE_BOX_SIZE,
      height: CODE_BOX_SIZE + 12,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    digitBoxFilled: {
      borderColor: colors.primary,
      backgroundColor: colors.accent,
    },
    digitBoxError: {
      borderColor: "#D9534F",
      backgroundColor: "#FEF0EF",
    },
    digitInput: {
      fontSize: 26,
      fontWeight: "800" as const,
      color: colors.foreground,
      textAlign: "center" as const,
      width: "100%" as const,
      height: "100%" as const,
      padding: 0,
    },
    errorText: {
      fontSize: 13,
      color: "#D9534F",
      textAlign: "center" as const,
      fontWeight: "600" as const,
    },
    verifyBtn: {
      height: 56,
      backgroundColor: colors.primary,
      borderRadius: 18,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.28,
      shadowRadius: 16,
      elevation: 6,
      marginBottom: 24,
    },
    verifyBtnDisabled: { opacity: 0.5 },
    verifyBtnText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
    },
    resendRow: {
      alignItems: "center" as const,
      height: 28,
      justifyContent: "center" as const,
      marginBottom: 12,
    },
    resendCountdown: {
      fontSize: 13,
      color: colors.mutedForeground,
    },
    resendBold: {
      fontWeight: "700" as const,
      color: colors.foreground,
    },
    resendLink: {
      fontSize: 13,
      fontWeight: "700" as const,
      color: colors.primary,
    },
    spamNote: {
      fontSize: 12,
      color: colors.mutedForeground,
      textAlign: "center" as const,
      marginTop: 4,
    },
  });
}
