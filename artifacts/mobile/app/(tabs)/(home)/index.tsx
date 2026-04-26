import React, { useCallback, useRef, useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
  FlatList,
  Platform,
  Modal,
} from "react-native";
import * as Haptics from "expo-haptics";
import { AutoScrollView } from '@/components/AutoScrollView';
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Bell,
  Mic,
  BookOpen,
  Flame,
  ChevronRight,
  CheckCircle,
  Plus,
  HandHeart,
  Menu,
  UserSearch,
  Inbox,
  Heart,
  X,
} from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import {
  receivedPrayerRequests,
  type ReceivedPrayerRequest,
  type ActivityItem,
} from "@/mocks/data";
import { formatPrayerDateLabel, daysUntil } from "@/lib/prayerDateUtils";
import { useFavourites } from "@/providers/FavouritesProvider";
import { useDailyVerse } from "@/hooks/useDailyVerse";
import NavigationDrawer from "@/components/NavigationDrawer";
import NotificationsPanel from "@/components/NotificationsPanel";
import StatusUpdateModal from "@/components/StatusUpdateModal";
import { useAuth } from "@/providers/AuthProvider";
import { usePrayer } from "@/providers/PrayerProvider";
import { useNotifications } from "@/providers/NotificationsProvider";
import { useTabSwipe } from "@/hooks/useTabSwipe";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { ThemeColors } from "@/constants/colors";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 17) return "Good afternoon,";
  return "Good evening,";
}

import { recentActivity as initialActivity } from "@/mocks/data";

export default function HomeScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { user, profile } = useAuth();
  const { stats } = usePrayer();
  const { hasBeenPrayed } = useNotifications();
  const { data: friendRequestCount } = useQuery<number>({
    queryKey: ["friend_requests_incoming_count", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count, error } = await supabase
        .from("friend_requests")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("status", "pending");
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
  const { verse, isLoading: verseLoading } = useDailyVerse();
  const { favourites, frequentlyPrayedFor } = useFavourites();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [notifVisible, setNotifVisible] = useState<boolean>(false);
  const [statusVisible, setStatusVisible] = useState<boolean>(false);
  const [activity, setActivity] = useState<ActivityItem[]>(initialActivity);
  const [thankToast, setThankToast] = useState<{ name: string } | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const displayName = profile?.full_name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Friend";
  const firstName = displayName.split(" ")[0];

  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  const handleOpenDrawer = useCallback(() => setDrawerVisible(true), []);
  const handleCloseDrawer = useCallback(() => setDrawerVisible(false), []);
  const handleOpenNotif = useCallback(() => setNotifVisible(true), []);
  const handleCloseNotif = useCallback(() => setNotifVisible(false), []);
  const handleOpenStatus = useCallback(() => setStatusVisible(true), []);
  const handleCloseStatus = useCallback(() => setStatusVisible(false), []);

  const showToast = useCallback((name: string) => {
    setThankToast({ name });
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setThankToast(null));
  }, [toastAnim]);

  const handleClearActivity = useCallback(() => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setActivity([]);
  }, []);

  const handleSendThanks = useCallback((item: ActivityItem) => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setActivity((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, thanksSent: true } : a))
    );
    showToast(item.contactName);
  }, [showToast]);

  const swipeHandlers = useTabSwipe(null, "/(tabs)/pray");

  const [verseVisible, setVerseVisible] = useState<boolean>(true);

  const handleStartPrayer = useCallback(() => {
    router.push("/(tabs)/pray");
  }, [router]);

  const renderPrayerRequest = useCallback(
    ({ item }: { item: ReceivedPrayerRequest }) => (
      <Pressable
        key={item.id}
        style={styles.pendingCard}
        onPress={() => router.push(`/received-prayer/${item.id}`)}
      >
        <View style={styles.pendingLeft}>
          <View style={styles.pendingAvatarWrap}>
            {item.senderAvatar ? (
              <Image source={{ uri: item.senderAvatar }} style={styles.pendingAvatar} />
            ) : (
              <View style={styles.pendingIcon}>
                <HandHeart size={22} color={colors.primary} />
              </View>
            )}
            {item.type === "voice" && (
              <View style={styles.voiceBadge}>
                <Mic size={8} color={colors.primaryForeground} />
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pendingName}>{item.senderName}</Text>
            <Text style={styles.pendingNote} numberOfLines={1}>
              {item.type === "voice" ? "🎙 Voice prayer request" : item.content}
            </Text>
            {item.hasPrayerDate && item.eventDate && !isNaN(daysUntil(item.eventDate)) && daysUntil(item.eventDate) >= 0 && (
              <View style={styles.dateChip}>
                <Text style={styles.dateChipText}>
                  📅 {formatPrayerDateLabel(item.eventDate, item.senderName.split(" ")[0])}
                </Text>
              </View>
            )}
            <Text style={styles.pendingTime}>{item.sentAt}</Text>
          </View>
        </View>
        <ChevronRight size={16} color={colors.mutedForeground} />
      </Pressable>
    ),
    [router, styles, colors]
  );

  const renderFrequentContact = useCallback(
    ({ item }: { item: { id: string; name: string; avatar: string } }) => (
      <Pressable
        style={styles.frequentItem}
        onPress={() => router.push("/top-hearts")}
      >
        <View style={styles.frequentAvatarWrap}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.frequentAvatar} />
          ) : (
            <View style={[styles.frequentAvatar, styles.frequentAvatarFallback]}>
              <Text style={styles.frequentInitial}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.frequentName} numberOfLines={1}>
          {item.name.split(" ")[0]}
        </Text>
      </Pressable>
    ),
    [router, styles]
  );

  const renderFrequentEmptyState = useCallback(() => (
    <View style={styles.frequentEmptyRow}>
      {[0, 1, 2, 3].map((i) => (
        <Pressable
          key={i}
          style={styles.frequentItem}
          onPress={() => router.push("/top-hearts")}
        >
          <View style={styles.frequentEmptyCircle}>
            <Plus size={22} color={colors.primary} strokeWidth={1.8} />
          </View>
          <Text style={styles.frequentNameMuted} numberOfLines={1}>
            {i === 0 ? "Add" : ""}
          </Text>
        </Pressable>
      ))}
    </View>
  ), [router, styles, colors]);

  const toastStyle = useMemo(() => ({
    opacity: toastAnim,
    transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
  }), [toastAnim]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]} {...swipeHandlers}>
      {thankToast && (
        <Animated.View style={[styles.toast, toastStyle]} pointerEvents="none">
          <Heart size={14} color="#fff" fill="#fff" />
          <Text style={styles.toastText}>Thanks sent to {thankToast.name}</Text>
        </Animated.View>
      )}
      <NavigationDrawer
        visible={drawerVisible}
        onClose={handleCloseDrawer}
        activeRoute="/(tabs)/(home)"
      />
      <NotificationsPanel visible={notifVisible} onClose={handleCloseNotif} />
      <StatusUpdateModal visible={statusVisible} onClose={handleCloseStatus} />
      <AutoScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable style={styles.menuButton} onPress={handleOpenDrawer}>
            <Menu size={22} color={colors.secondaryForeground} />
          </Pressable>
          <Text style={styles.appTitle}>Prayer Space</Text>
          <View style={styles.headerRight}>
            <Pressable style={styles.iconButton} onPress={() => router.push("/find-friend")}>
              <UserSearch size={20} color={colors.secondaryForeground} />
              {(friendRequestCount ?? 0) > 0 && (
                <View style={styles.friendBadge} />
              )}
            </Pressable>
            <Pressable style={styles.bellButton} onPress={handleOpenNotif}>
              <Bell size={20} color={colors.secondaryForeground} />
              <View style={styles.bellBadge} />
            </Pressable>
          </View>
        </View>

        <View style={styles.prayIntroWrap}>
          <Text style={styles.greetingText}>{getGreeting()} {firstName}</Text>
          <Text style={styles.prayMicrocopy}>Take a moment to pray</Text>
        </View>

        <Animated.View style={[styles.prayBtnWrap, { transform: [{ scale: pulseAnim }] }]}>
          <Pressable style={styles.startPrayerBtn} onPress={handleStartPrayer}>
            <Text style={styles.startPrayerText}>Pray</Text>
          </Pressable>
        </Animated.View>

        {verseVisible && (
          <View style={styles.verseCard}>
            <View style={styles.verseHeader}>
              <View style={styles.verseLabel}>
                <BookOpen size={16} color={colors.primary} />
                <Text style={styles.verseLabelText}>VERSE OF THE DAY</Text>
              </View>
              <Pressable
                style={styles.verseDismissBtn}
                onPress={() => setVerseVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={14} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {verseLoading ? (
              <View style={styles.verseSkeleton}>
                <View style={styles.verseSkeletonLine} />
                <View style={[styles.verseSkeletonLine, { width: "80%" }]} />
                <View style={[styles.verseSkeletonLine, { width: "60%" }]} />
                <View style={[styles.verseSkeletonRef, { marginTop: 14 }]} />
              </View>
            ) : (
              <>
                <Text style={styles.verseText}>
                  {verse?.text ?? '"Rejoice always, pray continually, give thanks in all circumstances."'}
                </Text>
                <Text style={styles.verseRef}>
                  {verse?.reference ?? "1 Thessalonians 5:16-18"}
                </Text>
              </>
            )}
          </View>
        )}

        <Pressable style={styles.journalEntryBtn} onPress={() => router.push("/journal-entry")}>
          <View style={styles.journalEntryLeft}>
            <View style={styles.journalEntryIcon}>
              <BookOpen size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.journalEntryLabel}>ADD PRAYER JOURNAL ENTRY</Text>
              <Text style={styles.journalEntrySub}>Capture today's reflection</Text>
            </View>
          </View>
          <Plus size={20} color={colors.primary} />
        </Pressable>

        {stats.currentStreak > 0 && (
          <Pressable style={styles.streakBanner} onPress={() => router.push("/prayer-stats")}>
            <Flame size={18} color={colors.primary} />
            <Text style={styles.streakBannerText}>
              🔥 {stats.currentStreak} day streak — keep it going!
            </Text>
            <ChevronRight size={16} color={colors.primary} />
          </Pressable>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Frequently Prayed For</Text>
            {(frequentlyPrayedFor.length > 0 || favourites.length > 0) && (
              <Pressable onPress={() => router.push("/top-hearts")}>
                <Text style={styles.seeAll}>View all</Text>
              </Pressable>
            )}
          </View>
          {frequentlyPrayedFor.length === 0 && favourites.length === 0 ? (
            <>
              {renderFrequentEmptyState()}
              <Pressable
                style={styles.emptyAddPrompt}
                onPress={() => router.push("/top-hearts")}
              >
                <Text style={styles.emptyAddPromptText}>Manage your prayer list</Text>
              </Pressable>
            </>
          ) : (
            <FlatList
              data={[
                ...frequentlyPrayedFor.slice(0, 8),
                ...favourites
                  .filter((f) => !frequentlyPrayedFor.find((fp) => fp.id === f.id))
                  .slice(0, Math.max(0, 8 - frequentlyPrayedFor.length)),
                { id: "add", name: "Add", avatar: "" },
              ]}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) =>
                item.id === "add" ? (
                  <Pressable
                    style={styles.frequentItem}
                    onPress={() => router.push("/top-hearts")}
                  >
                    <View style={styles.addCircle}>
                      <Plus size={28} color={colors.secondaryForeground} />
                    </View>
                    <Text style={styles.frequentNameMuted}>Add</Text>
                  </Pressable>
                ) : (
                  renderFrequentContact({ item })
                )
              }
              contentContainerStyle={styles.frequentList}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prayer Requests</Text>
          {receivedPrayerRequests.filter((r) => !hasBeenPrayed(r.id)).length === 0 ? (
            <View style={styles.emptyRequests}>
              <Text style={styles.emptyRequestsText}>No prayer requests yet.</Text>
            </View>
          ) : (
            receivedPrayerRequests
              .filter((r) => !hasBeenPrayed(r.id))
              .map((req) => renderPrayerRequest({ item: req }))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.recentActivityHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {activity.length > 0 && (
              <Pressable onPress={handleClearActivity}>
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
            )}
          </View>
          {activity.map((item) => (
            <View key={item.id} style={styles.activityCard}>
              {item.contactAvatar ? (
                <Image
                  source={{ uri: item.contactAvatar }}
                  style={styles.activityAvatar}
                />
              ) : (
                <View style={styles.activityIconWrap}>
                  <Flame size={18} color={colors.accentForeground} />
                </View>
              )}
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>
                  {item.type === "prayed_for_me" ? (
                    <>
                      <Text style={styles.bold}>{item.contactName}</Text>
                      {" prayed for you 🙏"}
                    </>
                  ) : item.type === "received" ? (
                    <>
                      <Text style={styles.bold}>{item.contactName}</Text>{" "}
                      {item.message}
                    </>
                  ) : (
                    <>
                      You prayed for{" "}
                      <Text style={styles.bold}>{item.contactName}</Text>
                    </>
                  )}
                </Text>
                <Text style={styles.activityTime}>{item.time}</Text>
              </View>
              {item.type === "prayed_for_me" ? (
                <View style={styles.prayedForMeActions}>
                  {item.thanksSent ? (
                    <View style={styles.thanksSentBadge}>
                      <Heart size={11} color={colors.primary} fill={colors.primary} />
                      <Text style={styles.thanksSentText}>Thanks sent</Text>
                    </View>
                  ) : (
                    <Pressable
                      style={styles.sendThanksBtn}
                      onPress={() => handleSendThanks(item)}
                    >
                      <Text style={styles.sendThanksBtnText}>Send thanks</Text>
                    </Pressable>
                  )}
                  {item.contactId && (
                    <Pressable
                      style={styles.inboxBtn}
                      onPress={() => router.push(`/chat/${item.contactId}`)}
                    >
                      <Inbox size={16} color={colors.primary} />
                    </Pressable>
                  )}
                </View>
              ) : item.type === "received" ? (
                <Pressable style={styles.replyBtn}>
                  <Text style={styles.replyBtnText}>Reply</Text>
                </Pressable>
              ) : (
                <CheckCircle size={18} color={colors.primary} opacity={0.6} />
              )}
            </View>
          ))}
        </View>

        <View style={{ height: 24 }} />
      </AutoScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 12,
      paddingBottom: 8,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    menuButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    profileAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    appTitle: {
      fontSize: 22,
      fontWeight: "800" as const,
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    bellBadge: {
      position: "absolute" as const,
      top: -1,
      right: -1,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      borderWidth: 1.5,
      borderColor: colors.secondary,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    friendBadge: {
      position: "absolute" as const,
      top: 0,
      right: 0,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
      borderWidth: 1.5,
      borderColor: colors.secondary,
    },
    bellButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    verseCard: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 24,
      marginBottom: 20,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 30,
      elevation: 3,
    },
    verseHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginBottom: 14,
    },
    verseDismissBtn: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: colors.muted,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    verseLabel: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    verseLabelText: {
      fontSize: 10,
      fontWeight: "800" as const,
      color: colors.primary,
      letterSpacing: 1.5,
    },
    verseText: {
      fontSize: 17,
      lineHeight: 26,
      color: colors.foreground,
      fontWeight: "600" as const,
      marginBottom: 10,
    },
    verseRef: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontWeight: "500" as const,
    },
    verseSkeleton: {
      gap: 8,
    },
    verseSkeletonLine: {
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.muted,
      width: "100%",
    },
    verseSkeletonRef: {
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.muted,
      width: "40%",
    },
    prayIntroWrap: {
      paddingTop: 16,
      paddingBottom: 20,
      alignItems: "center" as const,
    },
    greetingText: {
      fontSize: 13,
      fontWeight: "500" as const,
      color: colors.mutedForeground,
      marginBottom: 4,
    },
    prayMicrocopy: {
      fontSize: 22,
      fontWeight: "700" as const,
      color: colors.foreground,
      letterSpacing: -0.4,
    },
    prayBtnWrap: {
      marginBottom: 24,
    },
    startPrayerBtn: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingVertical: 18,
      paddingHorizontal: 24,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 24,
      elevation: 8,
    },
    startPrayerText: {
      color: colors.primaryForeground,
      fontSize: 18,
      fontWeight: "700" as const,
      letterSpacing: 0.2,
    },
    streakBanner: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary + "12",
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 20,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.primary + "20",
    },
    streakBannerText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.primary,
    },
    section: {
      marginBottom: 28,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    sectionTitle: {
      fontSize: 19,
      fontWeight: "700" as const,
      color: colors.foreground,
      marginBottom: 14,
    },
    seeAll: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: "600" as const,
      marginBottom: 14,
    },
    frequentList: {
      gap: 14,
    },
    frequentItem: {
      alignItems: "center" as const,
      gap: 8,
      width: 72,
    },
    frequentAvatarWrap: {
      width: 64,
      height: 64,
      borderRadius: 32,
      padding: 3,
      borderWidth: 2,
      borderColor: colors.primary + "30",
    },
    frequentAvatar: {
      width: "100%",
      height: "100%",
      borderRadius: 30,
    },
    frequentName: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    frequentAvatarFallback: {
      backgroundColor: colors.primary + "20",
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    frequentInitial: {
      fontSize: 22,
      fontWeight: "700" as const,
      color: colors.primary,
    },
    frequentNameMuted: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
    },
    addCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.secondary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    pendingCard: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.border + "60",
      marginBottom: 10,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 16,
      elevation: 2,
    },
    pendingLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      flex: 1,
    },
    pendingAvatarWrap: {
      position: "relative" as const,
      width: 52,
      height: 52,
    },
    pendingAvatar: {
      width: 52,
      height: 52,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.border + "60",
    },
    pendingIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: colors.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    voiceBadge: {
      position: "absolute" as const,
      bottom: -3,
      right: -3,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderWidth: 1.5,
      borderColor: colors.card,
    },
    pendingName: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.foreground,
      marginBottom: 2,
    },
    pendingNote: {
      fontSize: 13,
      color: colors.mutedForeground,
    },
    pendingTime: {
      fontSize: 11,
      color: colors.primary + "99",
      fontWeight: "600" as const,
      marginTop: 3,
    },
    dateChip: {
      marginTop: 5,
      marginBottom: 2,
      alignSelf: "flex-start" as const,
      backgroundColor: colors.primary + "14",
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderWidth: 1,
      borderColor: colors.primary + "30",
    },
    dateChipText: {
      fontSize: 11,
      fontWeight: "700" as const,
      color: colors.primary,
    },
    emptyRequests: {
      paddingVertical: 20,
      alignItems: "center" as const,
    },
    emptyRequestsText: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontWeight: "500" as const,
    },
    frequentEmptyRow: {
      flexDirection: "row" as const,
      gap: 14,
      paddingBottom: 4,
    },
    frequentEmptyCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      borderWidth: 1.5,
      borderColor: colors.primary + "40",
      borderStyle: "dashed" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: colors.primary + "06",
    },
    emptyAddPrompt: {
      marginTop: 14,
      alignSelf: "center" as const,
      paddingHorizontal: 20,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: colors.primary + "12",
      borderWidth: 1,
      borderColor: colors.primary + "25",
    },
    emptyAddPromptText: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.primary,
    },
    activityCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      marginBottom: 10,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 20,
      elevation: 2,
    },
    activityAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    activityIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    activityContent: {
      flex: 1,
    },
    activityText: {
      fontSize: 13,
      color: colors.foreground,
      fontWeight: "500" as const,
    },
    bold: {
      fontWeight: "700" as const,
    },
    activityTime: {
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 3,
    },
    replyBtn: {
      backgroundColor: colors.primary + "18",
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
    },
    replyBtnText: {
      fontSize: 12,
      fontWeight: "700" as const,
      color: colors.primary,
    },
    prayedForMeActions: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
    },
    sendThanksBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 13,
      paddingVertical: 7,
      borderRadius: 999,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 3,
    },
    sendThanksBtnText: {
      fontSize: 12,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
    },
    inboxBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.primary + "18",
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    thanksSentBadge: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      backgroundColor: colors.primary + "12",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    thanksSentText: {
      fontSize: 11,
      fontWeight: "600" as const,
      color: colors.primary,
    },
    toast: {
      position: "absolute" as const,
      top: 60,
      alignSelf: "center" as const,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 999,
      zIndex: 999,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 10,
    },
    toastText: {
      fontSize: 13,
      fontWeight: "700" as const,
      color: "#fff",
    },
    journalEntryBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      backgroundColor: colors.secondary + "80",
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border + "60",
    },
    journalEntryLeft: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
    },
    journalEntryIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: colors.primary + "18",
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    journalEntryLabel: {
      fontSize: 10,
      fontWeight: "800" as const,
      color: colors.primary,
      letterSpacing: 1.2,
    },
    recentActivityHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      marginBottom: 0,
    },
    clearText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontWeight: "500" as const,
      marginBottom: 14,
    },
    journalEntrySub: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
      marginTop: 2,
    },
  });
}
