import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft, Mail, CheckCircle, ArrowRight } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { getAppUrl } from "@/lib/getAppUrl";

type ScreenState = "input" | "success";

export default function PasswordResetScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>("input");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const errorShake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (screenState === "success") {
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [screenState]);

  const shakeError = useCallback(() => {
    Animated.sequence([
      Animated.timing(errorShake, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 5, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: -5, duration: 60, useNativeDriver: true }),
      Animated.timing(errorShake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [errorShake]);

  const handleReset = useCallback(async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Please enter your email address.");
      shakeError();
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setError("Please enter a valid email address.");
      shakeError();
      return;
    }

    setIsLoading(true);
    setError(null);
    console.log("[PasswordReset] Sending reset email to:", trimmed);

    try {
      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${getAppUrl()}/login`,
      });

      if (supabaseError) {
        console.error("[PasswordReset] Error:", supabaseError.message);
        setError(supabaseError.message || "Something went wrong. Please try again.");
        shakeError();
        return;
      }

      console.log("[PasswordReset] Reset email sent successfully");
      setScreenState("success");
    } catch (err) {
      console.error("[PasswordReset] Unexpected error:", err);
      setError("Something went wrong. Please try again.");
      shakeError();
    } finally {
      setIsLoading(false);
    }
  }, [email, shakeError]);

  if (screenState === "success") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.successContainer, { opacity: successOpacity, transform: [{ scale: successScale }] }]}>
          <View style={styles.successIconWrap}>
            <CheckCircle size={48} color={colors.primary} />
          </View>
          <Text style={styles.successTitle}>Check Your Inbox</Text>
          <Text style={styles.successMessage}>
            We've sent a password reset link to{"\n"}
            <Text style={styles.successEmail}>{email.trim().toLowerCase()}</Text>
          </Text>
          <Text style={styles.successHint}>
            Didn't receive it? Check your spam folder or try again with a different email.
          </Text>

          <Pressable style={styles.backToLoginBtn} onPress={() => router.push("/login")}>
            <Text style={styles.backToLoginBtnText}>Back to Sign In</Text>
            <ArrowRight size={18} color={colors.primaryForeground} />
          </Pressable>

          <Pressable
            style={styles.resendLink}
            onPress={() => {
              successScale.setValue(0);
              successOpacity.setValue(0);
              setScreenState("input");
            }}
          >
            <Text style={styles.resendLinkText}>Try a different email</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Animated.View style={[styles.flex, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} testID="password-reset-back">
            <ChevronLeft size={20} color={colors.secondaryForeground} />
          </Pressable>

          <View style={styles.content}>
            <View style={styles.iconWrap}>
              <Mail size={28} color={colors.primary} />
            </View>

            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              No worries. Enter the email address linked to your account and we'll send you a reset link.
            </Text>

            <Animated.View style={[styles.field, { transform: [{ translateX: errorShake }] }]}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <View style={[styles.inputWrap, error ? styles.inputWrapError : null]}>
                <Mail size={18} color={error ? "#D9534F" : colors.mutedForeground} />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.mutedForeground + "80"}
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(null); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoFocus
                  editable={!isLoading}
                  testID="password-reset-email"
                  onSubmitEditing={handleReset}
                  returnKeyType="send"
                />
              </View>
              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}
            </Animated.View>

            <Pressable
              style={[styles.resetBtn, isLoading && styles.resetBtnDisabled]}
              onPress={handleReset}
              disabled={isLoading}
              testID="password-reset-submit"
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <>
                  <Text style={styles.resetBtnText}>Send Reset Link</Text>
                  <ArrowRight size={18} color={colors.primaryForeground} />
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Remembered your password? </Text>
            <Pressable onPress={() => router.push("/login")}>
              <Text style={styles.footerLink}>Sign In</Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    flex: {
      flex: 1,
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
      width: 68,
      height: 68,
      borderRadius: 22,
      backgroundColor: colors.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: 28,
      fontWeight: "800" as const,
      color: colors.foreground,
      letterSpacing: -0.5,
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 15,
      color: colors.mutedForeground,
      lineHeight: 24,
      marginBottom: 40,
      maxWidth: 320,
    },
    field: {
      gap: 10,
      marginBottom: 24,
    },
    label: {
      fontSize: 10,
      fontWeight: "700" as const,
      color: colors.mutedForeground,
      letterSpacing: 1.5,
      paddingHorizontal: 4,
    },
    inputWrap: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 18,
      paddingHorizontal: 18,
      height: 56,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    inputWrapError: {
      borderColor: "#D9534F",
      backgroundColor: "#FEF0EF",
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.foreground,
      padding: 0,
    },
    errorText: {
      fontSize: 12,
      color: "#D9534F",
      fontWeight: "600" as const,
      paddingHorizontal: 4,
    },
    resetBtn: {
      height: 56,
      backgroundColor: colors.primary,
      borderRadius: 18,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 6,
    },
    resetBtnDisabled: {
      opacity: 0.65,
    },
    resetBtnText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
    },
    footer: {
      flexDirection: "row" as const,
      justifyContent: "center" as const,
      paddingBottom: 8,
    },
    footerText: {
      fontSize: 14,
      color: colors.mutedForeground,
    },
    footerLink: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: colors.primary,
    },
    successContainer: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingHorizontal: 8,
      paddingBottom: 40,
    },
    successIconWrap: {
      width: 96,
      height: 96,
      borderRadius: 32,
      backgroundColor: colors.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: 28,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    successTitle: {
      fontSize: 28,
      fontWeight: "800" as const,
      color: colors.foreground,
      letterSpacing: -0.5,
      marginBottom: 14,
      textAlign: "center" as const,
    },
    successMessage: {
      fontSize: 15,
      color: colors.mutedForeground,
      textAlign: "center" as const,
      lineHeight: 24,
      marginBottom: 16,
    },
    successEmail: {
      fontWeight: "700" as const,
      color: colors.foreground,
    },
    successHint: {
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: "center" as const,
      lineHeight: 20,
      marginBottom: 40,
      maxWidth: 300,
    },
    backToLoginBtn: {
      height: 56,
      backgroundColor: colors.primary,
      borderRadius: 18,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 8,
      width: "100%" as const,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 6,
      marginBottom: 16,
    },
    backToLoginBtnText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
    },
    resendLink: {
      paddingVertical: 10,
    },
    resendLinkText: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
    },
  });
}
