import React, { useState, useRef, useCallback, useEffect, useMemo} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect, Stack } from "expo-router";
import {
  ChevronLeft,
  Clock,
  Quote,
  MessageCircle,
  BookmarkPlus,
  X,
  CalendarDays,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";
import { useNotifications } from "@/providers/NotificationsProvider";
import { usePrayer } from "@/providers/PrayerProvider";
import { formatPrayerDateFeed, daysUntil } from "@/lib/prayerDateUtils";
import { scheduleReceivedPrayerReminders, shouldShowReminderBadge } from "@/lib/prayerReminders";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { loadReceivedPrayer, prayerIdSchema, prayerAcknowledgementSchema } from "@/lib/receivedPrayers";

export default function ReceivedPrayerScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = typeof params.id === "string" ? params.id : "";
  const { addJournalEntry } = usePrayer();
  const { markRequestPrayed } = useNotifications();
  const [didPray, setHasPrayed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isJournaled, setIsJournaled] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showPrayModal, setShowPrayModal] = useState(false);
  const [newJournalEntryId, setNewJournalEntryId] = useState<string>("");
  const modalScaleAnim = useRef(new Animated.Value(0.88)).current;
  const modalFadeAnim = useRef(new Animated.Value(0)).current;
  const modalSlideAnim = useRef(new Animated.Value(0)).current;
  const tooltipFadeAnim = useRef(new Animated.Value(0)).current;
  const tooltipSlideAnim = useRef(new Animated.Value(8)).current;
  const dotsAnim = useRef(new Animated.Value(0)).current;

  // Received requests are loaded by the feed when the backend data is available.
  // Never render a local/demo request when a route is opened directly.
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const owner = useMemo(() => ({ userId: user?.id, id }), [user?.id, id]);
  const ownerRef = useRef(owner);
  ownerRef.current = owner;
  const focusedRef = useRef(false);
  const savingRef = useRef<typeof owner | null>(null);
  const validId = prayerIdSchema.safeParse(id).success;
  const prayerQuery = useQuery({
    queryKey: ["received-prayer", user?.id, id],
    enabled: !!user && validId,
    queryFn: () => loadReceivedPrayer(supabase, id, user!.id),
    staleTime: 0,
    refetchInterval: 30000,
    retry: 1,
  });
  const prayer = prayerQuery.data ?? null;
  const hasPrayed = didPray || prayer?.hasPrayed === true;

  useFocusEffect(
    useCallback(() => {
      ownerRef.current = owner;
      focusedRef.current = true;
      setHasPrayed(false);
      setIsJournaled(false);
      setIsSaving(false);
      setShowTooltip(false);
      setShowPrayModal(false);
      savingRef.current = null;
      if (user?.id && validId) void prayerQuery.refetch();
      return () => { focusedRef.current = false; };
    }, [owner])
  );

  useEffect(() => {
    if (hasPrayed) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dotsAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(dotsAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
    return () => {
      dotsAnim.stopAnimation();
    };
  }, [hasPrayed, dotsAnim]);

  const openTooltip = useCallback(() => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowTooltip(true);
    tooltipFadeAnim.setValue(0);
    tooltipSlideAnim.setValue(8);
    Animated.parallel([
      Animated.timing(tooltipFadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(tooltipSlideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [tooltipFadeAnim, tooltipSlideAnim]);

  const closeTooltip = useCallback(() => {
    Animated.parallel([
      Animated.timing(tooltipFadeAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(tooltipSlideAnim, { toValue: 8, duration: 160, useNativeDriver: true }),
    ]).start(() => setShowTooltip(false));
  }, [tooltipFadeAnim, tooltipSlideAnim]);

  const handleAddToJournalFromTooltip = useCallback(() => {
    if (!prayer || !user || prayerQuery.isError) return;
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setIsJournaled(true);
    addJournalEntry({
      title: `Praying for ${prayer?.senderName ?? "Someone"}`,
      body: `Prayer request from ${prayer?.senderName ?? "Someone"}.`,
      tag: "praying_for",
      contactName: prayer?.senderName,
      contactAvatar: prayer?.senderAvatar,
      prayerRequest: prayer?.content,
      eventDate: prayer?.eventDate ?? null,
    });
    closeTooltip();
    router.push({
      pathname: "/journal-added-success",
      params: { senderName: prayer?.senderName ?? "Someone" },
    });
  }, [prayer, user, prayerQuery.isError, addJournalEntry, closeTooltip, router]);

  const handlePray = useCallback(async () => {
    if (!user || !prayer || hasPrayed || prayerQuery.isError || !focusedRef.current || savingRef.current === owner) return;
    savingRef.current = owner;
    setIsSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (session.session?.user.id !== user.id || ownerRef.current !== owner || !focusedRef.current) return;
      const { data, error } = await supabase.rpc("pray_for_received_request", {
        prayer_id: prayer.id, p_expected_user_id: user.id,
      });
      if (error) throw error;
      const acknowledgement = prayerAcknowledgementSchema.parse(data);
      const { data: current } = await supabase.auth.getSession();
      if (current.session?.user.id !== user.id || ownerRef.current !== owner || !focusedRef.current) return;
      queryClient.setQueryData(["received-prayer", user.id, id], {
        ...prayer, ...acknowledgement,
      });
      void queryClient.invalidateQueries({ queryKey: ["received-prayers", user.id] });
      void queryClient.invalidateQueries({ queryKey: ["received-prayer", user.id, id] });
      void queryClient.invalidateQueries({ queryKey: ["feed-posts", user.id] });
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (id) {
      markRequestPrayed(id);
    }
    if (user?.id && prayer?.hasPrayerDate && prayer.eventDate) {
      void scheduleReceivedPrayerReminders({
        userId: user.id,
        prayerRequestId: prayer.id,
        senderName: prayer.senderName,
        snippet: prayer.content,
        eventDate: prayer.eventDate,
      });
    }
    setHasPrayed(true);
    setIsJournaled(true);
    const entryId = addJournalEntry({
      title: `Praying for ${prayer?.senderName ?? "Someone"}`,
      body: `Prayer request from ${prayer?.senderName ?? "Someone"}.`,
      tag: "praying_for",
      contactName: prayer?.senderName,
      contactAvatar: prayer?.senderAvatar,
      prayerRequest: prayer?.content,
      eventDate: prayer?.eventDate ?? null,
    });
    setNewJournalEntryId(entryId);
    modalScaleAnim.setValue(0.88);
    modalFadeAnim.setValue(0);
    setShowPrayModal(true);
    Animated.parallel([
      Animated.spring(modalScaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
      Animated.timing(modalFadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    } catch {
      if (ownerRef.current === owner) Alert.alert("Couldn't save your prayer", "Please try again. Your journal has not been changed.");
    } finally {
      if (ownerRef.current === owner) setIsSaving(false);
      if (savingRef.current === owner) savingRef.current = null;
    }
  }, [user, prayer, hasPrayed, prayerQuery.isError, owner, id, queryClient, markRequestPrayed, addJournalEntry, modalScaleAnim, modalFadeAnim]);

  const closePrayModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(modalFadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(modalScaleAnim, { toValue: 0.9, duration: 180, useNativeDriver: true }),
    ]).start(() => setShowPrayModal(false));
  }, [modalFadeAnim, modalScaleAnim]);

  const dismissWithSlideDown = useCallback((onDone: () => void) => {
    modalSlideAnim.setValue(0);
    Animated.parallel([
      Animated.timing(modalSlideAnim, { toValue: 600, duration: 380, useNativeDriver: true }),
      Animated.timing(modalFadeAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start(() => {
      setShowPrayModal(false);
      modalSlideAnim.setValue(0);
      onDone();
    });
  }, [modalSlideAnim, modalFadeAnim]);

  if (!prayer || prayerQuery.isError || !user || !validId) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.header}>
            <Pressable style={styles.headerBtn} onPress={() => router.back()}>
              <ChevronLeft size={20} color={colors.foreground} />
            </Pressable>
          </View>
          <View style={styles.emptyState}>
            {prayerQuery.isLoading && user && validId ? <ActivityIndicator color={colors.primary} /> : (
              <>
                <Text style={styles.emptyText}>
                  {!user ? "Sign in to view this prayer request." : !validId ? "This prayer request link is invalid." : prayerQuery.isError ? "We couldn't load this prayer request." : "Prayer request not found or you don't have access."}
                </Text>
                {prayerQuery.isError && (
                  <Pressable onPress={() => void prayerQuery.refetch()}>
                    <Text style={styles.emptyText}>Retry</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const othersCount = Math.max(0, prayer.prayerCount - prayer.prayedByAvatars.length);

  const dotsOpacity1 = dotsAnim.interpolate({ inputRange: [0, 0.33, 1], outputRange: [0.3, 1, 0.3] });
  const dotsOpacity2 = dotsAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1, 0.3] });
  const dotsOpacity3 = dotsAnim.interpolate({ inputRange: [0, 0.66, 1], outputRange: [0.3, 1, 0.3] });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Modal
        visible={showPrayModal}
        transparent
        animationType="none"
        onRequestClose={closePrayModal}
        statusBarTranslucent
      >
        <Pressable style={styles.modalOverlay} onPress={closePrayModal}>
          <Animated.View
            style={[
              styles.modalCard,
              { opacity: modalFadeAnim, transform: [{ scale: modalScaleAnim }, { translateY: modalSlideAnim }] },
            ]}
          >
            <View style={styles.modalEmoji}>
              <Text style={styles.modalEmojiText}>🙏</Text>
            </View>
            <Text style={styles.modalTitle}>Praying for {prayer?.senderName.split(" ")[0]}</Text>
            <Text style={styles.modalBody}>
              Your prayer has been saved and this request has been added to your prayer journal.
            </Text>
            <View style={styles.modalBtnRow}>
              <Pressable
                style={({ pressed }) => [styles.modalBtn, pressed && { opacity: 0.85 }]}
                onPress={() => {
                  closePrayModal();
                  router.push({ pathname: "/journal", params: { tab: "praying_for", highlightId: newJournalEntryId } });
                }}
              >
                <Text style={styles.modalBtnText}>Pray now</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.modalBtnLater, pressed && { opacity: 0.7 }]}
                onPress={() => {
                  dismissWithSlideDown(() => router.replace("/(tabs)/(home)"));
                }}
              >
                <Text style={styles.modalBtnLaterText}>Later</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>

      <View style={styles.topGradient} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={() => router.back()}>
            <ChevronLeft size={20} color={colors.foreground} />
          </Pressable>
          <Text style={styles.headerTitle}>Prayer Request</Text>
          <View style={styles.headerSpacer} />
        </View>

        <AutoScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.senderSection}>
            <Pressable style={styles.avatarWrap} disabled={!prayer.senderId} onPress={() => router.push(`/user/${prayer.senderId}` as never)}>
              {prayer.senderAvatar ? <Image source={{ uri: prayer.senderAvatar }} style={styles.avatar} /> : (
                <View style={[styles.avatar, { alignItems: "center", justifyContent: "center", backgroundColor: colors.muted }]}>
                  <Text style={styles.senderName}>{prayer.senderName.slice(0, 1)}</Text>
                </View>
              )}
              <View style={styles.avatarBadge}>
                <Text style={styles.avatarBadgeEmoji}>🤍</Text>
              </View>
            </Pressable>
            <Text style={styles.senderName}>{prayer.senderName}</Text>
            <View style={styles.timeRow}>
              <Clock size={13} color={colors.primary} />
              <Text style={styles.timeText}>Sent {new Date(prayer.sentAt).toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.quoteIconWrap}>
              <Quote size={32} color={colors.primary + "18"} />
            </View>
            <Text style={styles.requestText}>"{prayer.content}"</Text>
            <Text style={styles.timeText}>
              {prayer.status === "answered" ? "Answered" : prayer.status === "still_need_prayer" ? "Still needs prayer" : prayer.status === "archived" ? "Archived" : "Ongoing"}
            </Text>
            {prayer.imageUrl && <Image source={{ uri: prayer.imageUrl }} style={{ width: "100%", height: 220, borderRadius: 12, marginTop: 16 }} contentFit="contain" />}
          </View>
          {prayer.updates.map((update) => (
            <View key={update.id} style={styles.card}>
              <Text style={styles.transcriptLabel}>UPDATE</Text>
              <Text style={styles.requestText}>{update.content}</Text>
              <Text style={styles.timeText}>{new Date(update.createdAt).toLocaleString()}</Text>
            </View>
          ))}

          {prayer.hasPrayerDate && prayer.eventDate && !isNaN(daysUntil(prayer.eventDate)) && daysUntil(prayer.eventDate) >= 0 && (
            <View style={[styles.dateBanner, shouldShowReminderBadge(prayer.eventDate) && styles.dateBannerUrgent]}>
              <View style={styles.dateBannerIcon}>
                <CalendarDays size={18} color={shouldShowReminderBadge(prayer.eventDate) ? colors.destructive : colors.primary} />
              </View>
              <View style={styles.dateBannerContent}>
                <Text style={[styles.dateBannerLabel, shouldShowReminderBadge(prayer.eventDate) && styles.dateBannerLabelUrgent]}>
                  {formatPrayerDateFeed(prayer.eventDate)}
                </Text>
                <Text style={styles.dateBannerSub}>
                  {daysUntil(prayer.eventDate) === 0
                    ? `Pray for ${prayer.senderName.split(" ")[0]} today`
                    : daysUntil(prayer.eventDate) === 1
                    ? `${prayer.senderName.split(" ")[0]}'s prayer date is tomorrow`
                    : `${prayer.senderName.split(" ")[0]} needs prayer on this date`}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.prayedSection}>
            <View style={styles.avatarStack}>
              {prayer.prayedByAvatars.slice(0, 3).map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={[styles.stackAvatar, i > 0 && { marginLeft: -10 }]}
                />
              ))}
              {othersCount > 0 && (
                <View style={[styles.stackCount, { marginLeft: -10 }]}>
                  <Text style={styles.stackCountText}>+{othersCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.prayedText}>
              {prayer.prayerCount} {prayer.prayerCount === 1 ? "person has" : "people have"}{" "}
              prayed for{" "}
              <Text style={styles.prayedBold}>{prayer.senderName.split(" ")[0]}</Text>{" "}
              on this request
            </Text>
          </View>
        </AutoScrollView>

        <SafeAreaView edges={["bottom"]} style={styles.bottomBar}>
          {showTooltip && !isJournaled && (
            <Animated.View
              style={[
                styles.tooltip,
                {
                  opacity: tooltipFadeAnim,
                  transform: [{ translateY: tooltipSlideAnim }],
                },
              ]}
            >
              <View style={styles.tooltipContent}>
                <BookmarkPlus size={18} color={colors.primary} />
                <View style={styles.tooltipTextWrap}>
                  <Text style={styles.tooltipTitle}>Add to Prayer Journal?</Text>
                  <Text style={styles.tooltipSub}>Keep praying for {prayer.senderName.split(" ")[0]}</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.tooltipYesBtn, pressed && { opacity: 0.8 }]}
                  onPress={handleAddToJournalFromTooltip}
                >
                  <Text style={styles.tooltipYesText}>Add</Text>
                </Pressable>
                <Pressable onPress={closeTooltip} style={styles.tooltipCloseBtn}>
                  <X size={14} color={colors.mutedForeground} />
                </Pressable>
              </View>
              <View style={styles.tooltipArrow} />
            </Animated.View>
          )}

          <View style={styles.bottomRow}>
            <View style={styles.prayBtnWrap}>
              <Pressable
                style={[styles.prayBtn, hasPrayed && styles.prayBtnPraying]}
                onPress={() => void handlePray()}
                disabled={hasPrayed || isSaving}
                accessibilityState={{ disabled: hasPrayed || isSaving, busy: isSaving }}
                testID="pray-button"
              >
                <Text style={styles.prayBtnEmoji}>🙏</Text>
                <View style={styles.prayBtnTextWrap}>
                  <Text style={styles.prayBtnText}>{isSaving ? "Saving…" : hasPrayed ? "Praying" : "Pray"}</Text>
                </View>
              </Pressable>

              {hasPrayed && !isJournaled && (
                <Pressable style={styles.dotsBtn} onPress={openTooltip} testID="dots-btn">
                  <View style={styles.dotsInner}>
                    <Animated.View style={[styles.dot, { opacity: dotsOpacity1 }]} />
                    <Animated.View style={[styles.dot, { opacity: dotsOpacity2 }]} />
                    <Animated.View style={[styles.dot, { opacity: dotsOpacity3 }]} />
                  </View>
                </Pressable>
              )}

              {hasPrayed && isJournaled && (
                <View style={styles.journaledBadge} testID="journaled-badge">
                  <Text style={styles.journaledBadgeEmoji}>📖</Text>
                </View>
              )}
            </View>

            {prayer.senderId && <Pressable style={styles.chatBtn} accessibilityLabel="View sender profile" accessibilityRole="button" onPress={() => router.push(`/user/${prayer.senderId}`)}>
              <MessageCircle size={22} color={colors.secondaryForeground} />
            </Pressable>}
          </View>
        </SafeAreaView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topGradient: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    height: 280,
    backgroundColor: colors.primary + "0A",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card + "CC",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  headerSpacer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: colors.foreground,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 140,
  },
  senderSection: {
    alignItems: "center" as const,
    marginBottom: 28,
    paddingTop: 8,
  },
  avatarWrap: {
    position: "relative" as const,
    marginBottom: 14,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: colors.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
  },
  avatarBadge: {
    position: "absolute" as const,
    bottom: -6,
    right: -6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 2,
    borderColor: colors.background,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarBadgeEmoji: {
    fontSize: 14,
  },
  senderName: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: colors.foreground,
    marginBottom: 6,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  timeText: {
    fontSize: 13,
    color: colors.mutedForeground,
    fontWeight: "600" as const,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 32,
    padding: 28,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 30,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border + "30",
    marginBottom: 28,
  },
  quoteIconWrap: {
    position: "absolute" as const,
    top: 20,
    left: 20,
  },
  requestText: {
    fontSize: 18,
    lineHeight: 28,
    color: colors.secondaryForeground,
    fontWeight: "500" as const,
    fontStyle: "italic" as const,
    paddingTop: 8,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primary + "15",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  progressWrap: {
    flex: 1,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.secondary,
    borderRadius: 3,
    overflow: "hidden" as const,
  },
  progressFill: {
    height: "100%" as const,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  durationText: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: colors.mutedForeground,
    letterSpacing: 1,
  },
  transcriptSection: {
    gap: 10,
  },
  transcriptLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  transcriptLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: colors.mutedForeground,
    letterSpacing: 1.5,
  },
  transcriptText: {
    fontSize: 17,
    lineHeight: 27,
    color: colors.secondaryForeground,
    fontWeight: "500" as const,
    fontStyle: "italic" as const,
  },
  dateBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    backgroundColor: colors.primary + "0D",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.primary + "30",
    padding: 16,
    marginBottom: 24,
  },
  dateBannerUrgent: {
    backgroundColor: colors.destructive + "0D",
    borderColor: colors.destructive + "40",
  },
  dateBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primary + "15",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  dateBannerContent: {
    flex: 1,
    gap: 3,
  },
  dateBannerLabel: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  dateBannerLabelUrgent: {
    color: colors.destructive,
  },
  dateBannerSub: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontWeight: "500" as const,
  },
  prayedSection: {
    alignItems: "center" as const,
    gap: 12,
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  stackAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.card,
  },
  stackCount: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  stackCountText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.accentForeground,
  },
  prayedText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.mutedForeground,
    textAlign: "center" as const,
  },
  prayedBold: {
    fontWeight: "700" as const,
    color: colors.foreground,
  },
  bottomBar: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: colors.background + "F0",
    borderTopWidth: 1,
    borderTopColor: colors.border + "20",
  },
  tooltip: {
    backgroundColor: colors.card,
    borderRadius: 20,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border + "40",
  },
  tooltipContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  tooltipTextWrap: {
    flex: 1,
  },
  tooltipTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.foreground,
  },
  tooltipSub: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontWeight: "500" as const,
  },
  tooltipYesBtn: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tooltipYesText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.primaryForeground,
  },
  tooltipCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.secondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  tooltipArrow: {
    position: "absolute" as const,
    bottom: -8,
    left: 52,
    width: 16,
    height: 16,
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border + "40",
    transform: [{ rotate: "45deg" }],
  },
  bottomRow: {
    flexDirection: "row",
    gap: 12,
  },
  prayBtnWrap: {
    flex: 1,
    position: "relative" as const,
  },
  prayBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 999,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  prayBtnPraying: {
    backgroundColor: "#B85A1D",
    shadowColor: "#B85A1D",
    shadowOpacity: 0.3,
  },
  prayBtnEmoji: {
    fontSize: 20,
  },
  prayBtnText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: colors.primaryForeground,
  },
  dotsBtn: {
    position: "absolute" as const,
    top: -6,
    right: 6,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  dotsInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
  },
  journaledBadge: {
    position: "absolute" as const,
    top: -6,
    right: 6,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  journaledBadgeEmoji: {
    fontSize: 13,
  },
  chatBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.secondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  emptyState: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  emptyText: {
    fontSize: 16,
    color: colors.mutedForeground,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 28,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 28,
    width: "100%" as const,
    alignItems: "center" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 20,
  },
  modalEmoji: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + "15",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 20,
  },
  modalEmojiText: {
    fontSize: 34,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: colors.foreground,
    marginBottom: 12,
    textAlign: "center" as const,
  },
  modalBody: {
    fontSize: 15,
    lineHeight: 24,
    color: colors.secondaryForeground,
    textAlign: "center" as const,
    fontWeight: "500" as const,
    marginBottom: 28,
  },
  modalBold: {
    fontWeight: "700" as const,
    color: colors.foreground,
  },
  modalBtnRow: {
    width: "100%" as const,
    gap: 12,
    alignItems: "center" as const,
  },
  modalBtn: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 48,
    width: "100%" as const,
    alignItems: "center" as const,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.primaryForeground,
  },
  modalBtnLater: {
    paddingVertical: 12,
    paddingHorizontal: 48,
  },
  modalBtnLaterText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.mutedForeground,
  },
  prayBtnTextWrap: {
    alignItems: "center" as const,
  },
  prayBtnSub: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.primaryForeground + "CC",
    marginTop: 1,
    letterSpacing: 0.2,
  },
});
