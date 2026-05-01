import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { AutoScrollView } from "@/components/AutoScrollView";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Building2,
  BookOpen,
  GraduationCap,
  Users,
  Heart,
  Sparkles,
} from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { onboardingStore, CommunityType } from "@/lib/onboardingStore";

const COMMUNITY_TYPES: {
  id: CommunityType;
  label: string;
  sublabel: string;
  icon: typeof Building2;
}[] = [
  {
    id: "church",
    label: "Church",
    sublabel: "A congregation with regular services",
    icon: Building2,
  },
  {
    id: "ministry",
    label: "Ministry",
    sublabel: "A team serving a specific mission",
    icon: BookOpen,
  },
  {
    id: "christian_union",
    label: "Christian Union",
    sublabel: "A student or campus faith community",
    icon: GraduationCap,
  },
  {
    id: "small_group",
    label: "Small Group",
    sublabel: "An intimate group of believers",
    icon: Users,
  },
  {
    id: "prayer_group",
    label: "Prayer Group",
    sublabel: "Focused on prayer and intercession",
    icon: Heart,
  },
  {
    id: "other",
    label: "Other",
    sublabel: "Another type of Christian community",
    icon: Sparkles,
  },
];

export default function ChurchGroupType() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selected, setSelected] = useState<CommunityType>(null);

  const handleContinue = () => {
    onboardingStore.setCommunityType(selected);
    router.push("/onboarding/church-size" as never);
  };

  const handleSkip = () => {
    onboardingStore.setCommunityType(null);
    router.push("/onboarding/church-size" as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.progressRow}>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: "33.3%" }]} />
          </View>
          <Text style={styles.stepText}>Step 1 of 3</Text>
        </View>

        <View style={styles.headingArea}>
          <Text style={styles.title}>What kind of community are you setting up?</Text>
          <Text style={styles.subtitle}>
            Choose the one that best describes your group.
          </Text>
        </View>

        <AutoScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {COMMUNITY_TYPES.map((opt) => {
            const isSelected = selected === opt.id;
            const Icon = opt.icon;
            return (
              <Pressable
                key={opt.id!}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setSelected(isSelected ? null : opt.id)}
                testID={`community-type-${opt.id}`}
              >
                <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                  <Icon
                    size={24}
                    color={isSelected ? colors.primaryForeground : colors.primary}
                  />
                </View>
                <View style={styles.cardText}>
                  <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.cardSublabel}>{opt.sublabel}</Text>
                </View>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </AutoScrollView>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [
              styles.continueBtn,
              !selected && styles.continueBtnDisabled,
              pressed && !!selected && styles.btnPressed,
            ]}
            onPress={handleContinue}
            disabled={!selected}
            testID="community-type-continue"
          >
            <Text style={styles.continueBtnText}>Continue</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
            onPress={handleSkip}
            testID="community-type-skip"
          >
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
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
    headingArea: { gap: 10, marginBottom: 24 },
    title: {
      fontSize: 26,
      fontWeight: "800" as const,
      color: colors.foreground,
      lineHeight: 34,
    },
    subtitle: { fontSize: 15, color: colors.mutedForeground, lineHeight: 22 },
    list: { flex: 1 },
    listContent: { gap: 10, paddingBottom: 8 },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: colors.border,
    },
    cardSelected: { borderColor: colors.primary, backgroundColor: colors.accent },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    iconWrapSelected: { backgroundColor: colors.primary },
    cardText: { flex: 1, gap: 2 },
    cardLabel: { fontSize: 16, fontWeight: "700" as const, color: colors.foreground },
    cardLabelSelected: { color: colors.foreground },
    cardSublabel: { fontSize: 12, color: colors.mutedForeground },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    radioSelected: { borderColor: colors.primary },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
    actions: { gap: 10, marginTop: 16 },
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
    continueBtnText: {
      fontSize: 17,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
    },
    skipBtn: { paddingVertical: 10, alignItems: "center" },
    skipBtnText: { fontSize: 14, fontWeight: "600" as const, color: colors.mutedForeground },
  });
}
