import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Platform, Alert, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Gift, UserPlus } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import * as Haptics from "expo-haptics";

const INVITE_MESSAGE =
  "Hey! I've been using Prayer Space to share prayer requests and stay connected. Join me! 🙏";

export default function InviteContactsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const haptic = () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleShareLink = () => {
    haptic();
    // Share via system share sheet when available
    if (Platform.OS === "web") {
      Alert.alert("Share", "Copy the App Store / Play Store link and share it with a friend.");
      return;
    }
    Linking.openURL(
      `sms:?body=${encodeURIComponent(INVITE_MESSAGE)}`
    ).catch(() => {
      Alert.alert("Unavailable", "Could not open messaging app.");
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Invite Friends</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.secondaryForeground} />
        </Pressable>
      </View>

      <View style={styles.bannerCard}>
        <View style={styles.giftCircle}>
          <Gift size={26} color={colors.primaryForeground} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Invite a friend</Text>
          <Text style={styles.bannerSub}>
            Share Prayer Space and pray together.
          </Text>
        </View>
      </View>

      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <UserPlus size={32} color={colors.mutedForeground} />
        </View>
        <Text style={styles.emptyTitle}>Share Prayer Space</Text>
        <Text style={styles.emptyBody}>
          Invite friends by sending them a link via text or any messaging app.
        </Text>
        <Pressable style={styles.shareBtn} onPress={handleShareLink}>
          <Text style={styles.shareBtnText}>Send Invite</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 16,
    },
    title: { fontSize: 20, fontWeight: "800" as const, color: colors.foreground },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    bannerCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
      marginHorizontal: 24,
      padding: 20,
      borderRadius: 24,
      backgroundColor: colors.primary,
      marginBottom: 32,
    },
    giftCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    bannerTitle: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
      marginBottom: 4,
    },
    bannerSub: {
      fontSize: 13,
      color: colors.primaryForeground + "CC",
      lineHeight: 18,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 40,
      gap: 12,
    },
    emptyIcon: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "700" as const,
      color: colors.foreground,
      textAlign: "center",
    },
    emptyBody: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 22,
    },
    shareBtn: {
      marginTop: 16,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingHorizontal: 32,
      paddingVertical: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 4,
    },
    shareBtnText: { fontSize: 15, fontWeight: "700" as const, color: colors.primaryForeground },
  });
}
