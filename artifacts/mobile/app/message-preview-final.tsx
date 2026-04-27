import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import AvatarImage from "@/components/AvatarImage";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Clock3, MessageCircle, Send, Smartphone, Rss } from "lucide-react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";
import { useSelectedRecipients } from "@/providers/SelectedRecipientsProvider";
import { useAuth } from "@/providers/AuthProvider";

type DeliveryChannel = "app" | "whatsapp" | "sms";

interface PreviewRecipient {
  id: string;
  name: string;
  avatar: string;
  channel: DeliveryChannel;
}

const PLACEHOLDER_AVATARS = [
  "https://randomuser.me/api/portraits/men/32.jpg",
  "https://randomuser.me/api/portraits/women/44.jpg",
  "https://randomuser.me/api/portraits/men/52.jpg",
  "https://randomuser.me/api/portraits/women/62.jpg",
  "https://randomuser.me/api/portraits/men/22.jpg",
];

function mapSourceToChannel(source: string, onApp: boolean): DeliveryChannel {
  if (onApp) return "app";
  if (source === "whatsapp") return "whatsapp";
  return "sms";
}

const CHANNEL_META: Record<DeliveryChannel, { label: string; tint: string; softTint: string; bubbleColor: string; bubbleTextColor: string; bubbleAlign: "flex-start" | "flex-end"; timestamp: string; }> = {
  app: {
    label: "In-app delivery",
    tint: colors.primary,
    softTint: colors.primary + "18",
    bubbleColor: colors.card,
    bubbleTextColor: colors.foreground,
    bubbleAlign: "flex-start",
    timestamp: "Sent as soon as you tap send",
  },
  whatsapp: {
    label: "WhatsApp",
    tint: "#25D366",
    softTint: "#25D36618",
    bubbleColor: "#DCF8C5",
    bubbleTextColor: "#1F2C18",
    bubbleAlign: "flex-end",
    timestamp: "Delivered through WhatsApp",
  },
  sms: {
    label: "Text message",
    tint: "#3B82F6",
    softTint: "#3B82F618",
    bubbleColor: "#E9F2FF",
    bubbleTextColor: "#16324F",
    bubbleAlign: "flex-end",
    timestamp: "Delivered as a text message",
  },
};

function WhatsAppMark({ small = false }: { small?: boolean }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <View style={[styles.whatsAppMark, small && styles.whatsAppMarkSmall]}>
      <Text style={[styles.whatsAppMarkText, small && styles.whatsAppMarkTextSmall]}>WA</Text>
    </View>
  );
}

function RecipientChannelIcon({ channel, small = false }: { channel: DeliveryChannel; small?: boolean }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  if (channel === "whatsapp") {
    return <WhatsAppMark small={small} />;
  }

  if (channel === "sms") {
    return (
      <View style={[styles.smsIconWrap, small && styles.smsIconWrapSmall]}>
        <Smartphone size={small ? 10 : 12} color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={[styles.appIconWrap, small && styles.appIconWrapSmall]}>
      <MessageCircle size={small ? 10 : 12} color={colors.primary} />
    </View>
  );
}

function ChannelBadge({ channel }: { channel: DeliveryChannel }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const meta = CHANNEL_META[channel];

  return (
    <View style={[styles.channelBadge, { backgroundColor: meta.softTint }]}> 
      <RecipientChannelIcon channel={channel} small />
      <Text style={[styles.channelBadgeText, { color: meta.tint }]}>{meta.label}</Text>
    </View>
  );
}

function MessageBubble({ channel, message }: { channel: DeliveryChannel; message: string }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const meta = CHANNEL_META[channel];
  const bubbleSide = meta.bubbleAlign === "flex-end" ? styles.messageRowEnd : styles.messageRowStart;

  return (
    <View style={[styles.messageRow, bubbleSide]}>
      {channel !== "app" && (
        <View style={styles.messageMetaRow}>
          <ChannelBadge channel={channel} />
        </View>
      )}
      <View
        style={[
          styles.messageBubble,
          {
            backgroundColor: meta.bubbleColor,
            alignSelf: meta.bubbleAlign,
          },
          channel === "whatsapp" && styles.whatsAppBubble,
          channel === "sms" && styles.smsBubble,
        ]}
      >
        <Text style={[styles.messageText, { color: meta.bubbleTextColor }]}>{message}</Text>
        <Text style={styles.messageTime}>{channel === "app" ? "Now" : "12:24 PM"}</Text>
      </View>
    </View>
  );
}

function DeliverySurface({ channel, message }: { channel: DeliveryChannel; message: string }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  if (channel === "whatsapp") {
    return (
      <View style={styles.phoneSurfaceWhatsApp}>
        <View style={styles.messagingTopBar}>
          <View style={styles.messagingAvatarDot} />
          <Text style={styles.messagingTopBarText}>WhatsApp chat</Text>
        </View>
        <MessageBubble channel={channel} message={message} />
      </View>
    );
  }

  if (channel === "sms") {
    return (
      <View style={styles.phoneSurfaceSms}>
        <View style={styles.messagingTopBar}>
          <View style={[styles.messagingAvatarDot, styles.messagingAvatarDotBlue]} />
          <Text style={styles.messagingTopBarText}>Messages</Text>
        </View>
        <MessageBubble channel={channel} message={message} />
      </View>
    );
  }

  return (
    <View style={styles.appSurface}>
      <MessageBubble channel={channel} message={message} />
    </View>
  );
}

function FeedPreviewCard({ message, avatarPath, displayName }: { message: string; avatarPath: string | null | undefined; displayName: string }) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.previewCard}>
      <View style={styles.previewHeader}>
        <AvatarImage avatarPath={avatarPath} fallbackSeed={displayName} style={styles.previewAvatar} />
        <View style={styles.previewHeaderTextWrap}>
          <View style={styles.previewNameRow}>
            <Text style={styles.previewName}>{displayName}</Text>
            <View style={styles.feedIconWrap}>
              <Rss size={12} color={colors.primary} />
            </View>
          </View>
          <Text style={styles.previewSubtitle}>Community Feed post</Text>
        </View>
      </View>

      <View style={styles.feedSurface}>
        <View style={styles.feedPostContent}>
          <Text style={styles.feedPostText}>{message}</Text>
          <Text style={styles.feedPostTime}>Now</Text>
        </View>
      </View>

      <View style={styles.previewFooter}>
        <View style={styles.previewFooterLeft}>
          <Clock3 size={14} color={colors.mutedForeground} />
          <Text style={styles.previewFooterText}>Shared to community feed</Text>
        </View>
      </View>
    </View>
  );
}

function formatDisplayName(name: string): string {
  return name.split(" ")[0] ?? name;
}

export default function MessagePreviewFinalScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { sendToFeed: sendToFeedParam } = useLocalSearchParams<{ sendToFeed?: string }>();
  const isSendToFeed = sendToFeedParam === "true";
  const { selectedRecipients, draftPrayerText } = useSelectedRecipients();
  const { user, profile } = useAuth();
  const [selectedIdx, setSelectedIdx] = useState(0);

  console.log("[MessagePreviewFinal] draftPrayerText received:", draftPrayerText?.slice(0, 80));
  console.log("[MessagePreviewFinal] sendToFeed:", isSendToFeed, "recipients:", selectedRecipients.length);

  const userDisplayName = formatDisplayName(
    profile?.full_name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "You"
  );


  const recipients: PreviewRecipient[] = useMemo(() => {
    return selectedRecipients.map((r, i) => ({
      id: r.id,
      name: r.name,
      avatar: r.avatar || PLACEHOLDER_AVATARS[i % PLACEHOLDER_AVATARS.length],
      channel: mapSourceToChannel(r.source, r.onApp),
    }));
  }, [selectedRecipients]);

  const hasRecipients = recipients.length > 0;
  const feedOnly = isSendToFeed && !hasRecipients;

  const prayerMessage = draftPrayerText?.trim()
    ? draftPrayerText
    : "Praying for peace, strength, and blessing over you today.";

  const safeIdx = Math.min(selectedIdx, Math.max(recipients.length - 1, 0));
  const selected = recipients[safeIdx] || { id: "0", name: "Friend", avatar: PLACEHOLDER_AVATARS[0], channel: "app" as DeliveryChannel };
  const selectedMeta = CHANNEL_META[selected.channel];
  const titleSuffix = useMemo(() => {
    if (selected.channel === "whatsapp") return "WhatsApp";
    if (selected.channel === "sms") return "Text";
    return "In-app";
  }, [selected.channel]);

  const sendingToLabel = useMemo(() => {
    const parts: string[] = [];
    if (hasRecipients) {
      parts.push(`${recipients.length} ${recipients.length === 1 ? "person" : "people"}`);
    }
    if (isSendToFeed) {
      parts.push("Feed");
    }
    return parts.join(" + ");
  }, [hasRecipients, recipients.length, isSendToFeed]);

  const handleSend = useCallback(() => {
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    router.push((`/sending-progress?sendToFeed=${isSendToFeed}&recipientCount=${recipients.length}`) as never);
  }, [router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.secondaryForeground} />
        </Pressable>
        <Text style={styles.headerTitle}>Preview prayer</Text>
        <View style={{ width: 40 }} />
      </View>
      <Text style={styles.headerSubtitle}>Here is how your message will appear</Text>

      <View style={styles.recipientsSummary}>
        {hasRecipients && (
          <View style={styles.recipientAvatarStack}>
            {recipients.map((r, i) => (
              <Image
                key={r.id}
                source={{ uri: r.avatar }}
                style={[
                  styles.stackAvatar,
                  { marginLeft: i === 0 ? 0 : -10, zIndex: recipients.length - i },
                ]}
              />
            ))}
          </View>
        )}
        {feedOnly && (
          <View style={styles.feedBadgeIcon}>
            <Rss size={16} color={colors.primary} />
          </View>
        )}
        <Text style={styles.recipientsSummaryText}>
          Sending to{" "}
          <Text style={styles.recipientsSummaryBold}>{sendingToLabel}</Text>
        </Text>
      </View>

      <AutoScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {hasRecipients && (
          <>
            <View style={styles.recipientChipsWrap}>
              {recipients.map((r, i) => (
                <Pressable
                  key={r.id}
                  style={[
                    styles.recipientChip,
                    i === selectedIdx && styles.recipientChipActive,
                    i === selectedIdx && { borderColor: CHANNEL_META[r.channel].tint, backgroundColor: CHANNEL_META[r.channel].softTint },
                  ]}
                  onPress={() => setSelectedIdx(i)}
                >
                  <Image source={{ uri: r.avatar }} style={styles.chipAvatar} />
                  <Text style={[styles.chipName, i === selectedIdx && { color: CHANNEL_META[r.channel].tint }]}>
                    {formatDisplayName(r.name)}
                  </Text>
                  {r.channel !== "app" ? <RecipientChannelIcon channel={r.channel} small /> : null}
                </Pressable>
              ))}
            </View>

            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Image source={{ uri: selected.avatar }} style={styles.previewAvatar} />
                <View style={styles.previewHeaderTextWrap}>
                  <View style={styles.previewNameRow}>
                    <Text style={styles.previewName}>{formatDisplayName(selected.name)}</Text>
                    <RecipientChannelIcon channel={selected.channel} />
                  </View>
                  <Text style={styles.previewSubtitle}>{titleSuffix} preview</Text>
                </View>
              </View>

              <DeliverySurface channel={selected.channel} message={prayerMessage} />

              <View style={styles.previewFooter}>
                <View style={styles.previewFooterLeft}>
                  <Clock3 size={14} color={colors.mutedForeground} />
                  <Text style={styles.previewFooterText}>{selectedMeta.timestamp}</Text>
                </View>
              </View>
            </View>

            {recipients.length > 1 && (
              <View style={styles.dotsRow}>
                {recipients.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.dot, i === selectedIdx && styles.dotActive]}
                  />
                ))}
              </View>
            )}
          </>
        )}

        {isSendToFeed && (
          <>
            {hasRecipients && (
              <View style={styles.feedSectionDivider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerLabel}>FEED POST</Text>
                <View style={styles.dividerLine} />
              </View>
            )}
            <FeedPreviewCard
              message={prayerMessage}
              avatarPath={profile?.avatar_url}
              displayName={userDisplayName}
            />
          </>
        )}
      </AutoScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.editBtn} onPress={() => router.back()}>
          <Text style={styles.editBtnText}>Edit</Text>
        </Pressable>
        <Pressable style={styles.sendBtn} onPress={handleSend}>
          <Text style={styles.sendBtnText}>Send Prayer</Text>
          <Send size={18} color={colors.primaryForeground} />
        </Pressable>
      </View>
    </SafeAreaView>
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: colors.foreground,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center",
    marginBottom: 16,
    marginTop: 4,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },
  recipientsSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 14,
  },
  recipientAvatarStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  stackAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.background,
  },
  recipientsSummaryText: {
    fontSize: 13,
    color: colors.mutedForeground,
  },
  recipientsSummaryBold: {
    fontWeight: "700" as const,
    color: colors.foreground,
  },
  feedBadgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  recipientChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 16,
  },
  recipientChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.card,
    paddingVertical: 7,
    paddingLeft: 7,
    paddingRight: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border + "60",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  recipientChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "08",
  },
  chipAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  chipName: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.secondaryForeground,
  },
  chipNameActive: {
    color: colors.primary,
  },
  previewHeaderTextWrap: {
    flex: 1,
  },
  previewCard: {
    backgroundColor: colors.card,
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.border + "30",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  previewAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: colors.primary + "20",
  },
  previewNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  previewName: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.foreground,
  },
  previewSubtitle: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  channelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  channelBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
  },
  appSurface: {
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  phoneSurfaceWhatsApp: {
    backgroundColor: "#E5DDD5",
    borderRadius: 24,
    padding: 14,
    overflow: "hidden",
  },
  phoneSurfaceSms: {
    backgroundColor: "#F4F6FA",
    borderRadius: 24,
    padding: 14,
    overflow: "hidden",
  },
  messagingTopBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  messagingAvatarDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#25D366",
  },
  messagingAvatarDotBlue: {
    backgroundColor: "#3B82F6",
  },
  messagingTopBarText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.secondaryForeground,
  },
  messageRow: {
    width: "100%",
  },
  messageRowStart: {
    alignItems: "flex-start",
  },
  messageRowEnd: {
    alignItems: "flex-end",
  },
  messageMetaRow: {
    paddingHorizontal: 2,
  },
  messageBubble: {
    maxWidth: "88%",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  whatsAppBubble: {
    borderTopRightRadius: 8,
  },
  smsBubble: {
    borderTopRightRadius: 10,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  messageTime: {
    marginTop: 8,
    fontSize: 11,
    color: colors.mutedForeground,
    alignSelf: "flex-end",
  },
  whatsAppMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
  },
  whatsAppMarkSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  whatsAppMarkText: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: "#FFFFFF",
  },
  whatsAppMarkTextSmall: {
    fontSize: 7,
  },
  smsIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#3B82F618",
    alignItems: "center",
    justifyContent: "center",
  },
  smsIconWrapSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  appIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  appIconWrapSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  feedIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  feedSurface: {
    backgroundColor: colors.background,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  feedPostContent: {
    backgroundColor: colors.accent,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  feedPostText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.foreground,
  },
  feedPostTime: {
    marginTop: 8,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  feedSectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: colors.mutedForeground,
    letterSpacing: 1.5,
  },
  previewFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border + "20",
  },
  previewFooterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  previewFooterText: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 20,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.muted,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 24,
    paddingBottom: 16,
  },
  editBtn: {
    backgroundColor: colors.secondary,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: colors.border + "80",
  },
  editBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.secondaryForeground,
  },
  sendBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 14,
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
  sendBtnText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.primaryForeground,
  },
});
