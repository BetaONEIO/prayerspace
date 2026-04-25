import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { Image } from "expo-image";
import { MessageCircle, Mic, Users, Mail, Star, CheckCircle } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

const GREEN = "#34C759";
const MUTUAL_AVATARS = [
  "https://randomuser.me/api/portraits/men/45.jpg",
  "https://randomuser.me/api/portraits/women/67.jpg",
  "https://randomuser.me/api/portraits/men/22.jpg",
];

export default function UserInfoSheetScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { userName, userAvatar, userBio, userLocation } = useLocalSearchParams<{ userName?: string; userAvatar?: string; userBio?: string; userLocation?: string }>();

  const name = userName ?? "Sarah Jenkins";
  const avatar = userAvatar ?? "https://randomuser.me/api/portraits/women/44.jpg";
  const bio = userBio ?? "Always seeking His light";
  const location = userLocation ?? "Seattle, WA";

  const haptic = () => { if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <AutoScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.profileSection}>
            <View style={styles.avatarWrapper}>
              <Image source={{ uri: avatar }} style={styles.avatar} />
              <View style={styles.onlineDot} />
            </View>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.subtitle}>{bio} • {location}</Text>
            <View style={styles.badgeRow}>
              <Star size={11} color={colors.primary} fill={colors.primary} />
              <Text style={styles.badgeText}>Prayer Warrior</Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Pressable style={styles.actionBtnSecondary} onPress={() => { haptic(); router.back(); }}>
              <View style={styles.actionIconWrapper}><MessageCircle size={22} color={colors.primary} /></View>
              <Text style={styles.actionBtnSecondaryLabel}>Message</Text>
            </Pressable>
            <Pressable style={styles.actionBtnPrimary} onPress={() => { haptic(); router.back(); router.push("/(tabs)/pray"); }}>
              <View style={styles.actionIconWrapperPrimary}><Mic size={22} color={colors.primaryForeground} /></View>
              <Text style={styles.actionBtnPrimaryLabel}>Pray</Text>
            </Pressable>
            <Pressable style={styles.actionBtnSecondary} onPress={haptic}>
              <View style={styles.actionIconWrapper}><Users size={22} color={colors.primary} /></View>
              <Text style={styles.actionBtnSecondaryLabel}>Invite</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardLabel}>Connection Details</Text>
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}><Mail size={18} color={colors.primary} /><Text style={styles.detailValue}>sarah.j@faithmail.com</Text></View>
              <Pressable onPress={haptic}><Text style={styles.copyText}>Copy</Text></Pressable>
            </View>
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <View style={styles.detailLeft}><Text style={styles.whatsappEmoji}>💬</Text><Text style={styles.detailValue}>+1 (206) 555-0198</Text></View>
              <CheckCircle size={16} color={colors.primary} fill={colors.primary + "30"} />
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.mutualHeader}>
              <Text style={styles.cardLabel}>Mutual Community</Text>
              <View style={styles.mutualBadge}><Text style={styles.mutualBadgeText}>4 Mutual</Text></View>
            </View>
            <View style={styles.avatarsRow}>
              {MUTUAL_AVATARS.map((uri, i) => (
                <Image key={i} source={{ uri }} style={[styles.mutualAvatar, { marginLeft: i > 0 ? -12 : 0 }]} />
              ))}
              <View style={[styles.mutualAvatarExtra, { marginLeft: -12 }]}>
                <Text style={styles.mutualAvatarExtraText}>+12</Text>
              </View>
            </View>
          </View>
        </AutoScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.closeBtn} onPress={() => router.back()}><Text style={styles.closeBtnText}>Close</Text></Pressable>
          <Pressable style={styles.profileBtn} onPress={() => router.back()}><Text style={styles.profileBtnText}>View Full Profile</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingTop: 16, paddingHorizontal: 28, paddingBottom: Platform.OS === "ios" ? 40 : 28, borderTopWidth: 1, borderColor: colors.border + "40", maxHeight: "90%" },
    handle: { width: 44, height: 5, backgroundColor: colors.muted, borderRadius: 3, alignSelf: "center", marginBottom: 24 },
    scrollContent: { paddingBottom: 16 },
    profileSection: { alignItems: "center", marginBottom: 24 },
    avatarWrapper: { position: "relative", marginBottom: 14 },
    avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 4, borderColor: colors.card },
    onlineDot: { position: "absolute", bottom: 4, right: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: GREEN, borderWidth: 3, borderColor: colors.card },
    name: { fontSize: 22, fontWeight: "700" as const, color: colors.foreground, marginBottom: 4 },
    subtitle: { fontSize: 13, color: colors.mutedForeground, marginBottom: 12, textAlign: "center" },
    badgeRow: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.primary + "18", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
    badgeText: { fontSize: 10, fontWeight: "700" as const, color: colors.primary, textTransform: "uppercase", letterSpacing: 0.8 },
    actionsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
    actionBtnSecondary: { flex: 1, alignItems: "center", gap: 8, backgroundColor: colors.secondary, borderRadius: 20, paddingVertical: 16, borderWidth: 1, borderColor: colors.border + "50" },
    actionIconWrapper: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + "18", alignItems: "center", justifyContent: "center" },
    actionBtnSecondaryLabel: { fontSize: 10, fontWeight: "700" as const, color: colors.foreground, textTransform: "uppercase", letterSpacing: 0.5 },
    actionBtnPrimary: { flex: 1, alignItems: "center", gap: 8, backgroundColor: colors.primary, borderRadius: 20, paddingVertical: 16, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
    actionIconWrapperPrimary: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
    actionBtnPrimaryLabel: { fontSize: 10, fontWeight: "700" as const, color: colors.primaryForeground, textTransform: "uppercase", letterSpacing: 0.5 },
    card: { backgroundColor: colors.secondary, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: colors.border + "30", marginBottom: 12 },
    cardLabel: { fontSize: 9, fontWeight: "800" as const, color: colors.mutedForeground, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 },
    detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border + "30" },
    detailLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
    detailValue: { fontSize: 13, fontWeight: "600" as const, color: colors.foreground, flex: 1 },
    whatsappEmoji: { fontSize: 18 },
    copyText: { fontSize: 10, fontWeight: "700" as const, color: colors.primary, textTransform: "uppercase", letterSpacing: 0.8 },
    mutualHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    mutualBadge: { backgroundColor: colors.primary + "18", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
    mutualBadgeText: { fontSize: 10, fontWeight: "700" as const, color: colors.primary },
    avatarsRow: { flexDirection: "row", alignItems: "center" },
    mutualAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: colors.card },
    mutualAvatarExtra: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.muted, borderWidth: 2, borderColor: colors.card, alignItems: "center", justifyContent: "center" },
    mutualAvatarExtraText: { fontSize: 10, fontWeight: "700" as const, color: colors.mutedForeground },
    footer: { flexDirection: "row", gap: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.border + "20" },
    closeBtn: { flex: 1, backgroundColor: colors.secondary, borderRadius: 16, paddingVertical: 18, alignItems: "center", borderWidth: 1, borderColor: colors.border + "80" },
    closeBtnText: { fontSize: 14, fontWeight: "700" as const, color: colors.secondaryForeground },
    profileBtn: { flex: 2, backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 18, alignItems: "center", shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 },
    profileBtnText: { fontSize: 14, fontWeight: "700" as const, color: colors.primaryForeground },
  });
}
