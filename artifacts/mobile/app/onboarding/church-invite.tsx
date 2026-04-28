import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Alert, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { UserPlus, Link2 } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

export default function ChurchInvite() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleInviteContacts = () => {
    Alert.alert(
      "Invite from contacts",
      "Contact importing will be available once your community is set up.",
      [{ text: "OK", onPress: () => router.push("/onboarding/church-value" as never) }]
    );
  };

  const handleShareLink = async () => {
    try {
      await Share.share({
        message: "Join my community on Prayer Space — a private space for us to pray and stay connected.",
        url: "https://prayerspace.app/join",
      });
    } catch {
    } finally {
      router.push("/onboarding/church-value" as never);
    }
  };

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
          <Text style={styles.title}>Invite your members</Text>
          <Text style={styles.subtitle}>
            Grow your community from day one. You can always invite more people later.
          </Text>
        </View>

        <View style={styles.optionList}>
          <Pressable
            style={({ pressed }) => [styles.optionCard, pressed && styles.optionCardPressed]}
            onPress={handleInviteContacts}
            testID="invite-contacts"
          >
            <View style={styles.optionIcon}>
              <UserPlus size={24} color={colors.primary} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>Invite from contacts</Text>
              <Text style={styles.optionSub}>Find people already on Prayer Space</Text>
            </View>
            <View style={styles.optionArrow}>
              <Text style={styles.optionArrowText}>›</Text>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.optionCard, pressed && styles.optionCardPressed]}
            onPress={handleShareLink}
            testID="share-invite-link"
          >
            <View style={styles.optionIcon}>
              <Link2 size={24} color={colors.primary} />
            </View>
            <View style={styles.optionText}>
              <Text style={styles.optionLabel}>Share invite link</Text>
              <Text style={styles.optionSub}>Send a link via message, email, or WhatsApp</Text>
            </View>
            <View style={styles.optionArrow}>
              <Text style={styles.optionArrowText}>›</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.6 }]}
            onPress={() => router.push("/onboarding/church-value" as never)}
            testID="invite-skip"
          >
            <Text style={styles.skipBtnText}>I'll do this later</Text>
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
    progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 36, marginTop: 4 },
    progressBg: { flex: 1, height: 6, backgroundColor: colors.secondary, borderRadius: 3, overflow: "hidden" },
    progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 3 },
    stepText: { fontSize: 10, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 1.2, textTransform: "uppercase" },
    headingArea: { gap: 10, marginBottom: 40 },
    title: { fontSize: 28, fontWeight: "800" as const, color: colors.foreground, lineHeight: 36 },
    subtitle: { fontSize: 15, color: colors.mutedForeground, lineHeight: 22 },
    optionList: { gap: 14 },
    optionCard: { flexDirection: "row", alignItems: "center", gap: 16, padding: 20, backgroundColor: colors.card, borderRadius: 22, borderWidth: 2, borderColor: colors.border },
    optionCardPressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
    optionIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    optionText: { flex: 1, gap: 3 },
    optionLabel: { fontSize: 16, fontWeight: "700" as const, color: colors.foreground },
    optionSub: { fontSize: 13, color: colors.mutedForeground },
    optionArrow: { alignItems: "center", justifyContent: "center" },
    optionArrowText: { fontSize: 22, color: colors.mutedForeground, lineHeight: 26 },
    footer: { flex: 1, justifyContent: "flex-end", alignItems: "center", paddingBottom: 8 },
    skipBtn: { paddingVertical: 12, paddingHorizontal: 24 },
    skipBtnText: { fontSize: 14, fontWeight: "600" as const, color: colors.mutedForeground },
  });
}
