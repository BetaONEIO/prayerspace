import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { User, Users } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { onboardingStore, UserType } from "@/lib/onboardingStore";

const OPTIONS: { id: UserType; icon: typeof User; label: string; sublabel: string }[] = [
  {
    id: "personal",
    icon: User,
    label: "Personal",
    sublabel: "Prayer journals, requests, and daily reminders just for you.",
  },
  {
    id: "church",
    icon: Users,
    label: "Community",
    sublabel: "Private community, member management, and group prayer tools.",
  },
];

export default function OnboardingUserType() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selected, setSelected] = useState<UserType>(null);

  const handleContinue = () => {
    if (!selected) return;
    onboardingStore.setUserType(selected);
    if (selected === "church") {
      router.push("/onboarding/community-intro" as never);
    } else {
      router.push("/onboarding/goals" as never);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.headingArea}>
          <Text style={styles.title}>How will you be using the app?</Text>
          <Text style={styles.subtitle}>Choose one — you can change this later.</Text>
        </View>

        <View style={styles.options}>
          {OPTIONS.map((opt) => {
            const isSelected = selected === opt.id;
            const Icon = opt.icon;
            return (
              <Pressable
                key={opt.id!}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setSelected(opt.id)}
                testID={`user-type-${opt.id}`}
              >
                <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                  <Icon size={32} color={isSelected ? colors.primaryForeground : colors.primary} />
                </View>
                <View style={styles.cardText}>
                  <Text style={[styles.cardLabel, isSelected && styles.cardLabelSelected]}>{opt.label}</Text>
                  <Text style={styles.cardSublabel}>{opt.sublabel}</Text>
                </View>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.continueBtn,
            !selected && styles.continueBtnDisabled,
            pressed && selected && styles.btnPressed,
          ]}
          onPress={handleContinue}
          disabled={!selected}
          testID="user-type-continue"
        >
          <Text style={styles.continueBtnText}>Continue</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    inner: { flex: 1, paddingHorizontal: 24, paddingBottom: 32, justifyContent: "center" },
    headingArea: { gap: 10, marginBottom: 40 },
    title: { fontSize: 30, fontWeight: "800" as const, color: colors.foreground, lineHeight: 38 },
    subtitle: { fontSize: 15, color: colors.mutedForeground, lineHeight: 22 },
    options: { gap: 16, marginBottom: 40 },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 18,
      padding: 22,
      backgroundColor: colors.card,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: colors.border,
    },
    cardSelected: { borderColor: colors.primary, backgroundColor: colors.accent },
    iconWrap: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    iconWrapSelected: { backgroundColor: colors.primary },
    cardText: { flex: 1, gap: 4 },
    cardLabel: { fontSize: 20, fontWeight: "800" as const, color: colors.foreground },
    cardLabelSelected: { color: colors.foreground },
    cardSublabel: { fontSize: 13, color: colors.mutedForeground, lineHeight: 19 },
    radio: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    radioSelected: { borderColor: colors.primary },
    radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
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
  });
}
