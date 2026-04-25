import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, MessageCircle, Phone } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

export default function InvitePreviewScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}><ArrowLeft size={20} color={colors.secondaryForeground} /></Pressable>
        <Text style={styles.title}>Preview Invite</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.avatarGroup}>
          <Image source={{ uri: "https://randomuser.me/api/portraits/women/42.jpg" }} style={styles.avatarLeft} />
          <View style={styles.callCircle}><Phone size={22} color={colors.primaryForeground} /></View>
          <Image source={{ uri: "https://randomuser.me/api/portraits/men/12.jpg" }} style={styles.avatarRight} />
        </View>
        <Text style={styles.invitingText}>Inviting Chris Evans</Text>

        <View style={styles.previewCard}>
          <View style={styles.previewBadge}><Text style={styles.previewBadgeText}>SMS Preview</Text></View>
          <Text style={styles.previewBody}>{`"Hey Chris! I just used an app called PrayerPal to record a prayer for you. I'd love for you to join me on there so you can see when I'm lifting you up! 🙏 Download it here: prayerpal.app/invite/u123"`}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.smsBtn} onPress={() => Alert.alert("SMS", "Opening SMS app...", [{ text: "Cancel", style: "cancel" }, { text: "Send", onPress: () => router.push("/invite-sent") }])}>
            <MessageCircle size={20} color={colors.primaryForeground} />
            <Text style={styles.smsBtnText}>Send Invite via SMS</Text>
          </Pressable>
          <Pressable style={styles.whatsappBtn} onPress={() => Alert.alert("WhatsApp", "Opening WhatsApp...", [{ text: "Cancel", style: "cancel" }, { text: "Send", onPress: () => router.push("/invite-sent") }])}>
            <Text style={styles.whatsappIcon}>WhatsApp</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 19, fontWeight: "700" as const, color: colors.foreground },
    body: { flex: 1, paddingHorizontal: 24, paddingTop: 20, gap: 28 },
    avatarGroup: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
    avatarLeft: { width: 64, height: 64, borderRadius: 32, borderWidth: 4, borderColor: colors.background, zIndex: 1 },
    callCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: colors.background, zIndex: 2, marginHorizontal: -12 },
    avatarRight: { width: 64, height: 64, borderRadius: 32, borderWidth: 4, borderColor: colors.background, zIndex: 1 },
    invitingText: { textAlign: "center", fontSize: 16, fontWeight: "700" as const, color: colors.foreground, marginTop: -12 },
    previewCard: { backgroundColor: colors.card, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: colors.primary + "20", position: "relative", paddingTop: 28 },
    previewBadge: { position: "absolute", top: -14, left: 24, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
    previewBadgeText: { fontSize: 10, fontWeight: "700" as const, color: colors.primaryForeground, textTransform: "uppercase", letterSpacing: 1 },
    previewBody: { fontSize: 14, color: colors.foreground, lineHeight: 22, fontStyle: "italic" },
    actions: { gap: 14, marginTop: "auto" as any, paddingBottom: 20 },
    smsBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 999, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    smsBtnText: { fontSize: 15, fontWeight: "700" as const, color: colors.primaryForeground },
    whatsappBtn: { alignItems: "center", justifyContent: "center", paddingVertical: 18, borderRadius: 999, backgroundColor: "#25D366" },
    whatsappIcon: { fontSize: 15, fontWeight: "700" as const, color: "#fff" },
  });
}
