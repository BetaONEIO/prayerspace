import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Building2 } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { churchMembershipStore } from "@/lib/churchMembershipStore";

export default function OnboardingChurchCommunity() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const canContinue = name.trim().length > 0;

  const handleContinue = () => {
    churchMembershipStore.setMember(name.trim() || null);
    router.push("/onboarding/church-paywall" as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.inner}>
          <View style={styles.iconArea}>
            <View style={styles.iconWrap}>
              <Building2 size={32} color={colors.primary} />
            </View>
          </View>

          <View style={styles.headingArea}>
            <Text style={styles.title}>Create your church community</Text>
            <Text style={styles.subtitle}>
              We'll set up a private space for your congregation. You can customise everything after sign-up.
            </Text>
          </View>

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.form}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.field}>
              <Text style={styles.label}>Church or organisation name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Grace Community Church"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                testID="church-name-input"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Short description <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="What brings your community together?"
                placeholderTextColor={colors.mutedForeground}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                returnKeyType="done"
                testID="church-description-input"
              />
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.continueBtn,
                !canContinue && styles.continueBtnDisabled,
                pressed && canContinue && styles.btnPressed,
              ]}
              onPress={handleContinue}
              disabled={!canContinue}
              testID="church-community-continue"
            >
              <Text style={styles.continueBtnText}>See pricing</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
              onPress={() => { churchMembershipStore.setMember(null); router.push("/onboarding/church-paywall" as never); }}
            >
              <Text style={styles.skipBtnText}>Skip for now</Text>
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
    inner: { flex: 1, paddingHorizontal: 24, paddingBottom: 32, justifyContent: "center", gap: 0 },
    iconArea: { alignItems: "center", marginBottom: 28 },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    headingArea: { gap: 10, marginBottom: 36 },
    title: { fontSize: 28, fontWeight: "800" as const, color: colors.foreground, lineHeight: 36 },
    subtitle: { fontSize: 15, color: colors.mutedForeground, lineHeight: 22 },
    formScroll: { flex: 1 },
    form: { gap: 20, paddingBottom: 16 },
    field: { gap: 8 },
    label: { fontSize: 13, fontWeight: "700" as const, color: colors.foreground, letterSpacing: 0.3 },
    optional: { fontWeight: "400" as const, color: colors.mutedForeground },
    input: {
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 18,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.foreground,
    },
    inputMultiline: { height: 90, paddingTop: 14 },
    actions: { gap: 10 },
    continueBtn: {
      height: 62,
      backgroundColor: colors.primary,
      borderRadius: 20,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 6,
    },
    continueBtnDisabled: { opacity: 0.4 },
    btnPressed: { opacity: 0.9 },
    continueBtnText: { fontSize: 17, fontWeight: "700" as const, color: colors.primaryForeground },
    skipBtn: { paddingVertical: 10, alignItems: "center" },
    skipBtnText: { fontSize: 14, fontWeight: "600" as const, color: colors.mutedForeground },
  });
}
