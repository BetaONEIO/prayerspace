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
import { AutoScrollView } from "@/components/AutoScrollView";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Calendar } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";

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

export default function CompleteProfileScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, updateProfile, isUpdatingProfile } = useAuth();

  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [dobError, setDobError] = useState("");

  const monthRef = useRef<TextInput | null>(null);
  const yearRef = useRef<TextInput | null>(null);

  const firstName = useMemo(() => {
    const fullName =
      user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "";
    return fullName.split(" ")[0] ?? "";
  }, [user]);

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

  const handleSave = useCallback(async () => {
    const iso = buildIsoDate(dobDay, dobMonth, dobYear);
    if (!iso) {
      setDobError("Please enter a valid date of birth.");
      return;
    }
    const age = calculateAge(iso);
    if (age < MIN_AGE_YEARS) {
      setDobError(`You must be at least ${MIN_AGE_YEARS} years old to use Prayer Space.`);
      return;
    }

    try {
      await updateProfile({ date_of_birth: iso });
      router.replace("/");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      Alert.alert("Could Not Save", message);
    }
  }, [dobDay, dobMonth, dobYear, updateProfile, router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <AutoScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoArea}>
            <Image source={{ uri: LOGO_URI }} style={styles.logoImage} contentFit="contain" />
            <Text style={styles.greeting}>
              {firstName ? `Welcome, ${firstName}!` : "Welcome!"}
            </Text>
            <Text style={styles.title}>One More Step</Text>
            <Text style={styles.subtitle}>
              To keep Prayer Space safe for everyone, we need your date of birth. This is required for all users.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date of Birth</Text>
            <View
              style={[
                styles.inputWrap,
                dobError ? styles.inputWrapError : undefined,
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
                testID="complete-profile-dob-day"
                editable={!isUpdatingProfile}
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
                testID="complete-profile-dob-month"
                editable={!isUpdatingProfile}
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
                testID="complete-profile-dob-year"
                editable={!isUpdatingProfile}
              />
            </View>
            {dobError ? (
              <Text style={styles.errorText} testID="complete-profile-dob-error">
                {dobError}
              </Text>
            ) : (
              <Text style={styles.helperText}>
                You must be at least {MIN_AGE_YEARS} years old to use Prayer Space.
              </Text>
            )}
          </View>

          <Pressable
            style={[styles.saveBtn, isUpdatingProfile && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isUpdatingProfile}
            testID="complete-profile-save"
          >
            {isUpdatingProfile ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.saveBtnText}>Continue</Text>
            )}
          </Pressable>
          <Text style={styles.legalNote}>
            Your date of birth is used only for age verification and is never
            shared publicly.
          </Text>
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
    container: {
      flexGrow: 1,
      justifyContent: "center" as const,
      paddingHorizontal: 28,
      paddingVertical: 32,
    },
    logoArea: {
      alignItems: "center" as const,
      marginBottom: 36,
    },
    logoImage: {
      width: 100,
      height: 100,
      marginBottom: 20,
    },
    greeting: {
      fontSize: 15,
      color: colors.mutedForeground,
      marginBottom: 6,
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
      maxWidth: 300,
      lineHeight: 22,
    },
    field: {
      gap: 8,
      marginBottom: 28,
    },
    label: {
      fontSize: 13,
      fontWeight: "700" as const,
      color: colors.foreground,
      marginLeft: 4,
    },
    inputWrap: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
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
    inputWrapError: {
      borderColor: "#D9534F",
    },
    input: {
      flex: 1,
      fontSize: 15,
      color: colors.foreground,
      padding: 0,
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
    errorText: {
      fontSize: 12,
      color: "#D9534F",
      marginLeft: 4,
      lineHeight: 18,
      fontWeight: "600" as const,
    },
    saveBtn: {
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
      marginBottom: 16,
    },
    saveBtnDisabled: {
      opacity: 0.7,
    },
    saveBtnText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
    },
    legalNote: {
      fontSize: 11,
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 17,
      paddingHorizontal: 8,
    },
  });
}

