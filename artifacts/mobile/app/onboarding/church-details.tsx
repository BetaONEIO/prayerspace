import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronDown, Check, Globe, Users, Lock } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

const DENOMINATIONS = [
  "Church of England",
  "Catholic",
  "Baptist",
  "Methodist",
  "Pentecostal",
  "Non-denominational",
  "Other",
];

const COMMUNITY_TYPES = [
  "Church",
  "Ministry",
  "Christian Union",
  "Small Group",
  "Prayer Group",
  "Other",
];

const AUDIENCE_OPTIONS = [
  { id: "open", label: "Open to anyone", sub: "Anyone can discover and join", icon: Globe },
  { id: "members", label: "Church members only", sub: "Members can join via a link", icon: Users },
  { id: "invite", label: "Invite only", sub: "Only people you invite can join", icon: Lock },
];

export default function ChurchDetails() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [denomination, setDenomination] = useState<string | null>(null);
  const [communityType, setCommunityType] = useState<string | null>(null);
  const [audience, setAudience] = useState<string | null>(null);
  const [showDenomModal, setShowDenomModal] = useState(false);

  const proceed = () => router.push("/onboarding/church-value" as never);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.progressRow}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: "83.3%" }]} />
          </View>
          <Text style={styles.stepText}>Step 5 of 6</Text>
        </View>

        <View style={styles.headingArea}>
          <Text style={styles.title}>Tell us about your community</Text>
          <Text style={styles.subtitle}>
            Help people understand what your community is about. All fields are optional.
          </Text>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* Denomination */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Denomination</Text>
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

          {/* Community type */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Community type</Text>
            <View style={styles.chipGrid}>
              {COMMUNITY_TYPES.map((t) => {
                const sel = communityType === t;
                return (
                  <Pressable
                    key={t}
                    style={[styles.chip, sel && styles.chipSelected]}
                    onPress={() => setCommunityType(sel ? null : t)}
                    testID={`community-type-${t.replace(" ", "-").toLowerCase()}`}
                  >
                    <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{t}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Audience */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Who can join?</Text>
            <View style={styles.audienceList}>
              {AUDIENCE_OPTIONS.map((opt) => {
                const sel = audience === opt.id;
                const Icon = opt.icon;
                return (
                  <Pressable
                    key={opt.id}
                    style={[styles.audienceCard, sel && styles.audienceCardSelected]}
                    onPress={() => setAudience(sel ? null : opt.id)}
                    testID={`audience-${opt.id}`}
                  >
                    <View style={[styles.audienceIcon, sel && styles.audienceIconSelected]}>
                      <Icon size={18} color={sel ? colors.primaryForeground : colors.primary} />
                    </View>
                    <View style={styles.audienceText}>
                      <Text style={styles.audienceLabel}>{opt.label}</Text>
                      <Text style={styles.audienceSub}>{opt.sub}</Text>
                    </View>
                    <View style={[styles.radio, sel && styles.radioSelected]}>
                      {sel && <View style={styles.radioDot} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.continueBtn, pressed && styles.btnPressed]}
            onPress={proceed}
            testID="church-details-continue"
          >
            <Text style={styles.continueBtnText}>Continue</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
            onPress={proceed}
          >
            <Text style={styles.skipBtnText}>Skip this step</Text>
          </Pressable>
        </View>
      </View>

      {/* Denomination Modal */}
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
                    <Text style={[styles.modalOptionText, sel && styles.modalOptionTextSelected]}>{d}</Text>
                    {sel && <Check size={20} color={colors.primary} strokeWidth={2.5} />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              style={styles.modalDone}
              onPress={() => setShowDenomModal(false)}
            >
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
    inner: { flex: 1, paddingHorizontal: 24, paddingBottom: 32 },
    progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 28, marginTop: 4 },
    progressBg: { flex: 1, height: 6, backgroundColor: colors.secondary, borderRadius: 3, overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3 },
    stepText: { fontSize: 10, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 1.2, textTransform: "uppercase" },
    headingArea: { gap: 8, marginBottom: 24 },
    title: { fontSize: 26, fontWeight: "800" as const, color: colors.foreground, lineHeight: 34 },
    subtitle: { fontSize: 14, color: colors.mutedForeground, lineHeight: 21 },
    scroll: { flex: 1 },
    scrollContent: { gap: 24, paddingBottom: 8 },
    section: { gap: 10 },
    sectionLabel: { fontSize: 13, fontWeight: "700" as const, color: colors.foreground, letterSpacing: 0.3 },
    selectorRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 },
    selectorRowPressed: { opacity: 0.8 },
    selectorText: { fontSize: 15, color: colors.foreground, fontWeight: "500" as const },
    placeholder: { color: colors.mutedForeground },
    chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 24, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border },
    chipSelected: { borderColor: colors.primary, backgroundColor: colors.accent },
    chipText: { fontSize: 14, fontWeight: "600" as const, color: colors.mutedForeground },
    chipTextSelected: { color: colors.primary },
    audienceList: { gap: 10 },
    audienceCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, backgroundColor: colors.card, borderRadius: 18, borderWidth: 2, borderColor: colors.border },
    audienceCardSelected: { borderColor: colors.primary + "66", backgroundColor: colors.accent },
    audienceIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    audienceIconSelected: { backgroundColor: colors.primary },
    audienceText: { flex: 1, gap: 2 },
    audienceLabel: { fontSize: 14, fontWeight: "700" as const, color: colors.foreground },
    audienceSub: { fontSize: 12, color: colors.mutedForeground },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    radioSelected: { borderColor: colors.primary },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
    actions: { gap: 8, marginTop: 12 },
    continueBtn: { height: 62, backgroundColor: colors.primary, borderRadius: 20, alignItems: "center" as const, justifyContent: "center" as const, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 6 },
    btnPressed: { opacity: 0.9 },
    continueBtnText: { fontSize: 17, fontWeight: "700" as const, color: colors.primaryForeground },
    skipBtn: { paddingVertical: 10, alignItems: "center" },
    skipBtnText: { fontSize: 14, fontWeight: "600" as const, color: colors.mutedForeground },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    modalSheet: { backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingBottom: 40, maxHeight: "75%" },
    modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: "800" as const, color: colors.foreground, marginBottom: 16 },
    modalOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalOptionSelected: { },
    modalOptionText: { fontSize: 16, color: colors.foreground },
    modalOptionTextSelected: { color: colors.primary, fontWeight: "700" as const },
    modalDone: { height: 52, backgroundColor: colors.primary, borderRadius: 16, alignItems: "center", justifyContent: "center", marginTop: 20 },
    modalDoneText: { fontSize: 16, fontWeight: "700" as const, color: colors.primaryForeground },
  });
}
