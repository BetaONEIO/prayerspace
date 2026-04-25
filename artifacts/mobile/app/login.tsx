import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions,
} from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Mail, Lock, Eye, EyeOff, AlertTriangle, ShieldAlert } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { LightColors as Colors } from "@/constants/colors";
import { ThemeColors } from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { Video, ResizeMode } from "expo-av";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const LOGO_URI = "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/for3p4uznzmpb3n9cpn1e.png";
const VIDEO_URI = "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/uzu7dkckawvvxop6q6j2w.mp4";

interface ErrorModalState {
  visible: boolean;
  title: string;
  message: string;
  type: "error" | "warning";
}

export default function LoginScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorModal, setErrorModal] = useState<ErrorModalState>({
    visible: false,
    title: "",
    message: "",
    type: "error",
  });

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (errorModal.visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 65,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [errorModal.visible]);

  const showError = useCallback((title: string, message: string, type: "error" | "warning" = "error") => {
    setErrorModal({ visible: true, title, message, type });
  }, []);

  const hideError = useCallback(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 150, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => setErrorModal(prev => ({ ...prev, visible: false })));
  }, [scaleAnim, opacityAnim]);

  const handleSignIn = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      showError("Missing Fields", "Please enter your email and password.", "warning");
      return;
    }
    setIsLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await signIn(normalizedEmail, password);
      console.log("[Login] Sign in successful");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Please check your credentials.";
      const lower = message.toLowerCase();
      if (lower.includes("email not confirmed") || lower.includes("not confirmed") || lower.includes("email_not_confirmed")) {
        console.log("[Login] Email not confirmed, redirecting to verify-otp");
        router.replace({ pathname: "/verify-otp", params: { email: email.trim().toLowerCase() } });
        return;
      }
      showError("Incorrect Password", message, "error");
    } finally {
      setIsLoading(false);
    }
  }, [email, password, signIn, showError, router]);

  return (
    <View style={styles.root}>
      <Video
        source={{ uri: VIDEO_URI }}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        isMuted
      />
      <View style={styles.overlay} />

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
            <Text style={styles.title}>Prayer Space</Text>
            <Text style={styles.subtitle}>
              Take time to pray and stay connected with those around you.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email address</Text>
              <View style={styles.inputWrap}>
                <Mail size={18} color="#6B5E52" />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor="#A89A8E"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  testID="login-email"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Password</Text>
                <Pressable onPress={() => router.push("/password-reset")}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </Pressable>
              </View>
              <View style={styles.inputWrap}>
                <Lock size={18} color="#6B5E52" />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#A89A8E"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  testID="login-password"
                  editable={!isLoading}
                />
                <Pressable onPress={() => setShowPassword((p) => !p)}>
                  {showPassword ? (
                    <EyeOff size={18} color="#6B5E52" />
                  ) : (
                    <Eye size={18} color="#6B5E52" />
                  )}
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.signInBtn, isLoading && styles.signInBtnDisabled]}
              onPress={handleSignIn}
              disabled={isLoading}
              testID="login-submit"
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.primaryForeground} />
              ) : (
                <Text style={styles.signInBtnText}>Sign In</Text>
              )}
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <GoogleSignInButton
              variant="light"
              onError={(msg) => showError("Google Sign In Failed", msg, "error")}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Pressable onPress={() => router.push("/register")}>
              <Text style={styles.footerLink}>Create an account</Text>
            </Pressable>
          </View>
        </AutoScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={errorModal.visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={hideError}
      >
        <Pressable style={styles.modalOverlay} onPress={hideError}>
          <Animated.View
            style={[
              styles.modalCard,
              {
                opacity: opacityAnim,
                transform: [
                  { scale: scaleAnim },
                  { translateX: shakeAnim },
                ],
              },
            ]}
          >
            <Pressable onPress={() => {}} style={styles.modalInner}>
              <View style={[
                styles.modalIconWrap,
                errorModal.type === "warning" ? styles.modalIconWrapWarning : styles.modalIconWrapError,
              ]}>
                {errorModal.type === "warning" ? (
                  <AlertTriangle size={32} color={Colors.primary} />
                ) : (
                  <ShieldAlert size={32} color="#D9534F" />
                )}
              </View>

              <Text style={styles.modalTitle}>{errorModal.title}</Text>
              <Text style={styles.modalMessage}>
                {errorModal.type === "error"
                  ? "The password you entered doesn't match our records. Please try again or reset your password."
                  : errorModal.message}
              </Text>

              <Pressable
                style={[
                  styles.modalBtn,
                  errorModal.type === "warning" ? styles.modalBtnWarning : styles.modalBtnError,
                ]}
                onPress={hideError}
              >
                <Text style={styles.modalBtnText}>Try Again</Text>
              </Pressable>

              {errorModal.type === "error" && (
                <Pressable
                  style={styles.modalBtnSecondary}
                  onPress={() => { hideError(); router.push("/password-reset"); }}
                >
                  <Text style={styles.modalBtnSecondaryText}>Reset Password</Text>
                </Pressable>
              )}

              <Pressable style={styles.goBackLink} onPress={hideError}>
                <Text style={styles.goBackText}>Go Back</Text>
              </Pressable>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 8, 6, 0.55)",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
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
    marginBottom: 32,
  },
  logoImage: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center" as const,
    maxWidth: 280,
    lineHeight: 22,
  },
  form: {
    gap: 18,
    marginBottom: 24,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "rgba(255,255,255,0.9)",
    marginLeft: 4,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  forgotText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "rgba(255,255,255,0.75)",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F5EFE6",
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 54,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1A1A1A",
    padding: 0,
  },
  actions: {
    gap: 16,
  },
  signInBtn: {
    height: 54,
    backgroundColor: Colors.primary,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  signInBtnDisabled: {
    opacity: 0.7,
  },
  signInBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.primaryForeground,
  },
  dividerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dividerText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "rgba(255,255,255,0.5)",
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
    color: "rgba(255,255,255,0.6)",
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "rgba(255,255,255,0.95)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(58, 47, 41, 0.45)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 28,
  },
  modalCard: {
    width: "100%" as const,
    backgroundColor: Colors.card,
    borderRadius: 28,
    overflow: "hidden" as const,
    shadowColor: "#3A2F29",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
    elevation: 20,
  },
  modalInner: {
    padding: 28,
    alignItems: "center" as const,
    gap: 12,
  },
  modalIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 8,
  },
  modalIconWrapError: {
    backgroundColor: "#FEF0EF",
    borderWidth: 1.5,
    borderColor: "#FBD5D3",
  },
  modalIconWrapWarning: {
    backgroundColor: Colors.accent,
    borderWidth: 1.5,
    borderColor: Colors.primary + "30",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.4,
    textAlign: "center" as const,
  },
  modalMessage: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: "center" as const,
    lineHeight: 21,
    maxWidth: 260,
  },

  modalBtn: {
    width: "100%" as const,
    height: 50,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 4,
  },
  modalBtnError: {
    backgroundColor: "#D9534F",
    shadowColor: "#D9534F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  modalBtnWarning: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  modalBtnSecondary: {
    width: "100%" as const,
    height: 50,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.secondary,
  },
  modalBtnSecondaryText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.secondaryForeground,
  },
  goBackLink: {
    paddingVertical: 8,
    marginTop: 4,
  },
  goBackText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.mutedForeground,
  },
});
