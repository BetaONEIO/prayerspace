import React, { useState, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Platform } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { ChevronLeft, MoreHorizontal, Heart, MessageCircle, Sun, Users } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { allContacts } from "@/mocks/data";

const GREEN = "#34C759";

export default function OtherUserProfileScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isFavourited, setIsFavourited] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  const handleFavourite = () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newVal = !isFavourited;
    setIsFavourited(newVal);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.35, useNativeDriver: true, friction: 3 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
    if (newVal) {
      setShowTooltip(true);
      Animated.sequence([
        Animated.timing(tooltipOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(tooltipOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setShowTooltip(false));
    }
  };

  const user = allContacts.find((c) => c.id === id) ?? { name: "Michael Scott", avatar: "https://randomuser.me/api/portraits/men/32.jpg", status: "online" as const };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}><ChevronLeft size={20} color={colors.secondaryForeground} /></Pressable>
        <Pressable style={styles.moreBtn}><MoreHorizontal size={20} color={colors.secondaryForeground} /></Pressable>
      </View>

      <AutoScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
            {user.status === "online" && <View style={styles.onlineDot} />}
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.location}>Scranton, PA</Text>

          <View style={styles.actionRow}>
            <Pressable style={styles.messageBtn} onPress={() => router.push(`/chat/${id ?? "c10"}`)}>
              <MessageCircle size={18} color={colors.primaryForeground} />
              <Text style={styles.messageBtnText}>Message</Text>
            </Pressable>
            <View style={styles.favWrap}>
              <Pressable style={styles.heartCircle} onPress={handleFavourite}>
                <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                  <Heart size={22} color={isFavourited ? colors.primary : colors.secondaryForeground} fill={isFavourited ? colors.primary : "none"} />
                </Animated.View>
              </Pressable>
              {showTooltip && (
                <Animated.View style={[styles.tooltip, { opacity: tooltipOpacity }]}>
                  <View style={styles.tooltipArrow} />
                  <Text style={styles.tooltipText}>Added to Favourites</Text>
                </Animated.View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          {[{ num: "1.2k", label: "PRAYERS" }, { num: "843", label: "FOLLOWERS" }, { num: "15", label: "GROUPS" }].map(({ num, label }) => (
            <View key={label} style={styles.statCard}>
              <Text style={styles.statNum}>{num}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityRow}>
              <View style={styles.activityIcon}><Sun size={18} color={colors.accentForeground} /></View>
              <View><Text style={styles.activityText}>Shared a new testimony</Text><Text style={styles.activityTime}>Yesterday, 4:30 PM</Text></View>
            </View>
            <View style={styles.activityDivider} />
            <View style={styles.activityRow}>
              <View style={[styles.activityIcon, { backgroundColor: colors.secondary }]}><Users size={18} color={colors.secondaryForeground} /></View>
              <View><Text style={styles.activityText}>Joined Morning Prayer Circle</Text><Text style={styles.activityTime}>2 days ago</Text></View>
            </View>
          </View>
        </View>

        <View style={styles.verseCard}>
          <Text style={styles.verseText}>"Trust in the Lord with all your heart..."</Text>
          <Text style={styles.verseAuthor}>— {user.name}'s favorite verse</Text>
        </View>

        <View style={{ height: 40 }} />
      </AutoScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 14 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: "center" as const, justifyContent: "center" as const },
    moreBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: "center" as const, justifyContent: "center" as const },
    scrollContent: { paddingHorizontal: 24 },
    profileSection: { alignItems: "center" as const, marginBottom: 24 },
    avatarWrap: { position: "relative" as const, marginBottom: 14 },
    avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: colors.card },
    onlineDot: { position: "absolute" as const, bottom: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: GREEN, borderWidth: 3, borderColor: colors.card },
    name: { fontSize: 24, fontWeight: "800" as const, color: colors.foreground },
    location: { fontSize: 14, color: colors.mutedForeground, marginTop: 4, marginBottom: 18 },
    actionRow: { flexDirection: "row", alignItems: "center", gap: 12, width: "100%" },
    messageBtn: { flex: 1, flexDirection: "row", alignItems: "center" as const, justifyContent: "center" as const, gap: 8, backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 999, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    messageBtnText: { fontSize: 15, fontWeight: "700" as const, color: colors.primaryForeground },
    heartCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.secondary, alignItems: "center" as const, justifyContent: "center" as const },
    favWrap: { position: "relative" as const },
    tooltip: { position: "absolute" as const, bottom: 64, right: -10, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, minWidth: 140, alignItems: "center" as const },
    tooltipArrow: { position: "absolute" as const, bottom: -6, right: 24, width: 12, height: 12, backgroundColor: colors.primary, transform: [{ rotate: "45deg" }] },
    tooltipText: { color: colors.primaryForeground, fontSize: 13, fontWeight: "700" as const },
    statsRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
    statCard: { flex: 1, backgroundColor: colors.card, padding: 16, borderRadius: 24, alignItems: "center" as const, borderWidth: 1, borderColor: colors.border + "80" },
    statNum: { fontSize: 20, fontWeight: "800" as const, color: colors.foreground },
    statLabel: { fontSize: 9, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 0.5, marginTop: 4 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 11, fontWeight: "800" as const, color: colors.mutedForeground, letterSpacing: 1.5, marginBottom: 12 },
    activityCard: { backgroundColor: colors.card, borderRadius: 24, overflow: "hidden" as const, borderWidth: 1, borderColor: colors.border + "50" },
    activityRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
    activityIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: "center" as const, justifyContent: "center" as const },
    activityText: { fontSize: 14, fontWeight: "500" as const, color: colors.foreground },
    activityTime: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
    activityDivider: { height: 1, backgroundColor: colors.border + "50", marginHorizontal: 16 },
    verseCard: { backgroundColor: colors.secondary, borderRadius: 28, padding: 24, alignItems: "center" as const, borderWidth: 1, borderColor: colors.primary + "08" },
    verseText: { fontSize: 14, fontWeight: "500" as const, color: colors.secondaryForeground, textAlign: "center" as const, marginBottom: 12, lineHeight: 22 },
    verseAuthor: { fontSize: 12, fontWeight: "700" as const, color: colors.primary, letterSpacing: 1 },
  });
}
