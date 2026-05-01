import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Calendar } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";

const LOGO_URI =
  "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/for3p4uznzmpb3n9cpn1e.png";
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

  const handleContinue = useCallback(async () => {
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
      console.log("[CompleteProfile] DOB saved successfully");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to save. Please try again.";
      console.error("[CompleteProfile] Failed to save DOB:", msg);
      Alert.alert("Something went wrong", msg);
    }
  }, [dobDay, dobMonth, dobYear, updateProfile]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Image
              source={{ uri: LOGO_URI }}
              style={styles.logo}
              contentFit="contain"
            />
            <Text style={styles.greeting}>
              {firstName ? `Welcome, ${firstName}!` : "Welcome!"}
            </Text>
            <Text style={styles.title}>One last thing</Text>
            <Text style={styles.subtitle}>
              To keep Prayer Space safe for everyone, we need to verify your age.
              This is a one-time step.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Date of birth</Text>
            <View
              style={[
                styles.dobRow,
                dobError ? styles.dobRowError : undefined,
              ]}
            >
              <Calendar size={18} color={colors.mutedForeground} style={styles.calIcon} />
              <TextInput
                style={[styles.dobInput, styles.dobSmall]}
                placeholder="DD"
                placeholderTextColor={colors.mutedForeground + "90"}
                value={dobDay}
                onChangeText={handleDayChange}
                keyboardType="number-pad"
                maxLength={2}
                testID="complete-profile-dob-day"
                editable={!isUpdatingProfile}
              />
              <Text style={styles.dobSep}>/</Text>
              <TextInput
                ref={monthRef}
                style={[styles.dobInput, styles.dobSmall]}
                placeholder="MM"
                placeholderTextColor={colors.mutedForeground + "90"}
                value={dobMonth}
                onChangeText={handleMonthChange}
                keyboardType="number-pad"
                maxLength={2}
                testID="complete-profile-dob-month"
                editable={!isUpdatingProfile}
              />
              <Text style={styles.dobSep}>/</Text>
              <TextInput
                ref={yearRef}
                style={[styles.dobInput, styles.dobYear]}
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
            style={[styles.btn, isUpdatingProfile && styles.btnDisabled]}
            onPress={handleContinue}
            disabled={isUpdatingProfile}
            testID="complete-profile-submit"
          >
            {isUpdatingProfile ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={styles.btnText}>Continue</Text>
            )}
          </Pressable>

          <Text style={styles.legalNote}>
            Your date of birth is used only for age verification and is never
            shared publicly.
          </Text>
        </View>
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
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 32,
      paddingBottom: 24,
      justifyContent: "center",
    },
    header: {
      alignItems: "center",
      marginBottom: 32,
    },
    logo: {
      width: 72,
      height: 72,
      marginBottom: 16,
    },
    greeting: {
      fontSize: 15,
      color: colors.mutedForeground,
      marginBottom: 6,
    },
    title: {
      fontSize: 26,
      fontWeight: "800",
      color: colors.foreground,
      letterSpacing: -0.5,
      marginBottom: 10,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 21,
      maxWidth: 300,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.foreground,
      marginBottom: 10,
    },
    dobRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.secondary,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 2,
      height: 52,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    dobRowError: {
      borderColor: colors.destructive,
      backgroundColor: colors.destructive + "10",
    },
    calIcon: {
      marginRight: 10,
    },
    dobInput: {
      fontSize: 16,
      color: colors.foreground,
      padding: 0,
      textAlign: "center",
    },
    dobSmall: {
      width: 36,
    },
    dobYear: {
      flex: 1,
    },
    dobSep: {
      fontSize: 18,
      color: colors.mutedForeground,
      marginHorizontal: 6,
    },
    helperText: {
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 8,
    },
    errorText: {
      fontSize: 12,
      color: colors.destructive,
      marginTop: 8,
      fontWeight: "600",
    },
    btn: {
      height: 54,
      backgroundColor: colors.primary,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 5,
      marginBottom: 16,
    },
    btnDisabled: {
      opacity: 0.7,
    },
    btnText: {
      fontSize: 16,
      fontWeight: "700",
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
