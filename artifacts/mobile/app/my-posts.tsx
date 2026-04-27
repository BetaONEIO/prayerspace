import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { feedStore, FEED_COMMUNITIES, type FeedCommunityId } from "@/lib/feedStore";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  Animated,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import {
  ChevronLeft,
  Repeat2,
  CheckCircle,
  HeartHandshake,
  Clock,
  Heart,
  MessageCircle,
  MoreHorizontal,
  X,
  CheckCircle2,
  Sparkles,
  Archive,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";
import { usePrayer } from "@/providers/PrayerProvider";
import type { ArchivedPost } from "@/providers/PrayerProvider";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

type UpdateTag = "still_need_prayer" | "answered";
type FilterTab = "All" | "Ongoing" | "Answered" | "Archived";

interface MyPost {
  id: string;
  category: string;
  timeLabel: string;
  postedAt: string;
  content: string;
  prayerCount: number;
  commentCount: number;
  prayedByAvatars: string[];
  isTimeSensitive?: boolean;
  updateTag?: UpdateTag;
  isAnswered: boolean;
  originalPostId?: string;
  originalContent?: string;
  originalPostedAt?: string;
}

const INITIAL_MY_POSTS: MyPost[] = [
  {
    id: "f1",
    category: "SURGERY",
    timeLabel: "TODAY",
    postedAt: "Today at 9:14 AM",
    isTimeSensitive: true,
    content:
      '"My grandmother is going into surgery tomorrow morning for her hip. Please pray for the doctors and for her peace of mind during the procedure."',
    prayerCount: 12,
    commentCount: 5,
    prayedByAvatars: [
      "https://randomuser.me/api/portraits/men/32.jpg",
      "https://randomuser.me/api/portraits/women/44.jpg",
      "https://randomuser.me/api/portraits/men/85.jpg",
    ],
    isAnswered: false,
  },
  {
    id: "f3",
    category: "HEALING",
    timeLabel: "YESTERDAY",
    postedAt: "Yesterday at 7:45 AM",
    isTimeSensitive: true,
    content:
      '"Please keep my mum in prayer — she was rushed to hospital this morning. Doctors are still running tests. We trust in the Lord completely."',
    prayerCount: 34,
    commentCount: 11,
    prayedByAvatars: [
      "https://randomuser.me/api/portraits/men/32.jpg",
      "https://randomuser.me/api/portraits/women/24.jpg",
      "https://randomuser.me/api/portraits/men/55.jpg",
    ],
    isAnswered: false,
  },
  {
    id: "update_1",
    category: "UPDATE",
    timeLabel: "3 DAYS AGO",
    postedAt: "Apr 18 at 11:30 AM",
    content: "God has been so faithful. My sister passed her exams and we are so grateful. Thank you all for praying.",
    prayerCount: 7,
    commentCount: 3,
    prayedByAvatars: [
      "https://randomuser.me/api/portraits/women/33.jpg",
      "https://randomuser.me/api/portraits/men/75.jpg",
    ],
    updateTag: "answered",
    isAnswered: true,
    originalPostId: "old_f5",
    originalContent: "Please pray for my sister who is sitting her final exams this week. She's been really anxious.",
    originalPostedAt: "Apr 15 at 8:00 AM",
  },
];

const ANSWERED_GREEN = "#4A8C6A";
const ANSWERED_GREEN_BG = "#EEF6F1";
const ANSWERED_GREEN_BORDER = "#4A8C6A30";

const UPDATE_TAG_CONFIG: Record<
  UpdateTag,
  { label: string; color: string; bg: string }
> = {
  still_need_prayer: {
    label: "Still need prayer",
    color: "#D96E27",
    bg: "#FFF0E5",
  },
  answered: { label: "Answered 🙌", color: "#ffffff", bg: ANSWERED_GREEN },
};

function formatRelativeDate(iso: string): { timeLabel: string; postedAt: string } {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return { timeLabel: "JUST NOW", postedAt: "Just now" };
  if (diffMins < 60) return { timeLabel: "TODAY", postedAt: `${diffMins}m ago` };
  if (diffDays === 0) return { timeLabel: "TODAY", postedAt: `Today at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` };
  if (diffDays === 1) return { timeLabel: "YESTERDAY", postedAt: `Yesterday at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` };
  if (diffDays < 7) return { timeLabel: `${diffDays} DAYS AGO`, postedAt: d.toLocaleDateString([], { month: "short", day: "numeric" }) };
  return { timeLabel: d.toLocaleDateString([], { month: "short", day: "numeric" }).toUpperCase(), postedAt: d.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) };
}

export default function MyPostsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { user } = useAuth();
  const { archivedPosts } = usePrayer();
  const [posts, setPosts] = useState<MyPost[]>(INITIAL_MY_POSTS);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("prayer_requests")
      .select("id, content, tags, is_time_sensitive, status, prayer_count, created_at")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error || !data) return;
        const realPosts: MyPost[] = data.map((row) => {
          const { timeLabel, postedAt } = formatRelativeDate(row.created_at as string);
          const tags: string[] = Array.isArray(row.tags) ? row.tags : [];
          const category = tags.length > 0
            ? tags[0].replace(/_/g, " ").toUpperCase()
            : "PRAYER REQUEST";
          return {
            id: row.id as string,
            category,
            timeLabel,
            postedAt,
            content: row.content as string,
            prayerCount: (row.prayer_count as number) ?? 0,
            commentCount: 0,
            prayedByAvatars: [],
            isTimeSensitive: row.is_time_sensitive as boolean,
            isAnswered: row.status === "answered",
            updateTag: row.status === "answered" ? "answered" : undefined,
          };
        });
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newOnes = realPosts.filter((p) => !existingIds.has(p.id));
          return [...newOnes, ...prev];
        });
      });
  }, [user?.id]);
  const [filter, setFilter] = useState<FilterTab>("All");
  const [repostTarget, setRepostTarget] = useState<MyPost | null>(null);
  const [markAnsweredTarget, setMarkAnsweredTarget] = useState<MyPost | null>(null);
  const [testimonySuccess, setTestimonySuccess] = useState<{ communityId: string; communityName: string } | null>(null);

  const filtered = posts.filter((p) => {
    if (filter === "Ongoing") return !p.isAnswered;
    if (filter === "Answered") return p.isAnswered;
    if (filter === "Archived") return false;
    return true;
  });

  const ongoingCount = posts.filter((p) => !p.isAnswered).length;
  const answeredCount = posts.filter((p) => p.isAnswered).length;

  const handleMarkAnswered = useCallback((post: MyPost) => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, isAnswered: true, updateTag: "answered" } : p
      )
    );
    setMarkAnsweredTarget(null);
    console.log("[MyPosts] Marked as answered:", post.id);
  }, []);

  const handleSubmitRepost = useCallback(
    (originalPost: MyPost, text: string, tag?: UpdateTag, communityId?: string) => {
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const isAnsweredUpdate = tag === "answered";
      const newPost: MyPost = {
        id: `update_${Date.now()}`,
        category: "UPDATE",
        timeLabel: "JUST NOW",
        postedAt: "Just now",
        content: text,
        prayerCount: 0,
        commentCount: 0,
        prayedByAvatars: [],
        updateTag: tag,
        isAnswered: isAnsweredUpdate,
        originalPostId: originalPost.id,
        originalContent: originalPost.content.replace(/^"|"$/g, ""),
        originalPostedAt: originalPost.postedAt,
      };
      setPosts((prev) => {
        const updated = [newPost, ...prev];
        if (isAnsweredUpdate) {
          return updated.map((p) =>
            p.id === originalPost.id ? { ...p, isAnswered: true } : p
          );
        }
        return updated;
      });
      if (isAnsweredUpdate && communityId) {
        feedStore.addPost({
          id: newPost.id,
          communityId,
          authorId: "sarah_current",
          authorName: "Sarah",
          authorAvatar: "https://randomuser.me/api/portraits/women/68.jpg",
          category: "UPDATE",
          tags: ["answered"],
          timeLabel: "JUST NOW",
          postedAt: "Just now",
          isTimeSensitive: false,
          content: text,
          prayerCount: 0,
          commentCount: 0,
          prayedByAvatars: [],
          comments: [],
          updateTag: "answered",
          originalPost: {
            id: originalPost.originalPostId ?? originalPost.id,
            communityId,
            authorId: "sarah_current",
            authorName: "Sarah",
            authorAvatar: "https://randomuser.me/api/portraits/women/68.jpg",
            category: originalPost.category,
            tags: [],
            timeLabel: "AGO",
            postedAt: originalPost.originalPostedAt ?? originalPost.postedAt,
            content: originalPost.originalContent ?? originalPost.content.replace(/^"|"$/g, ""),
            prayerCount: originalPost.prayerCount,
            commentCount: originalPost.commentCount,
            prayedByAvatars: originalPost.prayedByAvatars,
            comments: [],
          },
        });
        const communityName = FEED_COMMUNITIES.find((c) => c.id === communityId)?.name ?? "your community";
        setRepostTarget(null);
        setTimeout(() => setTestimonySuccess({ communityId, communityName }), 350);
        console.log("[MyPosts] Testimony dispatched to community feed:", newPost.id, "community:", communityId);
      } else {
        setRepostTarget(null);
      }
      console.log("[MyPosts] Repost submitted:", newPost.id, "tag:", tag);
    },
    []
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>My Requests</Text>
          <Text style={styles.headerSub}>{posts.length} prayer requests</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{ongoingCount}</Text>
          <Text style={styles.statLabel}>ONGOING</Text>
        </View>
        <View style={[styles.statCard, styles.statCardAnswered]}>
          <Text style={[styles.statNum, styles.statNumAnswered]}>{answeredCount}</Text>
          <Text style={[styles.statLabel, styles.statLabelAnswered]}>ANSWERED</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{posts.reduce((s, p) => s + p.prayerCount, 0)}</Text>
          <Text style={styles.statLabel}>PRAYING</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {(["All", "Ongoing", "Answered", "Archived"] as FilterTab[]).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
            onPress={() => {
              if (Platform.OS !== "web") void Haptics.selectionAsync();
              setFilter(tab);
            }}
          >
            <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filter === "Archived" ? (
          archivedPosts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyTitle}>No archived prayers</Text>
              <Text style={styles.emptySubtitle}>
                Prayers you archive from the feed will appear here for your reference.
              </Text>
            </View>
          ) : (
            archivedPosts.map((post) => (
              <ArchivedPostCard key={post.id} post={post} />
            ))
          )
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🙏</Text>
            <Text style={styles.emptyTitle}>
              {filter === "Answered"
                ? "No answered prayers yet"
                : filter === "Ongoing"
                ? "No ongoing requests"
                : "No posts yet"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {filter === "Answered"
                ? "When God answers your prayers, mark them as answered to celebrate and encourage others."
                : "Share a prayer request with your community and let others join you in prayer."}
            </Text>
          </View>
        ) : (
          filtered.map((post) => (
            <MyPostCard
              key={post.id}
              post={post}
              onUpdate={() => setRepostTarget(post)}
              onMarkAnswered={() => setMarkAnsweredTarget(post)}
            />
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {repostTarget && (
        <RepostComposerModal
          originalPost={repostTarget}
          isAnswered={repostTarget.isAnswered}
          onClose={() => setRepostTarget(null)}
          onSubmit={handleSubmitRepost}
        />
      )}

      {markAnsweredTarget && (
        <MarkAnsweredModal
          post={markAnsweredTarget}
          onClose={() => setMarkAnsweredTarget(null)}
          onConfirm={() => handleMarkAnswered(markAnsweredTarget)}
          onUpdate={() => {
            setMarkAnsweredTarget(null);
            setTimeout(() => setRepostTarget({ ...markAnsweredTarget, isAnswered: true }), 300);
          }}
        />
      )}

      {testimonySuccess && (
        <TestimonySuccessModal
          communityName={testimonySuccess.communityName}
          onDone={() => setTestimonySuccess(null)}
          onViewPost={() => {
            setTestimonySuccess(null);
            setTimeout(() => router.push("/(tabs)/community?tab=Feed"), 300);
          }}
        />
      )}
    </SafeAreaView>
  );
}

interface ArchivedPostCardProps {
  post: ArchivedPost;
}

function ArchivedPostCard({ post }: ArchivedPostCardProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const archivedDate = new Date(post.archivedAt);
  const archivedLabel = archivedDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <View style={styles.archivedCard}>
      <View style={styles.archivedBanner}>
        <Archive size={12} color="#888" />
        <Text style={styles.archivedBannerText}>Archived · {archivedLabel}</Text>
      </View>

      <View style={styles.postTop}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{post.category}</Text>
        </View>
        <View style={styles.postMeta}>
          <Clock size={11} color={colors.mutedForeground} />
          <Text style={styles.postMetaText}>{post.postedAt}</Text>
        </View>
      </View>

      <View style={styles.archivedAuthorRow}>
        {post.authorAvatar ? (
          <Image source={{ uri: post.authorAvatar }} style={styles.archivedAvatar} />
        ) : (
          <View style={[styles.archivedAvatar, styles.archivedAvatarFallback]}>
            <Text style={styles.archivedAvatarInitial}>{post.authorName.charAt(0)}</Text>
          </View>
        )}
        <Text style={styles.archivedAuthorName}>{post.authorName}</Text>
      </View>

      <Text style={[styles.postContent, styles.postContentItalic]} numberOfLines={4}>
        {post.content.replace(/^"|"$/g, "")}
      </Text>

      <View style={[styles.postStats, { marginBottom: 0 }]}>
        <View style={styles.statItem}>
          <Heart size={14} color={colors.primary} />
          <Text style={styles.statItemText}>{post.prayerCount} praying</Text>
        </View>
        <View style={styles.statItem}>
          <MessageCircle size={14} color={colors.mutedForeground} />
          <Text style={[styles.statItemText, { color: colors.mutedForeground }]}>
            {post.commentCount} comments
          </Text>
        </View>
      </View>
    </View>
  );
}

interface MyPostCardProps {
  post: MyPost;
  onUpdate: () => void;
  onMarkAnswered: () => void;
}

function MyPostCard({ post, onUpdate, onMarkAnswered }: MyPostCardProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isUpdate = !!post.originalPostId && !post.originalContent?.startsWith('"');
  const isOriginalUpdatePost = !!post.originalPostId;

  return (
    <Animated.View style={[styles.postCard, post.isAnswered && styles.postCardAnswered, { transform: [{ scale: scaleAnim }] }]}>
      {post.isAnswered && (
        <View style={styles.answeredBanner}>
          <CheckCircle2 size={13} color={ANSWERED_GREEN} />
          <Text style={styles.answeredBannerText}>Answered</Text>
        </View>
      )}

      <View style={styles.postTop}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{post.category}</Text>
        </View>
        <View style={styles.postMeta}>
          <Clock size={11} color={colors.mutedForeground} />
          <Text style={styles.postMetaText}>{post.postedAt}</Text>
        </View>
      </View>

      {post.updateTag && (
        <View style={[styles.updateTagBadge, { backgroundColor: UPDATE_TAG_CONFIG[post.updateTag].bg }]}>
          {post.updateTag === "still_need_prayer" && (
            <HeartHandshake size={12} color={UPDATE_TAG_CONFIG[post.updateTag].color} />
          )}
          {post.updateTag === "answered" && (
            <CheckCircle size={12} color={UPDATE_TAG_CONFIG[post.updateTag].color} />
          )}
          <Text style={[styles.updateTagText, { color: UPDATE_TAG_CONFIG[post.updateTag].color }]}>
            {UPDATE_TAG_CONFIG[post.updateTag].label}
          </Text>
        </View>
      )}

      <Text style={[styles.postContent, post.content.startsWith('"') && styles.postContentItalic]}>
        {post.content}
      </Text>

      {isOriginalUpdatePost && post.originalContent && (
        <View style={styles.quotedWrap}>
          <View style={styles.quotedBar} />
          <View style={styles.quotedInner}>
            <Text style={styles.quotedLabel}>Original request</Text>
            <Text style={styles.quotedText} numberOfLines={2}>
              {post.originalContent}
            </Text>
            <Text style={styles.quotedTime}>{post.originalPostedAt}</Text>
          </View>
        </View>
      )}

      <View style={styles.postStats}>
        <View style={styles.statItem}>
          <Heart size={14} color={colors.primary} />
          <Text style={styles.statItemText}>{post.prayerCount} praying</Text>
        </View>
        <View style={styles.statItem}>
          <MessageCircle size={14} color={colors.mutedForeground} />
          <Text style={[styles.statItemText, { color: colors.mutedForeground }]}>
            {post.commentCount} comments
          </Text>
        </View>
        {post.prayedByAvatars.length > 0 && (
          <View style={styles.avatarStack}>
            {post.prayedByAvatars.slice(0, 3).map((uri, i) => (
              <Image
                key={i}
                source={{ uri }}
                style={[styles.stackAvatar, { marginLeft: i === 0 ? 0 : -7 }]}
              />
            ))}
          </View>
        )}
      </View>

      {!post.isAnswered && !isOriginalUpdatePost && (
        <View style={styles.postActions}>
          <Pressable style={styles.updateBtn} onPress={onUpdate}>
            <Repeat2 size={15} color={colors.primary} />
            <Text style={styles.updateBtnText}>Share Update</Text>
          </Pressable>
          <Pressable style={styles.answeredBtn} onPress={onMarkAnswered}>
            <CheckCircle size={15} color="#fff" />
            <Text style={styles.answeredBtnText}>Answered</Text>
          </Pressable>
        </View>
      )}

      {post.isAnswered && !isOriginalUpdatePost && (
        <View style={styles.postActions}>
          <Pressable style={styles.updateBtn} onPress={onUpdate}>
            <Sparkles size={15} color={colors.primary} />
            <Text style={styles.updateBtnText}>Share Testimony</Text>
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

interface RepostComposerModalProps {
  originalPost: MyPost;
  isAnswered: boolean;
  onClose: () => void;
  onSubmit: (post: MyPost, text: string, tag?: UpdateTag, communityId?: string) => void;
}

function RepostComposerModal({ originalPost, isAnswered, onClose, onSubmit }: RepostComposerModalProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const [text, setText] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<UpdateTag | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [selectedCommunityId, setSelectedCommunityId] = useState<FeedCommunityId>(FEED_COMMUNITIES[0].id);
  const slideAnim = useRef(new Animated.Value(700)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 12, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 700, duration: 230, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose, fadeAnim, slideAnim]);

  const handleSubmit = useCallback(() => {
    if (!text.trim()) return;
    onSubmit(originalPost, text.trim(), selectedTag ?? undefined, isAnswered ? selectedCommunityId : undefined);
  }, [text, selectedTag, selectedCommunityId, isAnswered, originalPost, onSubmit]);

  const tagOptions: { tag: UpdateTag; label: string; emoji: string; color: string; bg: string }[] = [
    { tag: "still_need_prayer", label: "Still need prayer", emoji: "🙏", color: "#D96E27", bg: "#FFF0E5" },
    { tag: "answered", label: "Answered", emoji: "✅", color: "#ffffff", bg: ANSWERED_GREEN },
  ];

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <Pressable style={styles.modalDismiss} onPress={handleClose} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalKAV}>
          <Animated.View
            style={[
              styles.composerSheet,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.composerHandle} />

            <View style={styles.composerHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.composerTitle}>{isAnswered ? "Share a Testimony" : "Share an Update"}</Text>
                <Text style={styles.composerSub}>{isAnswered ? "Celebrate what God has done" : "Let others know how this prayer is going"}</Text>
                {isAnswered && (
                  <View style={styles.answeredPill}>
                    <CheckCircle2 size={13} color={ANSWERED_GREEN} />
                    <Text style={styles.answeredPillText}>Answered Prayer</Text>
                  </View>
                )}
              </View>
              <Pressable style={styles.composerClose} onPress={handleClose}>
                <X size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {isAnswered && (
              <View style={styles.communityPickerSection}>
                <Text style={styles.communityPickerLabel}>Share to community</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.communityPickerRow}>
                  {FEED_COMMUNITIES.map((c) => {
                    const isSelected = selectedCommunityId === c.id;
                    return (
                      <Pressable
                        key={c.id}
                        style={[styles.communityChip, isSelected && { backgroundColor: c.color, borderColor: c.color }]}
                        onPress={() => setSelectedCommunityId(c.id)}
                      >
                        <View style={[styles.communityChipLetter, { backgroundColor: isSelected ? "rgba(255,255,255,0.25)" : c.color + "22" }]}>
                          <Text style={[styles.communityChipLetterText, { color: isSelected ? "#fff" : c.color }]}>{c.letter}</Text>
                        </View>
                        <Text style={[styles.communityChipName, isSelected && { color: "#fff" }]}>{c.name}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <ScrollView
              style={styles.composerScroll}
              contentContainerStyle={styles.composerScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.originalPreview}>
                <View style={styles.originalPreviewBar} />
                <View style={styles.originalPreviewInner}>
                  <View style={styles.originalPreviewAuthor}>
                    <Image
                      source={{ uri: "https://randomuser.me/api/portraits/women/44.jpg" }}
                      style={styles.originalPreviewAvatar}
                    />
                    <View>
                      <Text style={styles.originalPreviewName}>Sarah</Text>
                      <Text style={styles.originalPreviewTime}>{originalPost.postedAt}</Text>
                    </View>
                  </View>
                  <Text style={styles.originalPreviewText} numberOfLines={3}>
                    {originalPost.content.replace(/^"|"$/g, "")}
                  </Text>
                </View>
              </View>

              <TextInput
                style={[
                  styles.updateInput,
                  inputFocused && styles.updateInputFocused,
                ]}
                placeholder="Share an update..."
                placeholderTextColor={colors.mutedForeground + "90"}
                value={text}
                onChangeText={setText}
                multiline
                maxLength={500}
                textAlignVertical="top"
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
              />

              <Pressable style={styles.addPhotoRow}>
                <View style={styles.addPhotoIcon}>
                  <Text style={{ fontSize: 18 }}>🖼️</Text>
                </View>
                <Text style={styles.addPhotoText}>Add a photo</Text>
              </Pressable>

              {!isAnswered && (
                <>
                  <Text style={styles.tagSectionLabel}>How is this prayer going? (optional)</Text>
                  <View style={styles.tagOptionsRow}>
                    {tagOptions.map(({ tag, label, emoji, color, bg }) => (
                      <Pressable
                        key={tag}
                        style={[
                          styles.tagOption,
                          selectedTag === tag && { backgroundColor: bg, borderColor: color },
                        ]}
                        onPress={() => {
                          if (Platform.OS !== "web") void Haptics.selectionAsync();
                          setSelectedTag((prev) => (prev === tag ? null : tag));
                        }}
                      >
                        <Text style={styles.tagOptionEmoji}>{emoji}</Text>
                        <Text style={[styles.tagOptionText, selectedTag === tag && { color, fontWeight: "700" as const }]}>
                          {label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={[styles.composerFooter, { paddingBottom: insets.bottom + 16 }]}>
              <Pressable
                style={[styles.submitBtn, !text.trim() && { opacity: 0.55 }]}
                onPress={handleSubmit}
                disabled={!text.trim()}
              >
                <Repeat2 size={18} color={colors.primaryForeground} />
                <Text style={styles.submitBtnText}>{isAnswered ? "Share Testimony" : "Share Update"}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

interface MarkAnsweredModalProps {
  post: MyPost;
  onClose: () => void;
  onConfirm: () => void;
  onUpdate: () => void;
}

function MarkAnsweredModal({ post, onClose, onConfirm, onUpdate }: MarkAnsweredModalProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 12, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 65, friction: 12, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 400, duration: 230, useNativeDriver: true }),
    ]).start(() => onClose());
  }, [onClose, fadeAnim, slideAnim]);

  return (
    <Modal visible transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <Pressable style={styles.modalDismiss} onPress={handleClose} />
        <Animated.View
          style={[
            styles.answeredSheet,
            { paddingBottom: insets.bottom + 24, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] },
          ]}
        >
          <View style={styles.composerHandle} />

          <View style={styles.answeredSheetIcon}>
            <Text style={styles.answeredSheetEmoji}>🙌</Text>
          </View>

          <Text style={styles.answeredSheetTitle}>Prayer Answered!</Text>
          <Text style={styles.answeredSheetSubtitle}>
            That's wonderful news! Would you like to mark it as answered quietly, or share a testimony with your community?
          </Text>

          <View style={styles.answeredPreview}>
            <Text style={styles.answeredPreviewText} numberOfLines={2}>
              {post.content.replace(/^"|"$/g, "")}
            </Text>
          </View>

          <Pressable style={styles.shareTestimonyBtn} onPress={onUpdate}>
            <Repeat2 size={18} color={colors.primaryForeground} />
            <Text style={styles.shareTestimonyText}>Share Testimony to Feed</Text>
          </Pressable>

          <Pressable style={styles.markQuietlyBtn} onPress={onConfirm}>
            <CheckCircle2 size={18} color={colors.primary} />
            <Text style={styles.markQuietlyText}>Mark as Answered (quietly)</Text>
          </Pressable>

          <Pressable style={styles.cancelBtn} onPress={handleClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

interface TestimonySuccessModalProps {
  communityName: string;
  onViewPost: () => void;
  onDone: () => void;
}

function TestimonySuccessModal({ communityName, onViewPost, onDone }: TestimonySuccessModalProps) {
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 11, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 11, useNativeDriver: true }),
    ]).start(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1600, useNativeDriver: true }),
        ])
      ).start();
    });
  }, [fadeAnim, slideAnim, scaleAnim, glowAnim]);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  return (
    <Modal visible transparent animationType="none" onRequestClose={onDone} statusBarTranslucent>
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <Pressable style={styles.modalDismiss} onPress={onDone} />
        <Animated.View
          style={[
            styles.successSheet,
            { paddingBottom: insets.bottom + 28, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] },
          ]}
        >
          <View style={styles.composerHandle} />

          <Animated.View style={[styles.successIconWrap, { opacity: glowOpacity }]}>
            <Text style={styles.successEmoji}>🙌</Text>
          </Animated.View>

          <Text style={styles.successTitle}>Testimony Shared!</Text>
          <Text style={styles.successSubtitle}>
            Your answered prayer has been posted to{"\n"}
            <Text style={styles.successCommunityName}>{communityName}</Text>
          </Text>
          <Text style={styles.successBody}>
            Others in your community can now see how God has moved and be encouraged in their own faith.
          </Text>

          <Pressable style={styles.viewPostBtn} onPress={onViewPost}>
            <Text style={styles.viewPostBtnText}>View Post</Text>
          </Pressable>

          <Pressable style={styles.successDoneBtn} onPress={onDone}>
            <Text style={styles.successDoneBtnText}>Done</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerCenter: {
    alignItems: "center" as const,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: colors.foreground,
    letterSpacing: -0.4,
  },
  headerSub: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontWeight: "500" as const,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row" as const,
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: colors.border + "60",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  statCardAnswered: {
    backgroundColor: ANSWERED_GREEN_BG,
    borderColor: ANSWERED_GREEN_BORDER,
  },
  statNum: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: colors.primary,
    marginBottom: 2,
  },
  statNumAnswered: {
    color: ANSWERED_GREEN,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: "800" as const,
    color: colors.mutedForeground,
    letterSpacing: 1,
  },
  statLabelAnswered: {
    color: ANSWERED_GREEN,
  },
  filterRow: {
    flexDirection: "row" as const,
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: colors.secondary,
    borderRadius: 14,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center" as const,
    borderRadius: 11,
  },
  filterTabActive: {
    backgroundColor: colors.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.mutedForeground,
  },
  filterTabTextActive: {
    color: colors.foreground,
    fontWeight: "700" as const,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  postCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border + "50",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  postCardAnswered: {},
  answeredBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    backgroundColor: ANSWERED_GREEN,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 12,
    alignSelf: "flex-start" as const,
  },
  answeredBannerText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#ffffff",
    letterSpacing: 0.3,
  },
  postTop: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 10,
  },
  categoryBadge: {
    backgroundColor: colors.primary + "18",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: colors.primary,
    letterSpacing: 0.8,
  },
  postMeta: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  postMetaText: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontWeight: "500" as const,
  },
  updateTagBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    alignSelf: "flex-start" as const,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 10,
  },
  updateTagText: {
    fontSize: 11,
    fontWeight: "700" as const,
  },
  postContent: {
    fontSize: 15,
    color: colors.foreground,
    lineHeight: 23,
    marginBottom: 14,
    fontWeight: "500" as const,
  },
  postContentItalic: {
    fontStyle: "italic" as const,
    color: colors.secondaryForeground,
  },
  quotedWrap: {
    flexDirection: "row" as const,
    gap: 10,
    marginBottom: 14,
    backgroundColor: colors.secondary + "70",
    borderRadius: 14,
    padding: 12,
  },
  quotedBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.primary + "50",
  },
  quotedInner: {
    flex: 1,
    gap: 2,
  },
  quotedLabel: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: colors.mutedForeground,
    letterSpacing: 1,
    marginBottom: 2,
  },
  quotedText: {
    fontSize: 13,
    color: colors.secondaryForeground,
    lineHeight: 20,
  },
  quotedTime: {
    fontSize: 10,
    color: colors.mutedForeground + "99",
    marginTop: 3,
  },
  postStats: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border + "50",
    marginBottom: 14,
  },
  statItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
  },
  statItemText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  avatarStack: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginLeft: "auto" as const,
  },
  stackAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  postActions: {
    flexDirection: "row" as const,
    gap: 10,
  },
  updateBtn: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 7,
    backgroundColor: colors.primary + "14",
    borderRadius: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  updateBtnText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  answeredBtn: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 7,
    backgroundColor: ANSWERED_GREEN,
    borderRadius: 14,
    paddingVertical: 11,
  },
  answeredBtnText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#fff",
  },
  emptyState: {
    alignItems: "center" as const,
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: colors.foreground,
    textAlign: "center" as const,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center" as const,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end" as const,
  },
  modalDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  modalKAV: {
    justifyContent: "flex-end" as const,
  },
  composerSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    maxHeight: "88%" as const,
  },
  composerScroll: {
    paddingHorizontal: 20,
  },
  composerScrollContent: {
    paddingBottom: 8,
  },
  composerFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border + "40",
    backgroundColor: colors.card,
  },
  composerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center" as const,
    marginBottom: 16,
  },
  composerHeader: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    justifyContent: "space-between" as const,
    marginBottom: 14,
    paddingHorizontal: 20,
  },
  composerTitle: {
    fontSize: 19,
    fontWeight: "800" as const,
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  composerSub: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  answeredPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    backgroundColor: ANSWERED_GREEN_BG,
    borderWidth: 1,
    borderColor: ANSWERED_GREEN + "35",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start" as const,
    marginTop: 8,
  },
  answeredPillText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: ANSWERED_GREEN,
    letterSpacing: 0.2,
  },
  communityPickerSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  communityPickerLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.mutedForeground,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    marginBottom: 10,
  },
  communityPickerRow: {
    gap: 8,
    paddingRight: 8,
  },
  communityChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  communityChipLetter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  communityChipLetterText: {
    fontSize: 10,
    fontWeight: "800" as const,
  },
  communityChipName: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.foreground,
  },
  composerClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.secondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  originalPreview: {
    flexDirection: "row" as const,
    gap: 12,
    backgroundColor: colors.secondary,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  originalPreviewBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
    flexShrink: 0,
  },
  originalPreviewInner: {
    flex: 1,
    gap: 6,
  },
  originalPreviewAuthor: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 2,
  },
  originalPreviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  originalPreviewName: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.foreground,
  },
  originalPreviewTime: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  originalPreviewText: {
    fontSize: 13,
    color: colors.secondaryForeground,
    lineHeight: 20,
    fontStyle: "italic" as const,
  },
  addPhotoRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    marginBottom: 12,
  },
  addPhotoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  addPhotoText: {
    fontSize: 14,
    color: colors.foreground,
    fontWeight: "500" as const,
  },
  tagSectionLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.foreground,
    marginBottom: 12,
  },
  tagOptionsRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    marginBottom: 20,
  },
  tagOption: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  tagOptionEmoji: {
    fontSize: 14,
  },
  tagOptionText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: colors.foreground,
  },
  updateInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.foreground,
    minHeight: 90,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 10,
  },
  updateInputFocused: {
    borderColor: "#2C6DB5",
  },
  submitBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.primaryForeground,
    letterSpacing: 0.2,
  },
  answeredSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    alignItems: "center" as const,
  },
  answeredSheetIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: ANSWERED_GREEN_BG,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 14,
    marginTop: 4,
  },
  answeredSheetEmoji: {
    fontSize: 34,
  },
  answeredSheetTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: colors.foreground,
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  answeredSheetSubtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center" as const,
    lineHeight: 22,
    marginBottom: 20,
    maxWidth: 300,
  },
  answeredPreview: {
    width: "100%",
    backgroundColor: colors.secondary + "70",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border + "40",
  },
  answeredPreviewText: {
    fontSize: 13,
    color: colors.secondaryForeground,
    lineHeight: 20,
    fontStyle: "italic" as const,
  },
  shareTestimonyBtn: {
    width: "100%",
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    marginBottom: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 5,
  },
  shareTestimonyText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.primaryForeground,
  },
  markQuietlyBtn: {
    width: "100%",
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    backgroundColor: ANSWERED_GREEN_BG,
    borderRadius: 999,
    paddingVertical: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: ANSWERED_GREEN + "40",
  },
  markQuietlyText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: ANSWERED_GREEN,
  },
  cancelBtn: {
    paddingVertical: 14,
  },
  cancelBtnText: {
    fontSize: 14,
    color: colors.mutedForeground,
    fontWeight: "600" as const,
  },
  successSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 12,
    alignItems: "center" as const,
  },
  successIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: ANSWERED_GREEN + "20",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginTop: 20,
    marginBottom: 16,
  },
  successEmoji: {
    fontSize: 40,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: colors.foreground,
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: "center" as const,
  },
  successSubtitle: {
    fontSize: 15,
    color: colors.mutedForeground,
    textAlign: "center" as const,
    lineHeight: 22,
    marginBottom: 6,
  },
  successCommunityName: {
    color: ANSWERED_GREEN,
    fontWeight: "700" as const,
  },
  successBody: {
    fontSize: 13,
    color: colors.mutedForeground + "CC",
    textAlign: "center" as const,
    lineHeight: 20,
    marginBottom: 28,
    marginTop: 4,
  },
  viewPostBtn: {
    width: "100%" as const,
    backgroundColor: ANSWERED_GREEN,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center" as const,
    marginBottom: 12,
  },
  viewPostBtnText: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: "#ffffff",
    letterSpacing: 0.2,
  },
  successDoneBtn: {
    paddingVertical: 14,
    width: "100%" as const,
    alignItems: "center" as const,
  },
  successDoneBtnText: {
    fontSize: 15,
    color: colors.mutedForeground,
    fontWeight: "600" as const,
  },
  archivedCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border + "50",
    opacity: 0.85,
  },
  archivedBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    backgroundColor: colors.secondary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 12,
    alignSelf: "flex-start" as const,
  },
  archivedBannerText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.mutedForeground,
  },
  archivedAuthorRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 10,
  },
  archivedAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  archivedAvatarFallback: {
    backgroundColor: colors.secondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  archivedAvatarInitial: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.mutedForeground,
  },
  archivedAuthorName: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.mutedForeground,
  },
});
