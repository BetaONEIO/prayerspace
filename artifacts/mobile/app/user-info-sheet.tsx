import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AutoScrollView } from "@/components/AutoScrollView";
import { Image } from "expo-image";
import { MessageCircle, Mic, Users, User } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

export default function UserInfoSheetScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);
  const { userName, userAvatar, userBio, userId } = useLocalSearchParams<{
    userName?: string;
    userAvatar?: string;
    userBio?: string;
    userId?: string;
  }>();

  const haptic = () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const displayName = userName?.trim() || "Prayer Space User";
  const hasAvatar = Boolean(userAvatar);
  const hasBio = Boolean(userBio?.trim());

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <AutoScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.profileSection}>
            <View style={styles.avatarWrapper}>
              {hasAvatar ? (
                <Image source={{ uri: userAvatar }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <User size={36} color={colors.mutedForeground} />
                </View>
              )}
            </View>
            <Text style={styles.name}>{displayName}</Text>
            {hasBio ? (
              <Text style={styles.subtitle}>{userBio}</Text>
            ) : null}
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              style={styles.actionBtnSecondary}
              onPress={() => { haptic(); router.back(); }}
            >
              <View style={styles.actionIconWrapper}>
                <MessageCircle size={22} color={colors.primary} />
              </View>
              <Text style={styles.actionBtnSecondaryLabel}>Message</Text>
            </Pressable>
            <Pressable
              style={styles.actionBtnPrimary}
              onPress={() => { haptic(); router.back(); router.push("/(tabs)/pray"); }}
            >
              <View style={styles.actionIconWrapperPrimary}>
                <Mic size={22} color={colors.primaryForeground} />
              </View>
              <Text style={styles.actionBtnPrimaryLabel}>Pray</Text>
            </Pressable>
            <Pressable style={styles.actionBtnSecondary} onPress={haptic}>
              <View style={styles.actionIconWrapper}>
                <Users size={22} color={colors.primary} />
              </View>
              <Text style={styles.actionBtnSecondaryLabel}>Invite</Text>
            </Pressable>
          </View>
        </AutoScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.closeBtn} onPress={() => router.back()}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
          <Pressable
            style={styles.profileBtn}
            onPress={() => {
              router.back();
              if (userId) router.push(`/user/${userId}` as never);
            }}
          >
            <Text style={styles.profileBtnText}>View Full Profile</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors, insetsBottom: number) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
    sheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 36,
      borderTopRightRadius: 36,
      paddingTop: 16,
      paddingHorizontal: 28,
      paddingBottom: insetsBottom + 20,
      borderTopWidth: 1,
      borderColor: colors.border + "40",
      maxHeight: "80%",
    },
    handle: {
      width: 44,
      height: 5,
      backgroundColor: colors.muted,
      borderRadius: 3,
      alignSelf: "center",
      marginBottom: 24,
    },
    scrollContent: { paddingBottom: 16 },
    profileSection: { alignItems: "center", marginBottom: 24 },
    avatarWrapper: { position: "relative", marginBottom: 14 },
    avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: colors.card },
    avatarPlaceholder: {
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    name: { fontSize: 22, fontWeight: "700" as const, color: colors.foreground, marginBottom: 4, textAlign: "center" },
    subtitle: {
      fontSize: 13,
      color: colors.mutedForeground,
      marginBottom: 12,
      textAlign: "center",
      lineHeight: 20,
    },
    actionsRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
    actionBtnSecondary: {
      flex: 1,
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.secondary,
      borderRadius: 20,
      paddingVertical: 16,
      borderWidth: 1,
      borderColor: colors.border + "50",
    },
    actionIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + "18",
      alignItems: "center",
      justifyContent: "center",
    },
    actionBtnSecondaryLabel: {
      fontSize: 10,
      fontWeight: "700" as const,
      color: colors.foreground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    actionBtnPrimary: {
      flex: 1,
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 20,
      paddingVertical: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 4,
    },
    actionIconWrapperPrimary: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    actionBtnPrimaryLabel: {
      fontSize: 10,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    footer: {
      flexDirection: "row",
      gap: 12,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border + "20",
    },
    closeBtn: {
      flex: 1,
      backgroundColor: colors.secondary,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border + "80",
    },
    closeBtnText: { fontSize: 14, fontWeight: "700" as const, color: colors.secondaryForeground },
    profileBtn: {
      flex: 2,
      backgroundColor: colors.primary,
      borderRadius: 16,
      paddingVertical: 18,
      alignItems: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 4,
    },
    profileBtnText: { fontSize: 14, fontWeight: "700" as const, color: colors.primaryForeground },
  });
}
