import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Platform, Alert } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import { ChevronLeft, Share2, MoreHorizontal, Mic, MessageCircle, CalendarCheck } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import PrayerFollowUpModal, { type FollowUpOption } from "@/components/PrayerFollowUpModal";
import { formatPrayerDate, isDatePassed } from "@/lib/prayerDateUtils";

const MOCK_EVENT_DATE = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

export default function PrayerDetailScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [prayerCount] = useState(15);
  const [followUpVisible, setFollowUpVisible] = useState(false);
  const [followUpDone, setFollowUpDone] = useState(false);

  const eventDate = MOCK_EVENT_DATE;
  const datePassed = isDatePassed(eventDate);

  const handlePrayNow = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/prayer-session");
  }, [router]);

  const handleFollowUpOption = useCallback((option: FollowUpOption) => {
    setFollowUpDone(true);
    if (option === "share_update") {
      Alert.alert("Share Update", "This would open the status update form.");
    } else if (option === "mark_answered") {
      Alert.alert("Answered! 🙏", "This prayer has been marked as answered. Praise God!");
    } else if (option === "still_need_prayer") {
      Alert.alert("Still Need Prayer", "Your request will stay active for continued prayer.");
    } else if (option === "archive") {
      Alert.alert("Archived", "This prayer request has been archived.");
    }
  }, []);

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

            <View style={styles.eventDateRow}>
              <CalendarCheck size={14} color={colors.primary} />
              <Text style={styles.eventDateText}>
                Prayer date: {formatPrayerDate(eventDate)}
              </Text>
            </View>

            <View style={styles.prayerCountRow}>
              <View style={styles.avatarStack}>
                <Image source={{ uri: "https://randomuser.me/api/portraits/men/32.jpg" }} style={styles.stackAvatar} />
                <Image source={{ uri: "https://randomuser.me/api/portraits/women/44.jpg" }} style={[styles.stackAvatar, { marginLeft: -8 }]} />
                <View style={[styles.stackCount, { marginLeft: -8 }]}><Text style={styles.stackCountText}>+12</Text></View>
              </View>
              <Text style={styles.prayerCountText}><Text style={styles.prayerCountBold}>{prayerCount} people</Text>{" "}are praying for this</Text>
            </View>
          </View>

          {datePassed && !followUpDone && (
            <Pressable style={styles.followUpBanner} onPress={() => setFollowUpVisible(true)}>
              <View style={styles.followUpBannerLeft}>
                <Text style={styles.followUpEmoji}>🌿</Text>
                <View>
                  <Text style={styles.followUpTitle}>How did this go?</Text>
                  <Text style={styles.followUpSub}>The prayer date has passed — share an update</Text>
                </View>
              </View>
              <Text style={styles.followUpCta}>Update →</Text>
            </Pressable>
          )}

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

      <PrayerFollowUpModal
        visible={followUpVisible}
        onClose={() => setFollowUpVisible(false)}
        onOption={handleFollowUpOption}
        prayerSnippet="Please pray for my mother as she goes into heart surgery tomorrow morning..."
      />
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
    requestBody: { fontSize: 15, color: colors.secondaryForeground, lineHeight: 24, marginBottom: 16 },
    eventDateRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 18, backgroundColor: colors.primary + "10", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, alignSelf: "flex-start" as const },
    eventDateText: { fontSize: 12, fontWeight: "700" as const, color: colors.primary },
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
    followUpBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.primary + "10", borderRadius: 20, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.primary + "25" },
    followUpBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    followUpEmoji: { fontSize: 24 },
    followUpTitle: { fontSize: 15, fontWeight: "700" as const, color: colors.primary, marginBottom: 2 },
    followUpSub: { fontSize: 12, color: colors.mutedForeground, lineHeight: 16 },
    followUpCta: { fontSize: 13, fontWeight: "700" as const, color: colors.primary, marginLeft: 8 },
    bottomBar: { position: "absolute" as const, bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 12, paddingHorizontal: 24, paddingTop: 16, backgroundColor: colors.background },
    prayNowBtn: { flex: 1, flexDirection: "row", alignItems: "center" as const, justifyContent: "center" as const, gap: 10, backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 999, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
    prayNowText: { fontSize: 16, fontWeight: "700" as const, color: colors.primaryForeground },
    chatBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.secondary, alignItems: "center" as const, justifyContent: "center" as const },
  });
}
