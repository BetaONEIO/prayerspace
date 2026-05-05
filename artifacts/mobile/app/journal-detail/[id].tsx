import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Share,
  Platform,
  Modal,
  Animated,
  Dimensions,
  Alert,
  TouchableOpacity,
} from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  MoreHorizontal,
  Heart,
  CheckCircle,
  HandHeart,
  PenLine,
  Share2,
  Bell,
  BellOff,
  Clock,
  ChevronUp,
  ChevronDown,
  X,
  Calendar,
  CalendarDays,
  Repeat,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";
import { usePrayer } from "@/providers/PrayerProvider";
import type { JournalEntry, PrayerReminder } from "@/providers/PrayerProvider";
import { scheduleJournalReminder, cancelJournalReminder } from "@/lib/journalNotifications";
import FormattedText from "@/components/FormattedText";
import { formatPrayerDateFeed, daysUntil } from "@/lib/prayerDateUtils";
import { shouldShowReminderBadge } from "@/lib/prayerReminders";

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const MOCK_ENTRIES: JournalEntry[] = [
  {
    id: "j1",
    title: "Peace in the Storm",
    body: "Today I felt a profound sense of peace during my morning prayer. Even though the project at work is stressful, I'm choosing to trust in God's plan. Lord, thank you for the stillness I felt this morning despite the chaos at work. Grant me strength to continue being a light in that environment. Help me to remember that my peace comes from You, not my circumstances.",
    tag: "reflection",
    timestamp: Date.now() - 1000 * 60 * 60 * 3,
    isFavorite: true,
    isAnswered: false,
  },
  {
    id: "j2",
    title: "Prayer for Financial Wisdom",
    body: "Lord, help us manage our resources better this month. Give us clarity on the upcoming investment decisions and trust that You will provide.",
    tag: "petition",
    timestamp: Date.now() - 1000 * 60 * 60 * 27,
    isFavorite: false,
    isAnswered: false,
    eventDate: isoOffset(1),
  },
  {
    id: "j3",
    title: "Morning Gratefulness",
    body: "Thankful for the sunrise and the coffee. A fresh start to a beautiful week. I am grateful for the health of my family and the opportunities ahead.",
    tag: "gratitude",
    timestamp: Date.now() - 1000 * 60 * 60 * 29,
    isFavorite: false,
    isAnswered: false,
  },
];

const getTagConfig = (colors: ThemeColors): Record<string, { label: string; color: string; bg: string }> => ({
  gratitude: { label: "Gratitude", color: colors.primary, bg: colors.primary + "18" },
  petition: { label: "Petition", color: colors.accentForeground, bg: colors.accent },
  reflection: { label: "Reflection", color: colors.primary, bg: colors.primary + "18" },
  praying_for: { label: "Praying For", color: "#D4782F", bg: "#D4782F18" },
});

const MOOD_MAP: Record<string, string> = {
  gratitude: "Grateful",
  petition: "Hopeful",
  reflection: "Peaceful",
  praying_for: "Compassionate",
};

type Frequency = "everyday" | "weekdays" | "weekends" | "once";

const FREQUENCY_OPTIONS: { value: Frequency; label: string; icon: string }[] = [
  { value: "everyday", label: "Everyday", icon: "repeat" },
  { value: "weekdays", label: "Weekdays", icon: "calendar" },
  { value: "weekends", label: "Weekends", icon: "calendar" },
  { value: "once", label: "Just Once", icon: "clock" },
];

function formatFullDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatTimeStr(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatReminderTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${padZero(displayHour)}:${padZero(minute)} ${period}`;
}

function frequencyLabel(freq: Frequency): string {
  switch (freq) {
    case "everyday": return "Everyday";
    case "weekdays": return "Weekdays";
    case "weekends": return "Weekends";
    case "once": return "Just Once";
    default: return "Everyday";
  }
}

export default function JournalDetailScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const TAG_CONFIG = useMemo(() => getTagConfig(colors), [colors]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { journal, toggleJournalFavorite, markJournalAnswered, deleteJournalEntry, setReminder, removeReminder, getReminderForEntry } = usePrayer();

  const allEntries = useMemo(() => [...journal, ...MOCK_ENTRIES], [journal]);
  const entry = useMemo(() => allEntries.find((e) => e.id === id), [allEntries, id]);

  const existingReminder = useMemo(() => id ? getReminderForEntry(id) : undefined, [id, getReminderForEntry]);

  const [showReminderModal, setShowReminderModal] = useState<boolean>(false);
  const [selectedHour, setSelectedHour] = useState<number>(existingReminder?.hour ?? 8);
  const [selectedMinute, setSelectedMinute] = useState<number>(existingReminder?.minute ?? 30);
  const [selectedFrequency, setSelectedFrequency] = useState<Frequency>(existingReminder?.frequency ?? "everyday");

  const modalAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (existingReminder) {
      setSelectedHour(existingReminder.hour);
      setSelectedMinute(existingReminder.minute);
      setSelectedFrequency(existingReminder.frequency);
    }
  }, [existingReminder]);

  const tagCfg = entry ? (TAG_CONFIG[entry.tag] ?? TAG_CONFIG.reflection) : TAG_CONFIG.reflection;

  const openReminderModal = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (existingReminder) {
      setSelectedHour(existingReminder.hour);
      setSelectedMinute(existingReminder.minute);
      setSelectedFrequency(existingReminder.frequency);
    } else {
      setSelectedHour(8);
      setSelectedMinute(30);
      setSelectedFrequency("everyday");
    }
    setShowReminderModal(true);
    Animated.parallel([
      Animated.spring(modalAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 20,
        stiffness: 300,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 20,
        stiffness: 300,
      }),
    ]).start();
  }, [existingReminder, modalAnim, scaleAnim]);

  const closeReminderModal = useCallback(() => {
    Animated.parallel([
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowReminderModal(false);
    });
  }, [modalAnim, scaleAnim]);

  const handleSaveReminder = useCallback(async () => {
    if (!id || !entry) return;
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const notifIds = await scheduleJournalReminder({
      entryTitle: entry.title,
      hour: selectedHour,
      minute: selectedMinute,
      frequency: selectedFrequency,
      existingNotificationIds: existingReminder?.notificationIds,
    });
    setReminder({
      entryId: id,
      hour: selectedHour,
      minute: selectedMinute,
      frequency: selectedFrequency,
      enabled: true,
      notificationIds: notifIds,
    });
    console.log("[JournalDetail] Saved reminder:", { id, selectedHour, selectedMinute, selectedFrequency, notifIds });
    closeReminderModal();
  }, [id, entry, selectedHour, selectedMinute, selectedFrequency, existingReminder, setReminder, closeReminderModal]);

  const handleRemoveReminder = useCallback(async () => {
    if (!id) return;
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (existingReminder?.notificationIds?.length) {
      await cancelJournalReminder(existingReminder.notificationIds);
    }
    removeReminder(id);
    console.log("[JournalDetail] Removed reminder for:", id);
    closeReminderModal();
  }, [id, existingReminder, removeReminder, closeReminderModal]);

  const incrementHour = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setSelectedHour((prev) => (prev + 1) % 24);
  }, []);

  const decrementHour = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setSelectedHour((prev) => (prev - 1 + 24) % 24);
  }, []);

  const incrementMinute = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setSelectedMinute((prev) => (prev + 5) % 60);
  }, []);

  const decrementMinute = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setSelectedMinute((prev) => (prev - 5 + 60) % 60);
  }, []);

  const togglePeriod = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setSelectedHour((prev) => (prev + 12) % 24);
  }, []);

  const handleShare = async () => {
    if (!entry) return;
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `${entry.title}\n\n${entry.body}\n\nRead more on PrayerSpace:\nhttps://prayerspace.app`,
      });
    } catch (e) {
      console.log("Share error:", e);
    }
  };

  const showEntryMenu = useCallback(() => {
    if (!entry) return;
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const buttons: Array<{ text: string; style?: "cancel" | "destructive" | "default"; onPress?: () => void }> = [
      {
        text: "Edit Entry",
        onPress: () => router.push(`/journal-entry?editId=${entry.id}` as never),
      },
      {
        text: "Delete Entry",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Delete Entry",
            "This will permanently delete this prayer entry.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => {
                  if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  deleteJournalEntry(entry.id);
                  router.back();
                },
              },
            ]
          );
        },
      },
    ];
    if (!entry.isAnswered) {
      buttons.push({
        text: "Mark as Answered",
        onPress: () => {
          markJournalAnswered(entry.id);
          if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      });
    }
    buttons.push({ text: "Share", onPress: () => void handleShare() });
    buttons.push({ text: "Cancel", style: "cancel" });
    Alert.alert(entry.title, undefined, buttons);
  }, [entry, router, deleteJournalEntry, markJournalAnswered]);

  const handleFavorite = () => {
    if (!entry) return;
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleJournalFavorite(entry.id);
  };

  const displayHour = selectedHour === 0 ? 12 : selectedHour > 12 ? selectedHour - 12 : selectedHour;
  const period = selectedHour >= 12 ? "PM" : "AM";

  if (!entry) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Entry not found</Text>
          <Pressable style={styles.backFallback} onPress={() => router.back()}>
            <Text style={styles.backFallbackText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.gradientOverlay} pointerEvents="none" />

      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.secondaryForeground} />
        </Pressable>
        <View style={[styles.tagPill, { backgroundColor: tagCfg.bg }]}>
          <Text style={[styles.tagPillText, { color: tagCfg.color }]}>{tagCfg.label}</Text>
        </View>
        <Pressable style={styles.iconBtn} onPress={showEntryMenu}>
          <MoreHorizontal size={20} color={colors.secondaryForeground} />
        </Pressable>
      </View>

      <AutoScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metaRow}>
          <Text style={styles.dateLabel}>
            {formatFullDate(entry.timestamp)} · {formatTimeStr(entry.timestamp)}
          </Text>
        </View>

        {entry.tag === "praying_for" ? (
          <View style={styles.prayingForTitleRow}>
            {entry.contactAvatar ? (
              <Image source={{ uri: entry.contactAvatar }} style={styles.contactAvatarTitle} />
            ) : (
              <View style={styles.contactAvatarPlaceholder}>
                <Text style={styles.contactAvatarInitial}>
                  {(entry.contactName ?? "?")[0].toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.titleSmall}>{entry.title}</Text>
          </View>
        ) : (
          <Text style={styles.title}>{entry.title}</Text>
        )}

        <View style={styles.bodyCard}>
          <View style={styles.quoteAccent} />
          {entry.tag === "praying_for" && entry.prayerRequest ? (
            <FormattedText text={entry.prayerRequest} baseStyle={styles.bodyText} />
          ) : (
            <FormattedText text={entry.body} baseStyle={styles.bodyText} />
          )}
        </View>

        {entry.eventDate && !isNaN(daysUntil(entry.eventDate)) && daysUntil(entry.eventDate) >= 0 && (
          <View style={[styles.dateBanner, shouldShowReminderBadge(entry.eventDate) && styles.dateBannerUrgent]}>
            <View style={[styles.dateBannerIcon, shouldShowReminderBadge(entry.eventDate) && styles.dateBannerIconUrgent]}>
              <CalendarDays size={18} color={shouldShowReminderBadge(entry.eventDate) ? colors.destructive : colors.primary} />
            </View>
            <View style={styles.dateBannerContent}>
              <Text style={[styles.dateBannerLabel, shouldShowReminderBadge(entry.eventDate) && styles.dateBannerLabelUrgent]}>
                {formatPrayerDateFeed(entry.eventDate)}
              </Text>
              <Text style={styles.dateBannerSub}>
                {daysUntil(entry.eventDate) === 0
                  ? "This is the day you've been praying for"
                  : daysUntil(entry.eventDate) === 1
                  ? "Your prayer date is tomorrow — trust in God"
                  : "You have a prayer date set for this request"}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { flex: 0, minWidth: 140 }]}>
            <View style={[styles.statIconWrap, { backgroundColor: entry.isAnswered ? "#D4782F18" : colors.muted }]}>
              <CheckCircle size={18} color={entry.isAnswered ? "#D4782F" : colors.mutedForeground} />
            </View>
            <Text style={styles.statLabel}>Status</Text>
            <Text style={[styles.statValue, entry.isAnswered && { color: "#D4782F" }]}>
              {entry.isAnswered ? "Answered" : "Ongoing"}
            </Text>
          </View>
        </View>

        {entry.tag === "praying_for" && (
          <View style={styles.prayingBanner}>
            <HandHeart size={18} color="#D4782F" />
            <Text style={styles.prayingBannerText}>You are actively praying for this</Text>
          </View>
        )}

        <View style={styles.reminderSection}>
          <View style={styles.sectionLabelRow}>
            <Bell size={16} color={colors.primary} />
            <Text style={styles.sectionLabel}>Reminder Settings</Text>
          </View>
          <Pressable
            style={[styles.reminderCard, existingReminder && styles.reminderCardActive]}
            onPress={openReminderModal}
            testID="reminder-card"
          >
            <View style={styles.reminderLeft}>
              <View style={[styles.reminderIconWrap, existingReminder && styles.reminderIconWrapActive]}>
                <Bell size={18} color={existingReminder ? "#fff" : colors.primary} />
              </View>
              <View>
                <Text style={[styles.reminderFreq, existingReminder && styles.reminderFreqActive]}>
                  {existingReminder ? frequencyLabel(existingReminder.frequency) : "No reminder set"}
                </Text>
                <Text style={styles.reminderTime}>
                  {existingReminder
                    ? formatReminderTime(existingReminder.hour, existingReminder.minute)
                    : "Tap to set"}
                </Text>
              </View>
            </View>
            <View style={styles.reminderRight}>
              {existingReminder ? (
                <View style={styles.reminderActiveBadge}>
                  <CheckCircle size={20} color="#fff" />
                </View>
              ) : (
                <View style={styles.reminderSetBtn}>
                  <Text style={styles.reminderSetBtnText}>Set</Text>
                </View>
              )}
            </View>
          </Pressable>
        </View>

        <View style={{ height: 120 }} />
      </AutoScrollView>

      {entry.tag !== "praying_for" && (
        <View style={styles.footer}>
          <Pressable
            style={styles.editBtn}
            onPress={() => router.push(`/journal-entry?editId=${entry.id}` as never)}
          >
            <PenLine size={20} color={colors.primaryForeground} />
            <Text style={styles.editBtnText}>Edit Entry</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={handleFavorite}>
            <Heart
              size={20}
              color={entry.isFavorite ? colors.primary : colors.secondaryForeground}
              fill={entry.isFavorite ? colors.primary : "transparent"}
            />
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={handleShare}>
            <Share2 size={20} color={colors.secondaryForeground} />
          </Pressable>
        </View>
      )}

      <Modal
        visible={showReminderModal}
        transparent
        animationType="none"
        onRequestClose={closeReminderModal}
        statusBarTranslucent
      >
        <Pressable style={styles.modalOverlay} onPress={closeReminderModal}>
          <Animated.View
            style={[
              styles.modalContainer,
              {
                opacity: modalAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <View style={styles.modalBellWrap}>
                    <Bell size={20} color="#fff" />
                  </View>
                  <Text style={styles.modalTitle}>Set Reminder</Text>
                </View>
                <Pressable style={styles.modalCloseBtn} onPress={closeReminderModal}>
                  <X size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>

              <Text style={styles.modalSubtitle}>
                Get notified to pray for this request
              </Text>

              <View style={styles.timePickerSection}>
                <View style={styles.timePickerContainer}>
                  <View style={styles.timeColumn}>
                    <Pressable style={styles.timeArrowBtn} onPress={incrementHour}>
                      <ChevronUp size={22} color={colors.primary} />
                    </Pressable>
                    <View style={styles.timeValueWrap}>
                      <Text style={styles.timeValue}>{padZero(displayHour)}</Text>
                    </View>
                    <Pressable style={styles.timeArrowBtn} onPress={decrementHour}>
                      <ChevronDown size={22} color={colors.primary} />
                    </Pressable>
                    <Text style={styles.timeColumnLabel}>Hour</Text>
                  </View>

                  <Text style={styles.timeSeparator}>:</Text>

                  <View style={styles.timeColumn}>
                    <Pressable style={styles.timeArrowBtn} onPress={incrementMinute}>
                      <ChevronUp size={22} color={colors.primary} />
                    </Pressable>
                    <View style={styles.timeValueWrap}>
                      <Text style={styles.timeValue}>{padZero(selectedMinute)}</Text>
                    </View>
                    <Pressable style={styles.timeArrowBtn} onPress={decrementMinute}>
                      <ChevronDown size={22} color={colors.primary} />
                    </Pressable>
                    <Text style={styles.timeColumnLabel}>Min</Text>
                  </View>

                  <View style={styles.periodColumn}>
                    <Pressable
                      style={[styles.periodBtn, period === "AM" && styles.periodBtnActive]}
                      onPress={() => { if (period !== "AM") togglePeriod(); }}
                    >
                      <Text style={[styles.periodBtnText, period === "AM" && styles.periodBtnTextActive]}>AM</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.periodBtn, period === "PM" && styles.periodBtnActive]}
                      onPress={() => { if (period !== "PM") togglePeriod(); }}
                    >
                      <Text style={[styles.periodBtnText, period === "PM" && styles.periodBtnTextActive]}>PM</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              <View style={styles.frequencySection}>
                <View style={styles.frequencySectionHeader}>
                  <Repeat size={14} color={colors.mutedForeground} />
                  <Text style={styles.frequencySectionLabel}>Frequency</Text>
                </View>
                <View style={styles.frequencyGrid}>
                  {FREQUENCY_OPTIONS.map((opt) => {
                    const isSelected = selectedFrequency === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        style={[styles.frequencyChip, isSelected && styles.frequencyChipActive]}
                        onPress={() => {
                          if (Platform.OS !== "web") void Haptics.selectionAsync();
                          setSelectedFrequency(opt.value);
                        }}
                      >
                        {opt.value === "everyday" && <Repeat size={14} color={isSelected ? "#fff" : colors.mutedForeground} />}
                        {opt.value === "weekdays" && <Calendar size={14} color={isSelected ? "#fff" : colors.mutedForeground} />}
                        {opt.value === "weekends" && <Calendar size={14} color={isSelected ? "#fff" : colors.mutedForeground} />}
                        {opt.value === "once" && <Clock size={14} color={isSelected ? "#fff" : colors.mutedForeground} />}
                        <Text style={[styles.frequencyChipText, isSelected && styles.frequencyChipTextActive]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.modalPreview}>
                <Bell size={14} color={colors.primary} />
                <Text style={styles.modalPreviewText}>
                  You'll be reminded {selectedFrequency === "once" ? "once" : selectedFrequency} at{" "}
                  <Text style={styles.modalPreviewBold}>{formatReminderTime(selectedHour, selectedMinute)}</Text>
                </Text>
              </View>

              <View style={styles.modalActions}>
                {existingReminder && (
                  <Pressable style={styles.removeReminderBtn} onPress={handleRemoveReminder}>
                    <BellOff size={16} color={colors.destructive} />
                    <Text style={styles.removeReminderText}>Remove</Text>
                  </Pressable>
                )}
                <Pressable style={[styles.saveReminderBtn, existingReminder && { flex: 1 }]} onPress={handleSaveReminder}>
                  <Bell size={18} color="#fff" />
                  <Text style={styles.saveReminderText}>
                    {existingReminder ? "Update Reminder" : "Set Reminder"}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  gradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 280,
    backgroundColor: colors.accent,
    opacity: 0.5,
    zIndex: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    zIndex: 1,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card + "CC",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tagPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tagPillText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  scrollContent: { paddingHorizontal: 24 },
  metaRow: { marginBottom: 8 },
  dateLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.mutedForeground,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: colors.foreground,
    lineHeight: 36,
    marginBottom: 24,
  },
  titleSmall: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.foreground,
    lineHeight: 28,
    flex: 1,
  },
  prayingForTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  contactAvatarTitle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
  },
  contactAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#D4782F18",
    borderWidth: 2,
    borderColor: "#D4782F30",
    alignItems: "center",
    justifyContent: "center",
  },
  contactAvatarInitial: {
    fontSize: 18,
    fontWeight: "700",
    color: "#D4782F",
  },
  bodyCard: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 28,
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border + "40",
    flexDirection: "row",
    gap: 16,
  },
  quoteAccent: {
    width: 3,
    borderRadius: 99,
    backgroundColor: colors.primary,
    opacity: 0.4,
    alignSelf: "stretch",
  },
  bodyText: {
    flex: 1,
    fontSize: 17,
    lineHeight: 28,
    color: colors.secondaryForeground,
    fontWeight: "400" as const,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border + "50",
    gap: 6,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.mutedForeground,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
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
    marginBottom: 16,
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
  dateBannerIconUrgent: {
    backgroundColor: colors.destructive + "15",
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
  prayingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#D4782F12",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#D4782F30",
  },
  prayingBannerText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#D4782F",
  },
  reminderSection: { marginBottom: 16 },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.mutedForeground,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  reminderCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: colors.border + "60",
    borderStyle: "dashed",
  },
  reminderCardActive: {
    backgroundColor: colors.primary + "0C",
    borderColor: colors.primary + "30",
    borderStyle: "solid",
  },
  reminderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  reminderIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  reminderIconWrapActive: {
    backgroundColor: colors.primary,
  },
  reminderFreq: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.mutedForeground,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  reminderFreqActive: {
    color: colors.primary,
  },
  reminderTime: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: 2,
  },
  reminderRight: {},
  reminderActiveBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#D4782F",
    alignItems: "center",
    justifyContent: "center",
  },
  reminderSetBtn: {
    backgroundColor: colors.primary + "15",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  reminderSetBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    backgroundColor: colors.background + "F0",
    borderTopWidth: 1,
    borderTopColor: colors.border + "30",
  },
  editBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 18,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  editBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primaryForeground,
  },
  actionBtn: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.foreground,
  },
  backFallback: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  backFallbackText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primaryForeground,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colors.background,
    borderRadius: 28,
    overflow: "hidden",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalBellWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.foreground,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
    paddingHorizontal: 24,
    marginTop: 4,
    marginBottom: 20,
  },
  timePickerSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  timePickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderRadius: 22,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border + "50",
    gap: 8,
  },
  timeColumn: {
    alignItems: "center",
    gap: 4,
  },
  timeArrowBtn: {
    width: 44,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primary + "10",
    alignItems: "center",
    justifyContent: "center",
  },
  timeValueWrap: {
    width: 72,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.primary + "0C",
    borderWidth: 2,
    borderColor: colors.primary + "25",
    alignItems: "center",
    justifyContent: "center",
  },
  timeValue: {
    fontSize: 36,
    fontWeight: "900",
    color: colors.foreground,
    letterSpacing: -1,
  },
  timeColumnLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.mutedForeground,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 2,
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.primary,
    marginHorizontal: 2,
    marginBottom: 20,
  },
  periodColumn: {
    gap: 6,
    marginLeft: 8,
    marginBottom: 20,
  },
  periodBtn: {
    width: 50,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  periodBtnActive: {
    backgroundColor: colors.primary,
  },
  periodBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.mutedForeground,
  },
  periodBtnTextActive: {
    color: "#fff",
  },
  frequencySection: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  frequencySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  frequencySectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.mutedForeground,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  frequencyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  frequencyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border + "60",
  },
  frequencyChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  frequencyChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.secondaryForeground,
  },
  frequencyChipTextActive: {
    color: "#fff",
  },
  modalPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 24,
    backgroundColor: colors.primary + "0A",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary + "15",
  },
  modalPreviewText: {
    fontSize: 13,
    color: colors.secondaryForeground,
    flex: 1,
    lineHeight: 18,
  },
  modalPreviewBold: {
    fontWeight: "800",
    color: colors.primary,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  removeReminderBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: colors.destructive + "12",
    borderWidth: 1,
    borderColor: colors.destructive + "25",
  },
  removeReminderText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.destructive,
  },
  saveReminderBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  saveReminderText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
