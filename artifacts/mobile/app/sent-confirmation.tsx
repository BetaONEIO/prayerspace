import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckCircle, Home, MessageCircle, Globe } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useSelectedRecipients } from "@/providers/SelectedRecipientsProvider";

export default function SentConfirmationScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { sendToFeed, recipientCount: recipientCountParam } = useLocalSearchParams<{ sendToFeed?: string; recipientCount?: string }>();
  const isFeedOnly = sendToFeed === "true" && (recipientCountParam === "0" || !recipientCountParam);
  const { selectedRecipients } = useSelectedRecipients();

  const deliveryItems = useMemo(() => {
    const appCount = selectedRecipients.filter((r) => r.onApp).length;
    const whatsappCount = selectedRecipients.filter((r) => !r.onApp && r.source === "whatsapp").length;
    const smsCount = selectedRecipients.filter((r) => !r.onApp && r.source === "sim").length;
    const items: { id: string; label: string; count: string; icon?: typeof Home; emoji?: string; color: string; bg: string }[] = [];
    if (appCount > 0) items.push({ id: "app", label: "In Prayer Space", count: `${appCount} sent`, icon: Home, color: colors.primary, bg: colors.primary + "18" });
    if (whatsappCount > 0) items.push({ id: "whatsapp", label: "WhatsApp", count: `${whatsappCount} prepared`, emoji: "💬", color: "#25D366", bg: "#25D36618" });
    if (smsCount > 0) items.push({ id: "sms", label: "SMS", count: `${smsCount} sent`, icon: MessageCircle, color: colors.mutedForeground, bg: colors.muted });
    return items;
  }, [selectedRecipients, colors]);

  const totalCount = isFeedOnly ? 0 : selectedRecipients.length;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pingAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(pingAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      Animated.delay(1000),
    ])).start();
  }, [scaleAnim, pingAnim]);

  const pingScale = pingAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });
  const pingOpacity = pingAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.1, 0] });

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.main}>
        <View style={styles.iconWrapper}>
          <Animated.View style={[styles.ping, { transform: [{ scale: pingScale }], opacity: pingOpacity }]} />
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <CheckCircle size={56} color={colors.primary} fill={colors.primary} />
          </Animated.View>
        </View>

        <Text style={styles.title}>Prayer sent</Text>

        {isFeedOnly ? (
          <Text style={styles.subtitle}>Your prayer was successfully shared to the feed</Text>
        ) : (
          <Text style={styles.subtitle}>
            Your prayer was successfully shared with{" "}
            <Text style={styles.subtitleBold}>{totalCount} {totalCount === 1 ? "person" : "people"}</Text>
          </Text>
        )}

        {isFeedOnly ? (
          <View style={styles.feedCard}>
            <View style={styles.feedCardIcon}>
              <Globe size={22} color={colors.primary} />
            </View>
            <View style={styles.feedCardText}>
              <Text style={styles.feedCardTitle}>Shared with Community</Text>
              <Text style={styles.feedCardSub}>Your prayer is now visible on the community feed</Text>
            </View>
          </View>
        ) : (
          deliveryItems.length > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>DELIVERY SUMMARY</Text>
              {deliveryItems.map((item) => (
                <View key={item.id} style={styles.summaryRow}>
                  <View style={[styles.summaryIcon, { backgroundColor: item.bg }]}>
                    {item.emoji ? <Text style={styles.summaryEmoji}>{item.emoji}</Text>
                      : item.icon ? <item.icon size={16} color={item.color} /> : null}
                  </View>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                  <Text style={styles.summaryCount}>{item.count}</Text>
                </View>
              ))}
            </View>
          )
        )}
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.doneBtn} onPress={() => router.replace("/(tabs)/(home)" as never)}>
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
        <Pressable style={styles.sendAnotherBtn} onPress={() => router.replace("/(tabs)/pray" as never)}>
          <Text style={styles.sendAnotherBtnText}>Send another</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    main: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
    iconWrapper: { width: 100, height: 100, alignItems: "center", justifyContent: "center", marginBottom: 24 },
    ping: { position: "absolute", width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary + "30" },
    title: { fontSize: 28, fontWeight: "700" as const, color: colors.foreground, textAlign: "center", marginBottom: 10 },
    subtitle: { fontSize: 15, color: colors.mutedForeground, textAlign: "center", lineHeight: 22, marginBottom: 28 },
    subtitleBold: { color: colors.foreground, fontWeight: "700" as const },
    feedCard: { width: "100%", backgroundColor: colors.primary + "12", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.primary + "25", flexDirection: "row", alignItems: "center", gap: 14 },
    feedCardIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary + "20", alignItems: "center", justifyContent: "center" },
    feedCardText: { flex: 1 },
    feedCardTitle: { fontSize: 14, fontWeight: "700" as const, color: colors.foreground, marginBottom: 3 },
    feedCardSub: { fontSize: 12, color: colors.mutedForeground, lineHeight: 17 },
    summaryCard: { width: "100%", backgroundColor: colors.card, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: colors.border + "60", gap: 14 },
    summaryTitle: { fontSize: 10, fontWeight: "800" as const, color: colors.mutedForeground, letterSpacing: 1.5, textTransform: "uppercase" },
    summaryRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    summaryIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    summaryEmoji: { fontSize: 16 },
    summaryLabel: { flex: 1, fontSize: 14, color: colors.foreground },
    summaryCount: { fontSize: 13, fontWeight: "700" as const, color: colors.foreground },
    footer: { padding: 24, paddingBottom: 16, gap: 12 },
    doneBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 18, alignItems: "center", shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 },
    doneBtnText: { fontSize: 16, fontWeight: "700" as const, color: colors.primaryForeground },
    sendAnotherBtn: { backgroundColor: colors.secondary, borderRadius: 16, paddingVertical: 18, alignItems: "center", borderWidth: 1, borderColor: colors.border + "80" },
    sendAnotherBtnText: { fontSize: 16, fontWeight: "700" as const, color: colors.secondaryForeground },
  });
}
