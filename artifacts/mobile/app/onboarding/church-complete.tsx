import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Share } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { Crown } from "lucide-react-native";
import { useChurchMembership } from "@/lib/churchMembershipStore";

export default function ChurchComplete() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { churchName, isPremium } = useChurchMembership();

  const communityLabel = churchName ?? "your community";

  const handleGoToCommunity = () => {
    router.replace("/(tabs)/community" as never);
  };

  const handleInvite = async () => {
    try {
      await Share.share({
        message: `Join ${communityLabel} on Prayer Space — a private space for us to pray and stay connected.\n\nhttps://prayerspace.app/join`,
      });
    } catch {
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.iconArea}>
          <View style={styles.iconCircle}>
            <Text style={styles.emoji}>🙏</Text>
          </View>
        </View>

        {isPremium && (
          <View style={styles.premiumBadge}>
            <Crown size={12} color={colors.primary} />
            <Text style={styles.premiumBadgeText}>Premium Community</Text>
          </View>
        )}

        <View style={styles.headingArea}>
          <Text style={styles.title}>Your community is ready</Text>
          <Text style={styles.subtitle}>
            Start sharing prayer requests and invite others when you're ready.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPrimaryPressed]}
            onPress={handleGoToCommunity}
            testID="go-to-community"
          >
            <Text style={styles.primaryBtnText}>Go to community</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnSecondaryPressed]}
            onPress={handleInvite}
            testID="invite-others"
          >
            <Text style={styles.secondaryBtnText}>Invite others</Text>
          </Pressable>
        </View>

        <Text style={styles.footnote}>
          You can always invite people later from your community page.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    inner: {
      flex: 1,
      paddingHorizontal: 28,
      paddingBottom: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    iconArea: { marginBottom: 32 },
    iconCircle: {
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
    },
    emoji: { fontSize: 52 },
    headingArea: { gap: 14, marginBottom: 44, alignItems: "center" },
    title: {
      fontSize: 32,
      fontWeight: "800" as const,
      color: colors.foreground,
      lineHeight: 40,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 16,
      color: colors.mutedForeground,
      lineHeight: 24,
      textAlign: "center",
      maxWidth: 300,
    },
    actions: { width: "100%", gap: 12 },
    primaryBtn: {
      height: 66,
      backgroundColor: colors.primary,
      borderRadius: 22,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 8,
    },
    btnPrimaryPressed: { opacity: 0.9 },
    primaryBtnText: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
    },
    secondaryBtn: {
      height: 58,
      backgroundColor: colors.card,
      borderRadius: 18,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderWidth: 2,
      borderColor: colors.border,
    },
    btnSecondaryPressed: { opacity: 0.8 },
    secondaryBtnText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.foreground,
    },
    premiumBadge: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      backgroundColor: colors.primary + "18",
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      alignSelf: "center" as const,
      marginBottom: 20,
    },
    premiumBadgeText: {
      fontSize: 13,
      fontWeight: "700" as const,
      color: colors.primary,
    },
    footnote: {
      marginTop: 28,
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 19,
    },
  });
}
