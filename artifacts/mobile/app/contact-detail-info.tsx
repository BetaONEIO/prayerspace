import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Image } from "expo-image";
import { CheckCheck, Home, MessageCircle, Shield } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

export default function ContactDetailInfoScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { contactName, contactAvatar } = useLocalSearchParams<{ contactName?: string; contactAvatar?: string }>();

  const name = contactName ?? "Michael Scott";
  const avatar = contactAvatar ?? "https://randomuser.me/api/portraits/men/32.jpg";

  const handleSelect = () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
  };

  const channels = [
    { id: "app", label: "In-App", icon: Home, color: colors.primary, bg: colors.primary + "18", active: true },
    { id: "whatsapp", label: "WhatsApp", emoji: "💬", color: "#25D366", bg: "#25D36618", active: false },
    { id: "sms", label: "SMS", icon: MessageCircle, color: "#4A90D9", bg: "#4A90D918", active: true },
  ];

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={() => router.back()} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: avatar }} style={styles.avatar} />
            <View style={styles.checkBadge}><CheckCheck size={10} color={colors.primaryForeground} /></View>
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.role}>Regional Manager</Text>
          <View style={styles.memberBadge}>
            <Shield size={12} color={colors.primary} />
            <Text style={styles.memberBadgeText}>Prayer Space Member</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoCardLabel}>Contact Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Source</Text>
            <View style={styles.infoValueRow}><Text style={styles.whatsappEmoji}>💬</Text><Text style={styles.infoValue}>WhatsApp</Text></View>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoKey}>Phone</Text>
            <Text style={styles.infoValue}>+1 (555) 0123-4567</Text>
          </View>
        </View>

        <View style={styles.channelsCard}>
          <Text style={styles.infoCardLabel}>Available Channels</Text>
          <View style={styles.channelsRow}>
            {channels.map((c) => (
              <View key={c.id} style={[styles.channelItem, !c.active && styles.channelItemInactive]}>
                <View style={[styles.channelIcon, { backgroundColor: c.bg }]}>
                  {c.emoji ? <Text style={styles.channelEmoji}>{c.emoji}</Text> : c.icon ? <c.icon size={18} color={c.color} /> : null}
                </View>
                <Text style={styles.channelLabel}>{c.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.dismissBtn} onPress={() => router.back()}><Text style={styles.dismissBtnText}>Dismiss</Text></Pressable>
          <Pressable style={styles.selectBtn} onPress={handleSelect}><Text style={styles.selectBtnText}>Select</Text></Pressable>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-end" },
    backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
    sheet: { backgroundColor: colors.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, paddingBottom: Platform.OS === "ios" ? 40 : 28, borderTopWidth: 1, borderColor: colors.border + "40" },
    handle: { width: 40, height: 4, backgroundColor: colors.muted, borderRadius: 2, alignSelf: "center", marginBottom: 24 },
    profileSection: { alignItems: "center", marginBottom: 20 },
    avatarWrapper: { position: "relative", marginBottom: 14 },
    avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 4, borderColor: colors.card },
    checkBadge: { position: "absolute", bottom: 2, right: 2, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: colors.card },
    name: { fontSize: 22, fontWeight: "700" as const, color: colors.foreground, marginBottom: 4 },
    role: { fontSize: 14, color: colors.mutedForeground, marginBottom: 10 },
    memberBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: colors.primary + "18", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
    memberBadgeText: { fontSize: 10, fontWeight: "700" as const, color: colors.primary, textTransform: "uppercase", letterSpacing: 0.8 },
    infoCard: { backgroundColor: colors.secondary, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border + "30", marginBottom: 12 },
    infoCardLabel: { fontSize: 9, fontWeight: "800" as const, color: colors.mutedForeground, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 },
    infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border + "30" },
    infoKey: { fontSize: 13, color: colors.mutedForeground },
    infoValueRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    whatsappEmoji: { fontSize: 14 },
    infoValue: { fontSize: 13, fontWeight: "700" as const, color: colors.foreground },
    channelsCard: { backgroundColor: colors.secondary, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border + "30", marginBottom: 20 },
    channelsRow: { flexDirection: "row", gap: 10 },
    channelItem: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 12, alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.border + "60" },
    channelItemInactive: { opacity: 0.35 },
    channelIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    channelEmoji: { fontSize: 18 },
    channelLabel: { fontSize: 10, fontWeight: "700" as const, color: colors.foreground },
    actionRow: { flexDirection: "row", gap: 12 },
    dismissBtn: { flex: 1, backgroundColor: colors.secondary, borderRadius: 14, paddingVertical: 18, alignItems: "center", borderWidth: 1, borderColor: colors.border + "80" },
    dismissBtnText: { fontSize: 14, fontWeight: "700" as const, color: colors.secondaryForeground },
    selectBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 18, alignItems: "center", shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 },
    selectBtnText: { fontSize: 14, fontWeight: "700" as const, color: colors.primaryForeground },
  });
}
