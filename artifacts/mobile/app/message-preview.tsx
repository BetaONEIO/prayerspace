import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Info, Send } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

export default function MessagePreviewScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}><ArrowLeft size={20} color={colors.secondaryForeground} /></Pressable>
        <Text style={styles.title}>Notification Preview</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}><Send size={20} color={colors.primaryForeground} /></View>
            <View>
              <Text style={styles.cardTitle}>Message Content</Text>
              <Text style={styles.cardSub}>This is what they will see</Text>
            </View>
          </View>

          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{`"🙏 Just wanted to let you know I spent some time lifting you up in prayer today. Hope you're feeling blessed and at peace!"`}</Text>
          </View>

          <View style={styles.channelRow}>
            <Text style={styles.channelLabel}>Deliver via:</Text>
            <View style={styles.channelIcons}>
              {[{ bg: "#25D366", t: "W" }, { bg: "#4A90D9", t: "S" }, { bg: colors.primary, t: "E" }].map(({ bg, t }) => (
                <View key={t} style={[styles.channelIcon, { backgroundColor: bg }]}><Text style={styles.channelIconText}>{t}</Text></View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.infoBox}>
            <Info size={18} color={colors.primary} />
            <Text style={styles.infoText}>For contacts not on the app, we'll open your default messaging app with this text pre-filled.</Text>
          </View>
          <Pressable style={styles.sendBtn} onPress={() => Alert.alert("Sent!", "Notifications have been sent.", [{ text: "OK", onPress: () => router.push("/prayer-sent") }])}>
            <Text style={styles.sendBtnText}>Send Notifications</Text>
            <Send size={18} color={colors.primaryForeground} />
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
    body: { flex: 1, paddingHorizontal: 24, gap: 20 },
    card: { backgroundColor: colors.card, borderRadius: 28, padding: 24, borderWidth: 1, borderColor: colors.border + "60" },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
    iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
    cardTitle: { fontSize: 15, fontWeight: "700" as const, color: colors.foreground },
    cardSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    messageBox: { backgroundColor: colors.secondary, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.border + "50", marginBottom: 20 },
    messageText: { fontSize: 14, color: colors.foreground, lineHeight: 22, fontStyle: "italic" },
    channelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
    channelLabel: { fontSize: 11, fontWeight: "700" as const, color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.8 },
    channelIcons: { flexDirection: "row", gap: 6 },
    channelIcon: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    channelIconText: { fontSize: 10, fontWeight: "800" as const, color: "#fff" },
    footer: { marginTop: "auto" as any, gap: 14, paddingBottom: 12 },
    infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: colors.accent, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border },
    infoText: { flex: 1, fontSize: 11, color: colors.secondaryForeground, lineHeight: 17 },
    sendBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 999, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    sendBtnText: { fontSize: 15, fontWeight: "700" as const, color: colors.primaryForeground },
  });
}
