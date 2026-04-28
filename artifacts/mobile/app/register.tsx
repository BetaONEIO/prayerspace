import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Mail, Lock, Eye, EyeOff, User, Check, Calendar } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const LOGO_URI = "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/for3p4uznzmpb3n9cpn1e.png";
const MIN_AGE_YEARS = 13;

function pad2(n: string): string {
  if (!n) return "";
  return n.length === 1 ? `0${n}` : n;
}

function buildIsoDate(day: string, month: string, year: string): string | null {
  if (day.length === 0 || month.length === 0 || year.length !== 4) return null;
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!Number.isFinite(d) || !Number.isFinite(m) || !Number.isFinite(y)) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  if (y < 1900) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  if (dt.getTime() > Date.now()) return null;
  return `${y.toString().padStart(4, "0")}-${pad2(String(m))}-${pad2(String(d))}`;
}

function calculateAge(iso: string): number {
  const [y, m, d] = iso.split("-").map((n) => Number(n));
  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
    age -= 1;
  }
  return age;
}

export default function RegisterScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [dobError, setDobError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const monthRef = useRef<TextInput | null>(null);
  const yearRef = useRef<TextInput | null>(null);

  const handleDayChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 2);
    setDobDay(cleaned);
    setDobError("");
    if (cleaned.length === 2) monthRef.current?.focus();
  }, []);

  const handleMonthChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 2);
    setDobMonth(cleaned);
    setDobError("");
    if (cleaned.length === 2) yearRef.current?.focus();
  }, []);

  const handleYearChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 4);
    setDobYear(cleaned);
    setDobError("");
  }, []);

  const handleSignUp = useCallback(async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }

    const iso = buildIsoDate(dobDay, dobMonth, dobYear);
    if (!iso) {
      setDobError("Please enter a valid date of birth.");
      Alert.alert("Invalid Date of Birth", "Please enter a valid date of birth.");
      return;
    }
    const age = calculateAge(iso);
    if (age < MIN_AGE_YEARS) {
      setDobError(`You must be at least ${MIN_AGE_YEARS} years old to create an account.`);
      Alert.alert(
        "Age Requirement",
        `You must be at least ${MIN_AGE_YEARS} years old to create an account.`
      );
      return;
    }
    if (!agreed) {
      Alert.alert("Terms Required", "Please agree to the Terms of Service.");
      return;
    }

    setIsLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await signUp(normalizedEmail, password, name.trim(), iso);
      console.log("[Register] Sign up successful, redirecting to OTP verification");
      router.replace({ pathname: "/verify-otp", params: { email: normalizedEmail, from: "register" } });
      return;
    } catch (error: unknown) {
      let rawMessage = "";
      if (error instanceof Error) {
        rawMessage = error.message;
      } else if (error && typeof error === "object") {
        const e = error as Record<string, unknown>;
        rawMessage = (e.message as string) || (e.msg as string) || (e.error_description as string) || "";
      }
      const lower = rawMessage.toLowerCase();
      let title = "Registration Failed";
      let message = "Something went wrong. Please try again.";

      if (lower.includes("at least 13") || lower.includes("age requirement")) {
        title = "Age Requirement";
        message = `You must be at least ${MIN_AGE_YEARS} years old to create an account.`;
        setDobError(message);
      } else if (lower.includes("date of birth")) {
        title = "Invalid Date of Birth";
        message = "Please enter a valid date of birth.";
        setDobError(message);
      } else if (lower.includes("rate limit") || lower.includes("too many")) {
        title = "Please Wait";
        message = "Too many sign up attempts. Please wait a few minutes.";
      } else if (lower.includes("already registered") || lower.includes("user already")) {
        title = "Account Exists";
        message = "This email is already registered. Try signing in instead.";
      } else if (lower.includes("invalid email")) {
        title = "Invalid Email";
        message = "Please enter a valid email address.";
      } else if (rawMessage) {
        message = rawMessage;
      }

      Alert.alert(title, message);
    } finally {
      setIsLoading(false);
    }
  }, [name, email, password, dobDay, dobMonth, dobYear, agreed, signUp, router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <AutoScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoArea}>
            <Image source={{ uri: LOGO_URI }} style={styles.logoImage} contentFit="contain" />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join our community of prayer and start sharing your spiritual journey.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrap}>
                <User size={18} color={colors.mutedForeground} />
                <TextInput
                  style={styles.input}
                  placeholder="John Doe"
                  placeholderTextColor={colors.mutedForeground + "90"}
                  value={name}
                  onChangeText={setName}
                  autoComplete="name"
                  testID="register-name"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email address</Text>
              <View style={styles.inputWrap}>
                <Mail size={18} color={colors.mutedForeground} />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.mutedForeground + "90"}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  testID="register-email"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <Lock size={18} color={colors.mutedForeground} />
                <TextInput
                  style={styles.input}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={colors.mutedForeground + "90"}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  testID="register-password"
                  editable={!isLoading}
                />
                <Pressable onPress={() => setShowPassword((p) => !p)}>
                  {showPassword ? (
                    <EyeOff size={18} color={colors.mutedForeground} />
                  ) : (
                    <Eye size={18} color={colors.mutedForeground} />
                  )}
                </Pressable>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Date of birth</Text>
              <View
                style={[
                  styles.inputWrap,
                  styles.dobWrap,
                  dobError ? styles.dobWrapError : undefined,
                ]}
              >
                <Calendar size={18} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, styles.dobSegment]}
                  placeholder="DD"
                  placeholderTextColor={colors.mutedForeground + "90"}
                  value={dobDay}
                  onChangeText={handleDayChange}
                  keyboardType="number-pad"
                  maxLength={2}
                  testID="register-dob-day"
                  editable={!isLoading}
                />
                <Text style={styles.dobSeparator}>/</Text>
                <TextInput
                  ref={monthRef}
                  style={[styles.input, styles.dobSegment]}
                  placeholder="MM"
                  placeholderTextColor={colors.mutedForeground + "90"}
                  value={dobMonth}
                  onChangeText={handleMonthChange}
                  keyboardType="number-pad"
                  maxLength={2}
                  testID="register-dob-month"
                  editable={!isLoading}
                />
                <Text style={styles.dobSeparator}>/</Text>
                <TextInput
                  ref={yearRef}
                  style={[styles.input, styles.dobYear]}
                  placeholder="YYYY"
                  placeholderTextColor={colors.mutedForeground + "90"}
                  value={dobYear}
                  onChangeText={handleYearChange}
                  keyboardType="number-pad"
                  maxLength={4}
                  testID="register-dob-year"
                  editable={!isLoading}
                />
              </View>
              {dobError ? (
                <Text style={styles.dobErrorText} testID="register-dob-error">
                  {dobError}
                </Text>
              ) : (
                <Text style={styles.helperText}>
                  You must be at least {MIN_AGE_YEARS} years old to use Prayer Space.
                </Text>
              )}
            </View>
          </View>

          <Pressable
            style={styles.confirmRow}
            onPress={() => setAgeConfirmed((p) => !p)}
            disabled={isLoading}
            testID="register-age-confirm"
          >
            <View style={[styles.checkbox, ageConfirmed && styles.checkboxChecked]}>
              {ageConfirmed && <Check size={12} color={colors.primaryForeground} strokeWidth={3} />}
            </View>
            <Text style={styles.termsText}>
              I confirm I am {MIN_AGE_YEARS} years or older.
            </Text>
          </Pressable>

          <Pressable
            style={styles.termsRow}
            onPress={() => setAgreed((p) => !p)}
            disabled={isLoading}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <Check size={12} color={colors.primaryForeground} strokeWidth={3} />}
            </View>
            <Text style={styles.termsText}>
              I agree to the{" "}
              <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
              <Text style={styles.termsLink}>Privacy Policy</Text>
            </Text>
          </Pressable>

          <View style={styles.actions}>
            <Pressable
              style={[styles.signUpBtn, isLoading && styles.signUpBtnDisabled]}
              onPress={handleSignUp}
              disabled={isLoading}
              testID="register-submit"
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.signUpBtnText}>Create Account</Text>
              )}
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <GoogleSignInButton
              variant="light"
              onError={(msg) => Alert.alert("Google Sign In Failed", msg)}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => router.push("/login")}>
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
          </View>
        </AutoScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center" as const,
      paddingHorizontal: 28,
      paddingVertical: 32,
    },
    logoArea: {
      alignItems: "center" as const,
      marginBottom: 28,
    },
    logoImage: {
      width: 100,
      height: 100,
      marginBottom: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: "800" as const,
      color: colors.foreground,
      letterSpacing: -0.5,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: "center" as const,
      maxWidth: 280,
      lineHeight: 22,
    },
    form: {
      gap: 16,
      marginBottom: 18,
    },
    field: {
      gap: 8,
    },
    label: {
      fontSize: 13,
      fontWeight: "700" as const,
      color: colors.foreground,
      marginLeft: 4,
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 18,
      paddingHorizontal: 16,
      height: 54,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.foreground,
      padding: 0,
    },
    dobWrap: {
      gap: 8,
    },
    dobWrapError: {
      borderColor: "#D9534F",
    },
    dobSegment: {
      flex: 0,
      width: 36,
      textAlign: "center" as const,
    },
    dobYear: {
      flex: 0,
      width: 64,
      textAlign: "center" as const,
    },
    dobSeparator: {
      fontSize: 15,
      color: colors.mutedForeground,
      fontWeight: "600" as const,
    },
    helperText: {
      fontSize: 12,
      color: colors.mutedForeground,
      marginLeft: 4,
      lineHeight: 18,
    },
    dobErrorText: {
      fontSize: 12,
      color: "#D9534F",
      marginLeft: 4,
      lineHeight: 18,
      fontWeight: "600" as const,
    },
    confirmRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    termsRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 24,
      paddingHorizontal: 4,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginTop: 1,
    },
    checkboxChecked: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    termsText: {
      flex: 1,
      fontSize: 12,
      color: colors.mutedForeground,
      lineHeight: 20,
    },
    termsLink: {
      color: colors.primary,
      fontWeight: "700" as const,
    },
    actions: {
      gap: 16,
    },
    signUpBtn: {
      height: 54,
      backgroundColor: colors.primary,
      borderRadius: 18,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 6,
    },
    signUpBtnDisabled: {
      opacity: 0.7,
    },
    signUpBtnText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
    },
    dividerRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
      letterSpacing: 0.5,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center" as const,
      marginTop: 28,
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
  });
}
