import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, Animated, Keyboard, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";

const LOGO_URI = "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/for3p4uznzmpb3n9cpn1e.png";
const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;
const SCREEN_WIDTH = Dimensions.get("window").width;
const CODE_BOX_SIZE = Math.max(38, Math.min(48, Math.floor((SCREEN_WIDTH - 28 * 2 - 10 * (CODE_LENGTH - 1)) / CODE_LENGTH)));

export default function VerifyOtpScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { email } = useLocalSearchParams<{ email: string }>();

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const sendOtp = useCallback(async () => {
    if (!email) return;
    setIsSending(true);
    setError("");
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (resendError) {
        const msg = (resendError.message ?? "").toLowerCase();
        if (msg.includes("rate limit") || msg.includes("too many") || msg.includes("for security purposes")) {
          setError("Too many requests. Please wait a moment before trying again.");
          startCountdown();
        } else if (msg.includes("already") && msg.includes("confirmed")) {
          setError("This email is already verified. Please sign in.");
        } else if (msg.includes("email not confirmed") || msg.includes("user not found")) {
          setError("We couldn't send the code yet. Please register again and check your email settings.");
        } else {
          setError(resendError.message || "Failed to send code. Please try again.");
        }
      } else {
        startCountdown();
      }
    } catch (err) {
      console.error("[VerifyOtp] sendOtp threw:", err);
      setError("Network error. Please check your connection.");
    } finally {
      setIsSending(false);
    }
  }, [email, startCountdown]);

  useEffect(() => {
    void sendOtp();
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  const triggerShake = useCallback(() => {
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
    if (code.length < CODE_LENGTH) { setError("Please enter the full 6-digit code."); triggerShake(); return; }
    if (!email) { setError("Missing email. Please go back and try again."); triggerShake(); return; }
    setIsVerifying(true);
    setError("");
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "signup",
      });
      if (verifyError) {
        const msg = (verifyError.message ?? "").toLowerCase();
        let userMessage = verifyError.message || "Invalid code. Please try again.";
        if (msg.includes("expired") || msg.includes("invalid")) {
          userMessage = "That code is invalid or expired. Please try again or resend.";
        } else if (msg.includes("rate limit") || msg.includes("too many")) {
          userMessage = "Too many attempts. Please wait a moment and try again.";
        }
        setError(userMessage);
        triggerShake();
        setDigits(Array(CODE_LENGTH).fill(""));
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } else {
        setSuccess(true);
        Animated.spring(successAnim, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }).start();
        Keyboard.dismiss();
        setTimeout(() => router.replace("/"), 1800);
      }
    } catch (err) {
      console.error("[VerifyOtp] verify threw:", err);
      setError("Network error. Please try again.");
      triggerShake();
    } finally {
      setIsVerifying(false);
    }
  }, [digits, email, triggerShake, router, successAnim]);

  useEffect(() => {
    const code = digits.join("");
    if (code.length === CODE_LENGTH && !isVerifying && !success) void handleVerify();
  }, [digits]);

  const maskedEmail = email ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + "*".repeat(Math.min(b.length, 4)) + c) : "";
  const isComplete = digits.every((d) => d !== "");

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        <Pressable style={styles.backBtn} onPress={() => router.replace("/register")}>
          <ArrowLeft size={20} color={colors.foreground} />
        </Pressable>

        <View style={styles.content}>
          <View style={styles.logoWrap}>
            <Image source={{ uri: LOGO_URI }} style={styles.logo} contentFit="contain" />
          </View>

          {!email ? (
            <View style={styles.successContainer}>
              <View style={styles.iconWrap}><Mail size={28} color={colors.primary} /></View>
              <Text style={styles.title}>No email on file</Text>
              <Text style={styles.successSubtitle}>We don't have an email to verify. Please go back and start registration again.</Text>
              <Pressable
                style={[styles.verifyBtn, { marginTop: 24, paddingHorizontal: 24 }]}
                onPress={() => router.replace("/register")}
                testID="otp-back-to-register"
              >
                <Text style={styles.verifyBtnText}>Back to Register</Text>
              </Pressable>
              <Pressable style={{ marginTop: 12, padding: 8 }} onPress={() => router.replace("/login")}>
                <Text style={styles.resendLink}>Sign in instead</Text>
              </Pressable>
            </View>
          ) : success ? (
            <Animated.View style={[styles.successContainer, { opacity: successAnim, transform: [{ scale: successAnim }] }]}>
              <View style={styles.successIcon}><CheckCircle size={48} color={colors.primary} /></View>
              <Text style={styles.successTitle}>Email Verified!</Text>
              <Text style={styles.successSubtitle}>Your account is confirmed. Taking you in…</Text>
            </Animated.View>
          ) : (
            <>
              <View style={styles.headerArea}>
                <View style={styles.iconWrap}><Mail size={28} color={colors.primary} /></View>
                <Text style={styles.title}>Check your email</Text>
                <Text style={styles.subtitle}>We sent a 6-digit code to</Text>
                <Text style={styles.emailText}>{maskedEmail}</Text>
              </View>

              <Animated.View style={[styles.codeArea, { transform: [{ translateX: shakeAnim }] }]}>
                <View style={styles.codeRow}>
                  {Array(CODE_LENGTH).fill(null).map((_, i) => (
                    <View key={i} style={[styles.digitBox, digits[i] ? styles.digitBoxFilled : undefined, error ? styles.digitBoxError : undefined]}>
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
                        editable={!isVerifying && !success}
                        caretHidden
                        testID={`otp-digit-${i}`}
                      />
                    </View>
                  ))}
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </Animated.View>

              <Pressable style={[styles.verifyBtn, (!isComplete || isVerifying) && styles.verifyBtnDisabled]} onPress={handleVerify} disabled={!isComplete || isVerifying} testID="otp-verify-btn">
                {isVerifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyBtnText}>Verify Email</Text>}
              </Pressable>

              <View style={styles.resendRow}>
                {isSending ? <ActivityIndicator size="small" color={colors.mutedForeground} />
                  : countdown > 0 ? <Text style={styles.resendCountdown}>Resend code in <Text style={styles.resendCountdownBold}>{countdown}s</Text></Text>
                  : <Pressable onPress={sendOtp} testID="otp-resend-btn"><Text style={styles.resendLink}>Resend code</Text></Pressable>}
              </View>
              <Text style={styles.spamNote}>Can't find it? Check your spam or junk folder.</Text>
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    safeArea: { flex: 1 },
    backBtn: { width: 40, height: 40, marginTop: 8, marginLeft: 16, alignItems: "center" as const, justifyContent: "center" as const },
    content: { flex: 1, paddingHorizontal: 28, paddingTop: 16, paddingBottom: 32 },
    logoWrap: { alignItems: "center" as const, marginBottom: 24 },
    logo: { width: 72, height: 72 },
    headerArea: { alignItems: "center" as const, marginBottom: 36 },
    iconWrap: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.accent, alignItems: "center" as const, justifyContent: "center" as const, marginBottom: 20, borderWidth: 1.5, borderColor: colors.primary + "30" },
    title: { fontSize: 26, fontWeight: "800" as const, color: colors.foreground, letterSpacing: -0.5, marginBottom: 10 },
    subtitle: { fontSize: 14, color: colors.mutedForeground, textAlign: "center" as const, lineHeight: 21 },
    emailText: { fontSize: 14, fontWeight: "700" as const, color: colors.foreground, marginTop: 4 },
    codeArea: { alignItems: "center" as const, marginBottom: 28 },
    codeRow: { flexDirection: "row", gap: 8, marginBottom: 14, justifyContent: "center" as const, flexWrap: "nowrap" as const },
    digitBox: { width: CODE_BOX_SIZE, height: 58, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, alignItems: "center" as const, justifyContent: "center" as const },
    digitBoxFilled: { borderColor: colors.primary, backgroundColor: colors.accent },
    digitBoxError: { borderColor: "#D9534F", backgroundColor: "#FEF0EF" },
    digitInput: { fontSize: 24, fontWeight: "800" as const, color: colors.foreground, textAlign: "center" as const, width: "100%" as const, height: "100%" as const, padding: 0 },
    errorText: { fontSize: 13, color: "#D9534F", textAlign: "center" as const, fontWeight: "600" as const },
    verifyBtn: { height: 54, backgroundColor: colors.primary, borderRadius: 18, alignItems: "center" as const, justifyContent: "center" as const, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 6, marginBottom: 20 },
    verifyBtnDisabled: { opacity: 0.5 },
    verifyBtnText: { fontSize: 16, fontWeight: "700" as const, color: colors.primaryForeground },
    resendRow: { alignItems: "center" as const, height: 28, justifyContent: "center" as const, marginBottom: 12 },
    resendCountdown: { fontSize: 13, color: colors.mutedForeground },
    resendCountdownBold: { fontWeight: "700" as const, color: colors.foreground },
    resendLink: { fontSize: 13, fontWeight: "700" as const, color: colors.primary },
    spamNote: { fontSize: 12, color: colors.mutedForeground, textAlign: "center" as const, marginTop: 8 },
    successContainer: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, paddingBottom: 60 },
    successIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.accent, alignItems: "center" as const, justifyContent: "center" as const, marginBottom: 24, borderWidth: 1.5, borderColor: colors.primary + "40" },
    successTitle: { fontSize: 28, fontWeight: "800" as const, color: colors.foreground, letterSpacing: -0.5, marginBottom: 12 },
    successSubtitle: { fontSize: 15, color: colors.mutedForeground, textAlign: "center" as const, lineHeight: 22, maxWidth: 260 },
  });
}
