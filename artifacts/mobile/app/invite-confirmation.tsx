import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Phone } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function InviteConfirmationScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.overlay, { paddingBottom: insets.bottom }]}>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Phone size={32} color={colors.primary} />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.title}>Send Invite?</Text>
          <Text style={styles.subtitle}>
            We will open your messaging app to send an invite to{" "}
            <Text style={styles.bold}>Chris Evans</Text>. Standard carrier rates may apply.
          </Text>
        </View>
        <Pressable style={styles.yesBtn} onPress={() => router.replace("/invite-sent")}>
          <Text style={styles.yesBtnText}>Yes, Invite</Text>
        </Pressable>
        <Pressable style={styles.noBtn} onPress={() => router.back()}>
          <Text style={styles.noBtnText}>Not Now</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
    card: { backgroundColor: colors.card, borderRadius: 32, padding: 32, alignItems: "center", gap: 16, width: "100%", maxWidth: 320, shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 10, borderWidth: 1, borderColor: colors.border + "50" },
    iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
    textBlock: { alignItems: "center", gap: 8 },
    title: { fontSize: 20, fontWeight: "700" as const, color: colors.foreground },
    subtitle: { fontSize: 13, color: colors.mutedForeground, textAlign: "center", lineHeight: 19 },
    bold: { fontWeight: "700" as const, color: colors.foreground },
    yesBtn: { width: "100%", backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 999, alignItems: "center", shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4, marginTop: 4 },
    yesBtnText: { fontSize: 15, fontWeight: "700" as const, color: colors.primaryForeground },
    noBtn: { width: "100%", backgroundColor: colors.secondary, paddingVertical: 16, borderRadius: 999, alignItems: "center" },
    noBtnText: { fontSize: 15, fontWeight: "700" as const, color: colors.secondaryForeground },
  });
}
