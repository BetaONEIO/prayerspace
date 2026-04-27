import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, ArrowRight, Home, MessageCircle, Check, Rss, Share2, Globe } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";
import { useSelectedRecipients } from "@/providers/SelectedRecipientsProvider";

const DONT_SHOW_KEY = "delivery_explanation_hidden";

export default function DeliveryExplanationScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [dontShow, setDontShow] = useState(false);
  const [hideChannels, setHideChannels] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const channelOpacity = useRef(new Animated.Value(1)).current;
  const { contacts, sendToFeed, isTimeSensitive, isAnonymous: isAnonymousParam, eventDate: eventDateParam, tags: tagsParam } = useLocalSearchParams<{
    contacts: string;
    sendToFeed?: string;
    isTimeSensitive?: string;
    isAnonymous?: string;
    eventDate?: string;
    tags?: string;
  }>();
  const isSendToFeed = sendToFeed === "true";
  const { selectedRecipients, draftPrayerText } = useSelectedRecipients();

  const appCount = useMemo(() => selectedRecipients.filter((r) => r.onApp).length, [selectedRecipients]);
  const externalCount = useMemo(() => selectedRecipients.filter((r) => !r.onApp).length, [selectedRecipients]);
  const totalCount = selectedRecipients.length;

  useEffect(() => {
    AsyncStorage.getItem(DONT_SHOW_KEY).then((val) => {
      if (val === "true") {
        setDontShow(true);
        setHideChannels(true);
        channelOpacity.setValue(0);
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const handleToggleDontShow = () => {
    const next = !dontShow;
    setDontShow(next);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (next) {
      AsyncStorage.setItem(DONT_SHOW_KEY, "true").catch(() => {});
      Animated.timing(channelOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setHideChannels(true));
    } else {
      AsyncStorage.removeItem(DONT_SHOW_KEY).catch(() => {});
      setHideChannels(false);
      Animated.timing(channelOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleContinue = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    console.log("[DeliveryExplanation] draftPrayerText in context:", draftPrayerText?.slice(0, 80));
    router.push({
      pathname: "/message-preview-final" as never,
      params: {
        contacts,
        sendToFeed: String(isSendToFeed),
        isTimeSensitive: isTimeSensitive ?? "false",
        isAnonymous: isAnonymousParam ?? "false",
        eventDate: eventDateParam ?? "",
        tags: tagsParam ?? "[]",
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.secondaryForeground} />
        </Pressable>
        <View style={{ width: 40 }} />
      </View>

      <AutoScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroContainer}>
          <View style={styles.heroIcon}>
            <Share2 size={36} color={colors.primary} />
          </View>
          <Text style={styles.title}>How this will be sent</Text>
          <Text style={styles.subtitle}>
            Depending on how your contacts are connected, we use different ways to deliver your prayer.
          </Text>
        </View>

        {!hideChannels && (
          <Animated.View style={[styles.channelList, { opacity: channelOpacity }]}>
            <View style={styles.channelCard}>
              <View style={[styles.channelIcon, { backgroundColor: colors.primary + "18" }]}>
                <Home size={22} color={colors.primary} />
              </View>
              <View style={styles.channelText}>
                <Text style={styles.channelTitle}>Prayer Space users</Text>
                <Text style={styles.channelDesc}>
                  They'll receive your prayer instantly as a sacred notification inside the app.
                </Text>
              </View>
            </View>

            <View style={styles.channelCard}>
              <View style={[styles.channelIcon, { backgroundColor: "#25D366" + "18" }]}>
                <Text style={styles.whatsappEmoji}>💬</Text>
              </View>
              <View style={styles.channelText}>
                <Text style={styles.channelTitle}>WhatsApp contacts</Text>
                <Text style={styles.channelDesc}>
                  We'll prepare a message for you to send directly through WhatsApp.
                </Text>
              </View>
            </View>

            <View style={styles.channelCard}>
              <View style={[styles.channelIcon, { backgroundColor: "#4A90D9" + "18" }]}>
                <MessageCircle size={22} color="#4A90D9" />
              </View>
              <View style={styles.channelText}>
                <Text style={styles.channelTitle}>SIM & Phone contacts</Text>
                <Text style={styles.channelDesc}>
                  They'll receive a personal text message notification if supported by your carrier.
                </Text>
              </View>
            </View>

            {isSendToFeed && (
              <View style={[styles.channelCard, styles.feedCardHighlight]}>
                <View style={[styles.channelIcon, { backgroundColor: colors.primary + "22" }]}>
                  <Rss size={22} color={colors.primary} />
                </View>
                <View style={styles.channelText}>
                  <Text style={[styles.channelTitle, { color: colors.primary }]}>Community Feed</Text>
                  <Text style={styles.channelDesc}>
                    Your prayer will be shared on the community feed for others to see and pray with you.
                  </Text>
                </View>
              </View>
            )}
          </Animated.View>
        )}

        {!hideChannels && (
          <Animated.View style={[styles.dontShowRow, { opacity: channelOpacity }]}>
            <Pressable style={styles.dontShowBtn} onPress={handleToggleDontShow}>
              <View style={[styles.dontShowTick, dontShow && styles.dontShowTickActive]}>
                {dontShow && <Check size={12} color={colors.primaryForeground} strokeWidth={3} />}
              </View>
              <Text style={styles.dontShowText}>Don't show this again</Text>
            </Pressable>
          </Animated.View>
        )}

        {totalCount > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryLabel}>DELIVERY SUMMARY</Text>
              <Text style={styles.summaryCount}>{totalCount} {totalCount === 1 ? 'Recipient' : 'Recipients'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>On App</Text>
              <Text style={styles.summaryValue}>{appCount} {appCount === 1 ? 'User' : 'Users'}</Text>
            </View>
            <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.summaryKey}>External</Text>
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>{externalCount} {externalCount === 1 ? 'Contact' : 'Contacts'}</Text>
            </View>
          </View>
        )}

        {isSendToFeed && (
          <View style={[styles.publicCard, totalCount === 0 && styles.publicCardProminent]}>
            <View style={styles.publicHeader}>
              <View style={styles.publicIconWrap}>
                <Globe size={22} color={colors.primary} />
              </View>
              <View style={styles.publicTextWrap}>
                <Text style={styles.publicTitle}>Sharing with Community</Text>
                <Text style={styles.publicSubtitle}>This prayer will be visible to others in your community</Text>
              </View>
            </View>
            <Text style={styles.publicSectionLabel}>SHARING PUBLICLY</Text>
          </View>
        )}
      </AutoScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.continueBtn} onPress={handleContinue}>
          <Text style={styles.continueBtnText}>Continue</Text>
          <ArrowRight size={20} color={colors.primaryForeground} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },
  heroContainer: { alignItems: "center", marginBottom: 36, paddingTop: 8 },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: colors.foreground,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  channelList: { gap: 14, marginBottom: 0 },
  channelCard: {
    flexDirection: "row",
    gap: 16,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border + "60",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  channelIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  whatsappEmoji: { fontSize: 22 },
  channelText: { flex: 1 },
  channelTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.foreground,
    marginBottom: 4,
  },
  channelDesc: {
    fontSize: 12,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  summaryCard: {
    marginTop: 24,
    backgroundColor: colors.secondary + "50",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border + "30",
  },
  publicCard: {
    marginTop: 16,
    backgroundColor: colors.accent,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.primary + "20",
  },
  publicCardProminent: {
    marginTop: 24,
    borderColor: colors.primary + "35",
    backgroundColor: colors.primary + "12",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  publicHeader: {
    flexDirection: "row" as const,
    gap: 14,
    alignItems: "center" as const,
  },
  publicIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary + "18",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexShrink: 0,
  },
  publicTextWrap: {
    flex: 1,
  },
  publicTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.foreground,
    marginBottom: 3,
  },
  publicSubtitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    lineHeight: 18,
  },
  publicSectionLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: colors.primary,
    letterSpacing: 1,
    marginTop: 14,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: colors.mutedForeground,
    letterSpacing: 1,
  },
  summaryCount: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.foreground,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "20",
  },
  summaryKey: { fontSize: 14, color: colors.foreground },
  summaryValue: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  dontShowRow: {
    alignItems: "center" as const,
    marginTop: 20,
    marginBottom: 4,
  },
  feedCardHighlight: {
    borderColor: colors.primary + "40",
    borderWidth: 1.5,
    backgroundColor: colors.accent,
  },
  footer: { padding: 24, paddingBottom: 16, gap: 12 },
  continueBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.primaryForeground,
  },
  dontShowBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    paddingVertical: 4,
  },
  dontShowTick: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  dontShowTickActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dontShowText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.mutedForeground,
  },
});
