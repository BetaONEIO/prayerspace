import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { HandHeart, ExternalLink, CornerUpLeft, Zap, CheckCircle2, Clock } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { supabase } from "@/lib/supabase";
import { useThemeColors } from "@/providers/ThemeProvider";

export interface PrayerCardMeta {
  prayer_request_id?: string;
  preview_text?: string;
  event_date?: string | null;
  is_time_sensitive?: boolean;
  is_anonymous?: boolean;
  tags?: string[];
}

interface Props {
  meta: PrayerCardMeta;
  rawContent?: string;
  isMine: boolean;
  onReply?: () => void;
}

type PrayerStatus = "ongoing" | "answered" | "still_need_prayer" | "archived";

const STATUS_CONFIG: Record<PrayerStatus, { label: string; color: string; bg: string; icon: "clock" | "check" }> = {
  ongoing: { label: "Ongoing", color: "#7A6500", bg: "#FFF8E0", icon: "clock" },
  still_need_prayer: { label: "Still need prayer", color: "#D96E27", bg: "#FFF0E5", icon: "clock" },
  answered: { label: "Answered 🙌", color: "#2F6B4A", bg: "#EEF6F1", icon: "check" },
  archived: { label: "Archived", color: "#888", bg: "#F0F0F0", icon: "clock" },
};

export default function PrayerRequestCard({ meta, rawContent, isMine, onReply }: Props) {
  const colors = useThemeColors();
  const router = useRouter();
  const [status, setStatus] = useState<PrayerStatus>("ongoing");
  const [hasPrayed, setHasPrayed] = useState(false);

  useEffect(() => {
    if (!meta.prayer_request_id) return;
    supabase
      .from("prayer_requests")
      .select("status")
      .eq("id", meta.prayer_request_id)
      .single()
      .then(({ data }) => {
        if (data?.status) setStatus(data.status as PrayerStatus);
      });
  }, [meta.prayer_request_id]);

  const handlePraying = useCallback(() => {
    if (typeof Haptics !== "undefined") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setHasPrayed((prev) => !prev);
  }, []);

  const handleViewRequest = useCallback(() => {
    if (meta.prayer_request_id) {
      router.push("/my-posts" as never);
    }
  }, [meta.prayer_request_id, router]);

  const displayText = meta.preview_text || rawContent || "Shared a prayer request";
  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.ongoing;
  const isTimeSensitive = meta.is_time_sensitive;

  const cardBg = isMine ? colors.primary + "10" : colors.card;
  const borderColor = isMine ? colors.primary + "30" : colors.border;
  const accentColor = colors.primary;

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerIcon]}>🙏</Text>
          <Text style={[styles.headerLabel, { color: accentColor }]}>Prayer Request</Text>
          {isTimeSensitive && (
            <View style={styles.urgentBadge}>
              <Zap size={10} color="#B87A00" />
              <Text style={styles.urgentText}>Urgent</Text>
            </View>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
          {statusCfg.icon === "check" ? (
            <CheckCircle2 size={11} color={statusCfg.color} />
          ) : (
            <Clock size={11} color={statusCfg.color} />
          )}
          <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: borderColor }]} />

      <Text style={[styles.prayerText, { color: colors.foreground }]} numberOfLines={4}>
        {displayText}
      </Text>

      {meta.event_date && (
        <View style={styles.dateRow}>
          <Text style={[styles.dateText, { color: colors.mutedForeground }]}>
            📅 {new Date(meta.event_date).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
          </Text>
        </View>
      )}

      {meta.tags && meta.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {meta.tags.slice(0, 2).map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: accentColor + "15", borderColor: accentColor + "30" }]}>
              <Text style={[styles.tagText, { color: accentColor }]}>{tag.replace(/_/g, " ")}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={[styles.actionsRow, { borderTopColor: borderColor }]}>
        <Pressable
          style={[styles.actionBtn, hasPrayed && { backgroundColor: colors.primary + "15" }]}
          onPress={handlePraying}
        >
          <HandHeart size={14} color={hasPrayed ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.actionLabel, hasPrayed && { color: colors.primary }]}>
            {hasPrayed ? "Praying" : "Pray"}
          </Text>
        </Pressable>

        {meta.prayer_request_id && (
          <Pressable style={styles.actionBtn} onPress={handleViewRequest}>
            <ExternalLink size={14} color={colors.mutedForeground} />
            <Text style={styles.actionLabel}>View</Text>
          </Pressable>
        )}

        {onReply && (
          <Pressable style={styles.actionBtn} onPress={onReply}>
            <CornerUpLeft size={14} color={colors.mutedForeground} />
            <Text style={styles.actionLabel}>Reply</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: 16,
    overflow: "hidden",
    minWidth: 240,
    maxWidth: 300,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    flexShrink: 1,
  },
  headerIcon: {
    fontSize: 15,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  urgentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#FFF8E0",
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  urgentText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#B87A00",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginHorizontal: 0,
  },
  prayerText: {
    fontSize: 13.5,
    lineHeight: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  dateRow: {
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  dateText: {
    fontSize: 12,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  actionsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 0,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
  },
});
