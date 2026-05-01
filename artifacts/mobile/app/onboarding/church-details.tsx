import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronDown, Check } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { churchMembershipStore } from "@/lib/churchMembershipStore";
import { communityStore } from "@/lib/communityStore";

const DENOMINATIONS = [
  "Church of England",
  "Catholic",
  "Baptist",
  "Methodist",
  "Pentecostal",
  "Presbyterian",
  "Lutheran",
  "Non-denominational",
  "Other",
];

export default function ChurchDetails() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [denomination, setDenomination] = useState<string | null>(null);
  const [showDenomModal, setShowDenomModal] = useState(false);

  const canContinue = name.trim().length > 0;

  const handleContinue = () => {
    const { tier } = churchMembershipStore.getState();
    const safeName = name.trim() || null;
    churchMembershipStore.setOwner(safeName, tier);
    communityStore.addOwnedCommunity(safeName, tier);
    router.push("/onboarding/church-complete" as never);
  };

  const handleSkip = () => {
    const { tier } = churchMembershipStore.getState();
    churchMembershipStore.setOwner(null, tier);
    communityStore.addOwnedCommunity(null, tier);
    router.push("/onboarding/church-complete" as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.inner}>
          <View style={styles.progressRow}>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: "100%" }]} />
            </View>
            <Text style={styles.stepText}>Step 3 of 3</Text>
          </View>

          <View style={styles.headingArea}>
            <Text style={styles.title}>Name your community</Text>
            <Text style={styles.subtitle}>
              This is what your members will see. You can change everything later.
            </Text>
          </View>

          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.field}>
              <Text style={styles.label}>Community name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Grace Community Church"
                placeholderTextColor={colors.mutedForeground + "80"}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                autoFocus
                testID="community-name-input"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Description{" "}
                <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="What brings your community together?"
                placeholderTextColor={colors.mutedForeground + "80"}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                returnKeyType="next"
                testID="community-description-input"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Location{" "}
                <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. London, UK"
                placeholderTextColor={colors.mutedForeground + "80"}
                value={location}
                onChangeText={setLocation}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                testID="community-location-input"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>
                Denomination{" "}
                <Text style={styles.optional}>(optional)</Text>
              </Text>
              <Pressable
                style={({ pressed }) => [styles.selectorRow, pressed && styles.selectorRowPressed]}
                onPress={() => setShowDenomModal(true)}
                testID="denomination-picker"
              >
                <Text style={[styles.selectorText, !denomination && styles.placeholder]}>
                  {denomination ?? "Select denomination"}
                </Text>
                <ChevronDown size={18} color={colors.mutedForeground} />
              </Pressable>
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
              testID="community-details-continue"
            >
              <Text style={styles.continueBtnText}>Create community</Text>
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

      <Modal
        visible={showDenomModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDenomModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDenomModal(false)}
        >
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Denomination</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {DENOMINATIONS.map((d) => {
                const sel = denomination === d;
                return (
                  <Pressable
                    key={d}
                    style={[styles.modalOption, sel && styles.modalOptionSelected]}
                    onPress={() => { setDenomination(d); setShowDenomModal(false); }}
                    testID={`denom-${d.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Text style={[styles.modalOptionText, sel && styles.modalOptionTextSelected]}>
                      {d}
                    </Text>
                    {sel && <Check size={20} color={colors.primary} strokeWidth={2.5} />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.modalDone} onPress={() => setShowDenomModal(false)}>
              <Text style={styles.modalDoneText}>Done</Text>
            </Pressable>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    kav: { flex: 1 },
    inner: { flex: 1, paddingHorizontal: 24, paddingBottom: 32 },
    progressRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 28,
      marginTop: 4,
    },
    progressBg: {
      flex: 1,
      height: 6,
      backgroundColor: colors.secondary,
      borderRadius: 3,
      overflow: "hidden",
    },
    progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3 },
    stepText: {
      fontSize: 10,
      fontWeight: "700" as const,
      color: colors.mutedForeground,
      letterSpacing: 1.2,
      textTransform: "uppercase",
    },
    headingArea: { gap: 8, marginBottom: 24 },
    title: { fontSize: 28, fontWeight: "800" as const, color: colors.foreground, lineHeight: 36 },
    subtitle: { fontSize: 15, color: colors.mutedForeground, lineHeight: 22 },
    scroll: { flex: 1 },
    scrollContent: { gap: 18, paddingBottom: 8 },
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
    inputMultiline: { height: 84, paddingTop: 14 },
    selectorRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.card,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 18,
      paddingVertical: 14,
    },
    selectorRowPressed: { opacity: 0.8 },
    selectorText: { fontSize: 16, color: colors.foreground, fontWeight: "500" as const },
    placeholder: { color: colors.mutedForeground + "80" },
    actions: { gap: 10, marginTop: 8 },
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
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 24,
      paddingBottom: 40,
      maxHeight: "75%",
    },
    modalHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: "center",
      marginTop: 12,
      marginBottom: 20,
    },
    modalTitle: { fontSize: 18, fontWeight: "800" as const, color: colors.foreground, marginBottom: 16 },
    modalOption: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalOptionSelected: {},
    modalOptionText: { fontSize: 16, color: colors.foreground },
    modalOptionTextSelected: { color: colors.primary, fontWeight: "700" as const },
    modalDone: {
      height: 52,
      backgroundColor: colors.primary,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 20,
    },
    modalDoneText: { fontSize: 16, fontWeight: "700" as const, color: colors.primaryForeground },
  });
}
