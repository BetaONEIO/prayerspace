import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import { ChevronLeft, Share2, MoreHorizontal, Mic, MessageCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

export default function PrayerDetailScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [prayerCount] = useState(15);

  const handlePrayNow = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/prayer-session");
  }, [router]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topGradient} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={() => router.back()}><ChevronLeft size={20} color={colors.foreground} /></Pressable>
          <View style={styles.headerRight}>
            <Pressable style={styles.headerBtn}><Share2 size={18} color={colors.foreground} /></Pressable>
            <Pressable style={styles.headerBtn}><MoreHorizontal size={18} color={colors.foreground} /></Pressable>
          </View>
        </View>

        <AutoScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.mainCard}>
            <View style={styles.authorRow}>
              <Image source={{ uri: "https://randomuser.me/api/portraits/women/68.jpg" }} style={styles.authorAvatar} />
              <View><Text style={styles.authorName}>Emma Wilson</Text><Text style={styles.postTime}>Posted 2 hours ago</Text></View>
            </View>

            <Text style={styles.requestTitle}>Prayer for my mother's surgery tomorrow</Text>
            <Text style={styles.requestBody}>"Please pray for my mother as she goes into heart surgery tomorrow morning. We're feeling anxious but trusting in God's peace. Pray for the surgeons' hands and a smooth recovery."</Text>

            <View style={styles.prayerCountRow}>
              <View style={styles.avatarStack}>
                <Image source={{ uri: "https://randomuser.me/api/portraits/men/32.jpg" }} style={styles.stackAvatar} />
                <Image source={{ uri: "https://randomuser.me/api/portraits/women/44.jpg" }} style={[styles.stackAvatar, { marginLeft: -8 }]} />
                <View style={[styles.stackCount, { marginLeft: -8 }]}><Text style={styles.stackCountText}>+12</Text></View>
              </View>
              <Text style={styles.prayerCountText}><Text style={styles.prayerCountBold}>{prayerCount} people</Text>{" "}are praying for this</Text>
            </View>
          </View>

          <View style={styles.updatesSection}>
            <View style={styles.updatesHeader}>
              <Text style={styles.updatesTitle}>Updates</Text>
              <Pressable><Text style={styles.addUpdateText}>Add update</Text></Pressable>
            </View>
            <View style={styles.updateCard}>
              <Text style={styles.updateLabel}>UPDATE · 1H AGO</Text>
              <Text style={styles.updateText}>"Surgery is scheduled for 8:00 AM. Thank you everyone for the support."</Text>
            </View>
          </View>
        </AutoScrollView>

        <SafeAreaView edges={["bottom"]} style={styles.bottomBar}>
          <Pressable style={styles.prayNowBtn} onPress={handlePrayNow}>
            <Mic size={22} color={colors.primaryForeground} />
            <Text style={styles.prayNowText}>Pray Now</Text>
          </Pressable>
          <Pressable style={styles.chatBtn}><MessageCircle size={24} color={colors.secondaryForeground} /></Pressable>
        </SafeAreaView>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topGradient: { position: "absolute" as const, top: 0, left: 0, right: 0, height: 260, backgroundColor: colors.primary + "0A" },
    safeArea: { flex: 1 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 14 },
    headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card + "CC", alignItems: "center" as const, justifyContent: "center" as const },
    headerRight: { flexDirection: "row", gap: 8 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 120 },
    mainCard: { backgroundColor: colors.card, borderRadius: 28, padding: 28, borderWidth: 1, borderColor: colors.border + "30", marginBottom: 28 },
    authorRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
    authorAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.card },
    authorName: { fontSize: 18, fontWeight: "800" as const, color: colors.foreground },
    postTime: { fontSize: 12, color: colors.mutedForeground, fontWeight: "500" as const, marginTop: 2 },
    requestTitle: { fontSize: 22, fontWeight: "700" as const, color: colors.foreground, marginBottom: 14, lineHeight: 30 },
    requestBody: { fontSize: 15, color: colors.secondaryForeground, lineHeight: 24, marginBottom: 22 },
    prayerCountRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 18, borderTopWidth: 1, borderTopColor: colors.border + "50" },
    avatarStack: { flexDirection: "row", alignItems: "center" },
    stackAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: colors.card },
    stackCount: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.card, alignItems: "center" as const, justifyContent: "center" as const },
    stackCountText: { fontSize: 9, fontWeight: "700" as const, color: colors.accentForeground },
    prayerCountText: { fontSize: 13, color: colors.mutedForeground, flex: 1 },
    prayerCountBold: { fontWeight: "700" as const, color: colors.primary },
    updatesSection: { gap: 14 },
    updatesHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    updatesTitle: { fontSize: 18, fontWeight: "700" as const, color: colors.foreground },
    addUpdateText: { fontSize: 13, fontWeight: "700" as const, color: colors.primary },
    updateCard: { backgroundColor: colors.card, padding: 18, borderRadius: 24, borderWidth: 1, borderColor: colors.border + "30" },
    updateLabel: { fontSize: 10, fontWeight: "700" as const, color: colors.primary, letterSpacing: 1, marginBottom: 8 },
    updateText: { fontSize: 14, color: colors.foreground, fontStyle: "italic" as const, lineHeight: 22 },
    bottomBar: { position: "absolute" as const, bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 12, paddingHorizontal: 24, paddingTop: 16, backgroundColor: colors.background },
    prayNowBtn: { flex: 1, flexDirection: "row", alignItems: "center" as const, justifyContent: "center" as const, gap: 10, backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 999, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
    prayNowText: { fontSize: 16, fontWeight: "700" as const, color: colors.primaryForeground },
    chatBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.secondary, alignItems: "center" as const, justifyContent: "center" as const },
  });
}
