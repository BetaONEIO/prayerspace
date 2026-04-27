import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  Platform,
  Animated,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Search, Edit, Check, CheckCheck, MessageSquarePlus, X, Bell } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { useTabSwipe } from "@/hooks/useTabSwipe";
import { fetchConversations, type ConversationListItem } from "@/lib/chat";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { useNotifications } from "@/providers/NotificationsProvider";
import NotificationsPanel from "@/components/NotificationsPanel";

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d`;
  return new Date(isoString).toLocaleDateString([], { month: "short", day: "numeric" });
}

function ConversationRow({
  item,
  currentUserId,
  onPress,
  colors,
}: {
  item: ConversationListItem;
  currentUserId: string;
  onPress: () => void;
  colors: ThemeColors;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 300, friction: 20 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 20 }).start();

  const isMine = item.last_sender_id === currentUserId;
  const initial = (item.other_user_name ?? "?").charAt(0).toUpperCase();

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      testID={`conversation-${item.conversation_id}`}
    >
      <Animated.View style={[styles.row, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.avatarWrap}>
          {item.other_user_avatar ? (
            <Image source={{ uri: item.other_user_avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{initial}</Text>
            </View>
          )}
          {item.is_muted && (
            <View style={styles.mutedBadge}>
              <Text style={styles.mutedBadgeText}>🔕</Text>
            </View>
          )}
        </View>

        <View style={styles.rowContent}>
          <View style={styles.rowTop}>
            <Text style={[styles.name, item.unread_count > 0 && styles.nameBold]}>
              {item.other_user_name ?? "Unknown"}
            </Text>
            {item.last_message_at && (
              <Text style={[styles.time, item.unread_count > 0 && styles.timeUnread]}>
                {timeAgo(item.last_message_at)}
              </Text>
            )}
          </View>
          <View style={styles.rowBottom}>
            <View style={styles.previewRow}>
              {isMine && (
                <CheckCheck size={13} color={colors.primary} style={styles.checkIcon} />
              )}
              <Text
                style={[styles.preview, item.unread_count > 0 && styles.previewBold]}
                numberOfLines={1}
              >
                {item.last_message ?? "Start a conversation..."}
              </Text>
            </View>
            {item.unread_count > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

const SAMPLE_CONVERSATIONS: ConversationListItem[] = [
  {
    conversation_id: "sample-1",
    is_muted: false,
    last_read_at: null,
    other_user_id: "sample-anna",
    other_user_name: "Anna Rivera",
    other_user_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80",
    last_message: "Thank you for praying for my interview today 🤍",
    last_message_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    last_sender_id: "sample-anna",
    unread_count: 2,
  },
  {
    conversation_id: "sample-2",
    is_muted: false,
    last_read_at: null,
    other_user_id: "sample-marcus",
    other_user_name: "Marcus Webb",
    other_user_avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80",
    last_message: "I’m feeling hopeful again. Your prayer helped a lot.",
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    last_sender_id: "sample-marcus",
    unread_count: 0,
  },
  {
    conversation_id: "sample-3",
    is_muted: true,
    last_read_at: null,
    other_user_id: "sample-naomi",
    other_user_name: "Naomi Okafor",
    other_user_avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80",
    last_message: "Can we pray again tomorrow morning?",
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    last_sender_id: "sample-naomi",
    unread_count: 1,
  },
  {
    conversation_id: "sample-4",
    is_muted: false,
    last_read_at: null,
    other_user_id: "sample-david",
    other_user_name: "David Chen",
    other_user_avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80",
    last_message: "Just shared the update with my family — thank you.",
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString(),
    last_sender_id: "sample-david",
    unread_count: 0,
  },
];

export default function MessagesScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { unreadCount: notifUnreadCount } = useNotifications();
  const [notifVisible, setNotifVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [newConvVisible, setNewConvVisible] = useState(false);
  const [newConvSearch, setNewConvSearch] = useState("");
  const sheetSlide = useRef(new Animated.Value(600)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const currentUserId = user?.id ?? "";

  const conversationsQuery = useQuery({
    queryKey: ["conversations", currentUserId],
    queryFn: () => fetchConversations(currentUserId),
    enabled: !!currentUserId,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!currentUserId) return;
    console.log("[Messages] Subscribing to real-time conversation updates");
    const channel = supabase
      .channel("messages-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["conversations", currentUserId] });
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [currentUserId, queryClient]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const conversations = conversationsQuery.data ?? [];
  const showSamples = conversations.length === 0;
  const displayConversations = showSamples ? SAMPLE_CONVERSATIONS : conversations;

  const filtered = search.trim()
    ? displayConversations.filter((c) =>
        (c.other_user_name ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : displayConversations;

  const handleOpen = useCallback(
    (item: ConversationListItem) => {
      if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/chat/${item.other_user_id}`);
    },
    [router]
  );

  const totalUnread = displayConversations.reduce((sum, c) => sum + c.unread_count, 0);

  const renderItem = useCallback(
    ({ item }: { item: ConversationListItem }) => (
      <ConversationRow
        item={item}
        currentUserId={currentUserId}
        onPress={() => handleOpen(item)}
        colors={colors}
      />
    ),
    [currentUserId, handleOpen, colors]
  );

  const connectionsQuery = useQuery<Profile[]>({
    queryKey: ["connections", currentUserId],
    queryFn: async () => {
      console.log("[Messages] Fetching connected profiles");
      const { data: convParticipants, error: cpErr } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", currentUserId);
      if (cpErr || !convParticipants?.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .neq("id", currentUserId)
          .limit(50);
        return (profiles ?? []) as Profile[];
      }
      const convIds = convParticipants.map((c: { conversation_id: string }) => c.conversation_id);
      const { data: others } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .in("conversation_id", convIds)
        .neq("user_id", currentUserId);
      const otherIds = [...new Set((others ?? []).map((o: { user_id: string }) => o.user_id))];
      if (!otherIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .neq("id", currentUserId)
          .limit(50);
        return (profiles ?? []) as Profile[];
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", otherIds);
      return (profiles ?? []) as Profile[];
    },
    enabled: !!currentUserId && newConvVisible,
  });

  const openNewConv = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNewConvVisible(true);
    setNewConvSearch("");
    Animated.parallel([
      Animated.spring(sheetSlide, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(sheetOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [sheetSlide, sheetOpacity]);

  const closeNewConv = useCallback(() => {
    Animated.parallel([
      Animated.timing(sheetSlide, { toValue: 600, duration: 250, useNativeDriver: true }),
      Animated.timing(sheetOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setNewConvVisible(false));
  }, [sheetSlide, sheetOpacity]);

  const handleStartConversation = useCallback((profile: Profile) => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    closeNewConv();
    setTimeout(() => router.push(`/chat/${profile.id}`), 300);
  }, [router, closeNewConv]);

  const filteredProfiles = (connectionsQuery.data ?? []).filter((p) =>
    (p.full_name ?? "").toLowerCase().includes(newConvSearch.toLowerCase())
  );

  const isLoading = conversationsQuery.isLoading && conversations.length === 0;
  const swipeHandlers = useTabSwipe("/(tabs)/community", null);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]} {...swipeHandlers}>
      <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Messages</Text>
            {totalUnread > 0 ? (
              <Text style={styles.headerSub}>
                {totalUnread} unread message{totalUnread !== 1 ? "s" : ""}
              </Text>
            ) : (
              <Text style={styles.headerSub}>Your prayer conversations</Text>
            )}
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.bellWrap} onPress={() => setNotifVisible(true)}>
              <Bell size={18} color={colors.primary} />
              {notifUnreadCount > 0 && <View style={styles.bellBadge} />}
            </Pressable>
            <Pressable style={styles.composeBtn} testID="compose-btn" onPress={openNewConv}>
              <Edit size={18} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.searchWrap}>
          <Search size={15} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={colors.mutedForeground + "80"}
            value={search}
            onChangeText={setSearch}
            testID="search-input"
          />
        </View>

        {isLoading ? (
          <View style={styles.loadingState}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={styles.skeletonRow}>
                <View style={styles.skeletonAvatar} />
                <View style={styles.skeletonContent}>
                  <View style={[styles.skeletonLine, { width: "55%" }]} />
                  <View style={[styles.skeletonLine, { width: "80%", opacity: 0.5 }]} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.conversation_id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              search.trim() ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No results for "{search}"</Text>
                </View>
              ) : (
                <EmptyState colors={colors} />
              )
            }
          />
        )}
      </Animated.View>
      <NotificationsPanel visible={notifVisible} onClose={() => setNotifVisible(false)} />
      <Modal visible={newConvVisible} transparent animationType="none" onRequestClose={closeNewConv}>
        <Animated.View style={[styles.modalOverlay, { opacity: sheetOpacity }]}>
          <Pressable style={styles.overlayDismiss} onPress={closeNewConv} />
          <Animated.View style={[styles.newConvSheet, { transform: [{ translateY: sheetSlide }] }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>New Conversation</Text>
              <Pressable style={styles.sheetCloseBtn} onPress={closeNewConv}>
                <X size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <View style={styles.sheetSearchWrap}>
              <Search size={14} color={colors.mutedForeground} />
              <TextInput
                style={styles.sheetSearchInput}
                placeholder="Search people..."
                placeholderTextColor={colors.mutedForeground + "80"}
                value={newConvSearch}
                onChangeText={setNewConvSearch}
                autoFocus
              />
            </View>
            {connectionsQuery.isLoading ? (
              <View style={styles.sheetLoading}>
                <Text style={styles.sheetLoadingText}>Finding people...</Text>
              </View>
            ) : filteredProfiles.length === 0 ? (
              <View style={styles.sheetEmpty}>
                <Text style={styles.sheetEmptyText}>
                  {newConvSearch.trim() ? `No results for "${newConvSearch}"` : "No connections found"}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredProfiles}
                keyExtractor={(p) => p.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.sheetList}
                renderItem={({ item }) => {
                  const initial = (item.full_name ?? "?").charAt(0).toUpperCase();
                  return (
                    <Pressable
                      style={styles.sheetPersonRow}
                      onPress={() => handleStartConversation(item)}
                    >
                      <View style={styles.sheetAvatarWrap}>
                        {item.avatar_url ? (
                          <Image source={{ uri: item.avatar_url }} style={styles.sheetAvatar} />
                        ) : (
                          <View style={[styles.sheetAvatar, styles.sheetAvatarFallback]}>
                            <Text style={styles.sheetAvatarInitial}>{initial}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.sheetPersonInfo}>
                        <Text style={styles.sheetPersonName}>{item.full_name ?? "Unknown"}</Text>
                        <Text style={styles.sheetPersonSub}>Tap to send a message</Text>
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}
          </Animated.View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

function EmptyState({ colors }: { colors: ThemeColors }) {
  const slideAnim = useRef(new Animated.Value(24)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 12, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.emptyState,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.emptyIconRing}>
        <View style={styles.emptyIconInner}>
          <MessageSquarePlus size={28} color={colors.primary} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptySub}>
        When you connect with someone in Prayer Space, your conversations will appear here.
      </Text>
      <View style={styles.emptyHint}>
        <Text style={styles.emptyHintText}>🙏 Start by praying for a friend</Text>
      </View>
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 16,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "800" as const,
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    headerSub: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontWeight: "500" as const,
      marginTop: 2,
    },
    headerActions: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 8,
      marginTop: 4,
    },
    bellWrap: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      position: "relative" as const,
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
      borderColor: colors.background,
    },
    composeBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 24,
      marginBottom: 16,
      backgroundColor: colors.secondary + "80",
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 11,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border + "50",
    },
    searchInput: { flex: 1, fontSize: 14, color: colors.foreground, padding: 0 },
    listContent: { paddingHorizontal: 16, paddingBottom: 32 },
    separator: { height: 1, backgroundColor: colors.border + "35", marginLeft: 82 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 8,
      gap: 14,
      borderRadius: 16,
    },
    avatarWrap: { position: "relative" as const },
    avatar: { width: 52, height: 52, borderRadius: 26 },
    avatarFallback: {
      backgroundColor: colors.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    avatarInitial: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.primary,
    },
    mutedBadge: {
      position: "absolute" as const,
      bottom: -2,
      right: -2,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.background,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      borderWidth: 1,
      borderColor: colors.border,
    },
    mutedBadgeText: { fontSize: 9 },
    rowContent: { flex: 1, gap: 4 },
    rowTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    name: { fontSize: 15, fontWeight: "600" as const, color: colors.foreground },
    nameBold: { fontWeight: "800" as const },
    time: { fontSize: 11, color: colors.mutedForeground, fontWeight: "500" as const },
    timeUnread: { color: colors.primary, fontWeight: "700" as const },
    rowBottom: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    previewRow: { flexDirection: "row", alignItems: "center", flex: 1, gap: 4 },
    checkIcon: { flexShrink: 0 },
    preview: { fontSize: 13, color: colors.mutedForeground, flex: 1 },
    previewBold: { color: colors.foreground, fontWeight: "600" as const },
    badge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingHorizontal: 5,
      marginLeft: 8,
    },
    badgeText: { fontSize: 11, fontWeight: "700" as const, color: "#FFFFFF" },
    loadingState: { paddingHorizontal: 24, paddingTop: 8, gap: 4 },
    skeletonRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      gap: 14,
    },
    skeletonAvatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.muted,
    },
    skeletonContent: { flex: 1, gap: 8 },
    skeletonLine: {
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.muted,
    },
    emptyState: {
      alignItems: "center" as const,
      paddingTop: 64,
      paddingHorizontal: 36,
      gap: 12,
    },
    emptyIconRing: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: 4,
    },
    emptyIconInner: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.background,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 2,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "700" as const,
      color: colors.foreground,
      textAlign: "center" as const,
    },
    emptySub: {
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: "center" as const,
      lineHeight: 21,
      maxWidth: 280,
    },
    emptyHint: {
      marginTop: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.accent,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary + "25",
    },
    emptyHintText: {
      fontSize: 13,
      color: colors.primary,
      fontWeight: "600" as const,
    },
    modalOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end" as const,
    },
    overlayDismiss: {
      ...StyleSheet.absoluteFillObject,
    },
    newConvSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 40 : 24,
      maxHeight: "80%" as const,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center" as const,
      marginBottom: 16,
    },
    sheetHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    sheetTitle: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.foreground,
    },
    sheetCloseBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.secondary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    sheetSearchWrap: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      marginHorizontal: 20,
      marginBottom: 12,
      backgroundColor: colors.secondary + "80",
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 11,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border + "50",
    },
    sheetSearchInput: { flex: 1, fontSize: 14, color: colors.foreground, padding: 0 },
    sheetLoading: {
      paddingVertical: 32,
      alignItems: "center" as const,
    },
    sheetLoadingText: { fontSize: 14, color: colors.mutedForeground },
    sheetEmpty: {
      paddingVertical: 32,
      alignItems: "center" as const,
      paddingHorizontal: 24,
    },
    sheetEmptyText: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: "center" as const,
    },
    sheetList: { paddingHorizontal: 16, paddingBottom: 8 },
    sheetPersonRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 14,
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderRadius: 14,
    },
    sheetAvatarWrap: {},
    sheetAvatar: { width: 48, height: 48, borderRadius: 24 },
    sheetAvatarFallback: {
      backgroundColor: colors.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    sheetAvatarInitial: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.primary,
    },
    sheetPersonInfo: { flex: 1, gap: 2 },
    sheetPersonName: { fontSize: 15, fontWeight: "600" as const, color: colors.foreground },
    sheetPersonSub: { fontSize: 12, color: colors.mutedForeground },
  });
}
