import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { AutoScrollView } from "@/components/AutoScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle, ArrowRight } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import * as Haptics from "expo-haptics";

export default function PasswordResetNewScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const successScale = useRef(new Animated.Value(0.7)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 340, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (done) {
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
        Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [done]);

  const triggerShake = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleSave = useCallback(async () => {
    const pw = password.trim();
    const cf = confirm.trim();

    if (!pw) {
      setError("Please enter a new password.");
      triggerShake();
      return;
    }
    if (pw.length < 8) {
      setError("Password must be at least 8 characters.");
      triggerShake();
      return;
    }
    if (pw !== cf) {
      setError("Passwords don't match. Please check and try again.");
      triggerShake();
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: pw });
      if (updateError) {
        setError(updateError.message || "Something went wrong. Please try again.");
        triggerShake();
      } else {
        if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setDone(true);
        // Auto-redirect to login after 2.5 seconds
        setTimeout(() => router.replace("/login"), 2500);
      }
    } catch {
      setError("Network error. Please try again.");
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  }, [password, confirm, triggerShake, router]);

  if (done) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <Animated.View style={[styles.successContainer, { opacity: successOpacity, transform: [{ scale: successScale }] }]}>
          <View style={styles.successIconWrap}>
            <CheckCircle size={52} color={colors.primary} />
          </View>
          <Text style={styles.successTitle}>Password Updated!</Text>
          <Text style={styles.successSub}>
            Your password has been changed successfully. You can now sign in with your new password.
          </Text>
          <Pressable
            style={styles.signInBtn}
            onPress={() => router.replace("/login")}
            testID="pr-new-sign-in"
          >
            <Text style={styles.signInBtnText}>Sign In</Text>
            <ArrowRight size={18} color={colors.primaryForeground} />
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <AutoScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Pressable style={styles.backBtn} onPress={() => router.back()} testID="pr-new-back">
              <ArrowLeft size={20} color={colors.foreground} />
            </Pressable>

            {/* Icon */}
            <View style={styles.iconWrap}>
              <Lock size={28} color={colors.primary} />
            </View>

            <Text style={styles.title}>Create new password</Text>
            <Text style={styles.subtitle}>
              Choose a strong password for your account. You'll use it next time you sign in.
            </Text>

            <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
              {/* New password field */}
              <View style={styles.field}>
                <Text style={styles.label}>NEW PASSWORD</Text>
                <View style={[styles.inputWrap, error && styles.inputWrapError]}>
                  <Lock size={18} color={error ? "#D9534F" : colors.mutedForeground} />
                  <TextInput
                    style={styles.input}
                    placeholder="At least 8 characters"
                    placeholderTextColor={colors.mutedForeground + "80"}
                    value={password}
                    onChangeText={(t) => { setPassword(t); setError(null); }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    textContentType="newPassword"
                    returnKeyType="next"
                    editable={!isLoading}
                    testID="pr-new-password"
                  />
                  <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    {showPassword ? <EyeOff size={18} color={colors.mutedForeground} /> : <Eye size={18} color={colors.mutedForeground} />}
                  </Pressable>
                </View>
              </View>

              {/* Confirm password field */}
              <View style={styles.field}>
                <Text style={styles.label}>CONFIRM PASSWORD</Text>
                <View style={[styles.inputWrap, error && styles.inputWrapError]}>
                  <Lock size={18} color={error ? "#D9534F" : colors.mutedForeground} />
                  <TextInput
                    style={styles.input}
                    placeholder="Repeat your password"
                    placeholderTextColor={colors.mutedForeground + "80"}
                    value={confirm}
                    onChangeText={(t) => { setConfirm(t); setError(null); }}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    textContentType="newPassword"
                    returnKeyType="done"
                    onSubmitEditing={handleSave}
                    editable={!isLoading}
                    testID="pr-confirm-password"
                  />
                  <Pressable onPress={() => setShowConfirm((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    {showConfirm ? <EyeOff size={18} color={colors.mutedForeground} /> : <Eye size={18} color={colors.mutedForeground} />}
                  </Pressable>
                </View>
                {error && <Text style={styles.errorText}>{error}</Text>}
              </View>
            </Animated.View>

            {/* Strength hint */}
            <View style={styles.hintBox}>
              <Text style={styles.hintText}>
                Use at least 8 characters including a mix of letters, numbers, and symbols.
              </Text>
            </View>

            {/* Save button */}
            <Pressable
              style={[styles.saveBtn, isLoading && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isLoading}
              testID="pr-new-save"
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.saveBtnText}>Save New Password</Text>
              )}
            </Pressable>
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
      paddingHorizontal: 24,
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
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 15,
      color: colors.mutedForeground,
      lineHeight: 23,
      marginBottom: 32,
      maxWidth: 320,
    },
    field: {
      gap: 8,
      marginBottom: 18,
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
    hintBox: {
      backgroundColor: colors.secondary,
      borderRadius: 14,
      padding: 14,
      marginBottom: 28,
      borderWidth: 1,
      borderColor: colors.border,
    },
    hintText: {
      fontSize: 12,
      color: colors.mutedForeground,
      lineHeight: 18,
    },
    saveBtn: {
      height: 56,
      backgroundColor: colors.primary,
      borderRadius: 18,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.28,
      shadowRadius: 16,
      elevation: 6,
    },
    saveBtnDisabled: { opacity: 0.65 },
    saveBtnText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
    },

    // Success state
    successContainer: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingHorizontal: 32,
      paddingBottom: 40,
    },
    successIconWrap: {
      width: 104,
      height: 104,
      borderRadius: 36,
      backgroundColor: colors.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: 32,
      borderWidth: 1.5,
      borderColor: colors.primary + "30",
    },
    successTitle: {
      fontSize: 30,
      fontWeight: "800" as const,
      color: colors.foreground,
      letterSpacing: -0.5,
      marginBottom: 14,
      textAlign: "center" as const,
    },
    successSub: {
      fontSize: 15,
      color: colors.mutedForeground,
      textAlign: "center" as const,
      lineHeight: 23,
      maxWidth: 300,
      marginBottom: 40,
    },
    signInBtn: {
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
    },
    signInBtnText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
    },
  });
}
