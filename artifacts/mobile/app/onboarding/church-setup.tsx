import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { churchMembershipStore } from "@/lib/churchMembershipStore";

export default function ChurchSetup() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const canContinue = name.trim().length > 0;

  const handleContinue = () => {
    churchMembershipStore.setMember(name.trim() || null);
    router.push("/onboarding/church-details" as never);
  };

  const handleSkip = () => {
    churchMembershipStore.setMember(null);
    router.push("/onboarding/church-details" as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.inner}>
          <View style={styles.progressRow}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: "57.1%" }]} />
            </View>
            <Text style={styles.stepText}>Step 4 of 7</Text>
          </View>

          <View style={styles.headingArea}>
            <Text style={styles.title}>Name your community</Text>
            <Text style={styles.subtitle}>
              This is what your members will see when they join. You can change it anytime.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Community name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Grace Community Church"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                autoFocus
                testID="church-name-input"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Description <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="What brings your community together?"
                placeholderTextColor={colors.mutedForeground}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                returnKeyType="next"
                testID="church-description-input"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Location <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. London, UK"
                placeholderTextColor={colors.mutedForeground}
                value={location}
                onChangeText={setLocation}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                testID="church-location-input"
              />
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.continueBtn,
                !canContinue && styles.continueBtnDisabled,
                pressed && canContinue && styles.btnPressed,
              ]}
              onPress={handleContinue}
              disabled={!canContinue}
              testID="church-setup-continue"
            >
              <Text style={styles.continueBtnText}>Continue</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
              onPress={handleSkip}
            >
              <Text style={styles.skipBtnText}>I'll add details later</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    kav: { flex: 1 },
    inner: { flex: 1, paddingHorizontal: 24, paddingBottom: 32 },
    progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 28, marginTop: 4 },
    progressBg: { flex: 1, height: 6, backgroundColor: colors.secondary, borderRadius: 3, overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3 },
    stepText: { fontSize: 10, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 1.2, textTransform: "uppercase" },
    headingArea: { gap: 10, marginBottom: 28 },
    title: { fontSize: 28, fontWeight: "800" as const, color: colors.foreground, lineHeight: 36 },
    subtitle: { fontSize: 15, color: colors.mutedForeground, lineHeight: 22 },
    form: { flex: 1, gap: 18 },
    field: { gap: 8 },
    label: { fontSize: 13, fontWeight: "700" as const, color: colors.foreground, letterSpacing: 0.3 },
    optional: { fontWeight: "400" as const, color: colors.mutedForeground },
    input: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, fontSize: 16, color: colors.foreground },
    inputMultiline: { height: 80, paddingTop: 14 },
    actions: { gap: 10, marginTop: 8 },
    continueBtn: { height: 62, backgroundColor: colors.primary, borderRadius: 20, alignItems: "center" as const, justifyContent: "center" as const, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 6 },
    continueBtnDisabled: { opacity: 0.4 },
    btnPressed: { opacity: 0.9 },
    continueBtnText: { fontSize: 17, fontWeight: "700" as const, color: colors.primaryForeground },
    skipBtn: { paddingVertical: 10, alignItems: "center" },
    skipBtnText: { fontSize: 14, fontWeight: "600" as const, color: colors.mutedForeground },
  });
}
