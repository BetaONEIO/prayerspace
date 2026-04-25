import React, { useState, useCallback, useMemo } from "react";
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
import { Mail, Lock, Eye, EyeOff, User, Check } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const LOGO_URI = "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/for3p4uznzmpb3n9cpn1e.png";

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
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = useCallback(async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }
    if (!agreed) {
      Alert.alert("Terms Required", "Please agree to the Terms of Service.");
      return;
    }
    setIsLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await signUp(normalizedEmail, password, name.trim());
      console.log("[Register] Sign up successful, redirecting to OTP verification");
      router.replace({ pathname: "/verify-otp", params: { email: normalizedEmail } });
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

      if (lower.includes("rate limit") || lower.includes("too many")) {
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
  }, [name, email, password, agreed, signUp, router]);

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
          </View>

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
