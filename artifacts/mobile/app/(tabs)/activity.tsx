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
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Search,
  Edit,
  Check,
  CheckCheck,
  MessageSquarePlus,
  X,
  Bell,
  Archive,
  Pin,
  PinOff,
  BellOff,
  Volume2,
  MailOpen,
  Mail,
  Trash2,
  UserX,
  ShieldAlert,
  ArchiveRestore,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Swipeable } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

const CONV_META_KEY = "conv_meta_v1";

type ConvMeta = {
  isPinned: boolean;
  isArchived: boolean;
  isMuted: boolean;
  isUnreadForced: boolean | null;
};

type EnrichedConv = ConversationListItem & {
  _isPinned: boolean;
  _isArchived: boolean;
  _isMuted: boolean;
};

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

function RightSwipeActions({
  onArchive,
  isArchived,
  colors,
  progress,
}: {
  onArchive: () => void;
  isArchived: boolean;
  colors: ThemeColors;
  progress: Animated.AnimatedInterpolation<number>;
}) {
  const trans = progress.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
  return (
    <Animated.View style={{ transform: [{ translateX: trans }] }}>
      <Pressable
        style={[styles_swipe.actionBtn, { backgroundColor: isArchived ? "#6366F1" : "#EF4444" }]}
        onPress={onArchive}
      >
        {isArchived ? (
          <ArchiveRestore size={20} color="#fff" />
        ) : (
          <Archive size={20} color="#fff" />
        )}
        <Text style={styles_swipe.actionLabel}>{isArchived ? "Unarchive" : "Archive"}</Text>
      </Pressable>
    </Animated.View>
  );
}

function LeftSwipeActions({
  onPin,
  onToggleRead,
  isPinned,
  isUnread,
  colors,
  progress,
}: {
  onPin: () => void;
  onToggleRead: () => void;
  isPinned: boolean;
  isUnread: boolean;
  colors: ThemeColors;
  progress: Animated.AnimatedInterpolation<number>;
}) {
  const trans = progress.interpolate({ inputRange: [0, 1], outputRange: [-160, 0] });
  return (
    <Animated.View style={[styles_swipe.leftWrap, { transform: [{ translateX: trans }] }]}>
      <Pressable
        style={[styles_swipe.actionBtn, { backgroundColor: "#3B82F6" }]}
        onPress={onPin}
      >
        {isPinned ? <PinOff size={18} color="#fff" /> : <Pin size={18} color="#fff" />}
        <Text style={styles_swipe.actionLabel}>{isPinned ? "Unpin" : "Pin"}</Text>
      </Pressable>
      <Pressable
        style={[styles_swipe.actionBtn, { backgroundColor: "#F59E0B" }]}
        onPress={onToggleRead}
      >
        {isUnread ? <Mail size={18} color="#fff" /> : <MailOpen size={18} color="#fff" />}
        <Text style={styles_swipe.actionLabel}>{isUnread ? "Read" : "Unread"}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles_swipe = StyleSheet.create({
  actionBtn: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 14,
    flex: 1,
  },
  actionLabel: { fontSize: 11, color: "#fff", fontWeight: "700" as const },
  leftWrap: { flexDirection: "row", width: 160 },
});

function ConversationRow({
  item,
  currentUserId,
  onPress,
  onLongPress,
  colors,
  isPinned,
  swipeRef,
  onSwipeOpen,
  onArchive,
  onPin,
  onToggleRead,
}: {
  item: EnrichedConv;
  currentUserId: string;
  onPress: () => void;
  onLongPress: () => void;
  colors: ThemeColors;
  isPinned: boolean;
  swipeRef: (ref: Swipeable | null) => void;
  onSwipeOpen: () => void;
  onArchive: () => void;
  onPin: () => void;
  onToggleRead: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const localSwipeRef = useRef<Swipeable | null>(null);

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, tension: 300, friction: 20 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 20 }).start();

  const isMine = item.last_sender_id === currentUserId;
  const initial = (item.other_user_name ?? "?").charAt(0).toUpperCase();
  const isUnread = item.unread_count > 0;

  const handleArchive = useCallback(() => {
    localSwipeRef.current?.close();
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onArchive();
  }, [onArchive]);

  const handlePin = useCallback(() => {
    localSwipeRef.current?.close();
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPin();
  }, [onPin]);

  const handleToggleRead = useCallback(() => {
    localSwipeRef.current?.close();
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleRead();
  }, [onToggleRead]);

  return (
    <Swipeable
      ref={(ref) => {
        localSwipeRef.current = ref;
        swipeRef(ref);
      }}
      renderRightActions={(progress) => (
        <RightSwipeActions
          onArchive={handleArchive}
          isArchived={item._isArchived}
          colors={colors}
          progress={progress}
        />
      )}
      renderLeftActions={(progress) => (
        <LeftSwipeActions
          onPin={handlePin}
          onToggleRead={handleToggleRead}
          isPinned={isPinned}
          isUnread={isUnread}
          colors={colors}
          progress={progress}
        />
      )}
      onSwipeableWillOpen={onSwipeOpen}
      rightThreshold={80}
      leftThreshold={80}
      friction={2}
      overshootLeft={false}
      overshootRight={false}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        delayLongPress={380}
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
            {item._isMuted && (
              <View style={styles.mutedBadge}>
                <Text style={styles.mutedBadgeText}>🔕</Text>
              </View>
            )}
            {isPinned && !item._isMuted && (
              <View style={styles.pinBadge}>
                <Text style={styles.pinBadgeText}>📌</Text>
              </View>
            )}
          </View>

          <View style={styles.rowContent}>
            <View style={styles.rowTop}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, isUnread && styles.nameBold]} numberOfLines={1}>
                  {item.other_user_name ?? "Unknown"}
                </Text>
              </View>
              {item.last_message_at && (
                <Text style={[styles.time, isUnread && styles.timeUnread]}>
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
                  style={[styles.preview, isUnread && styles.previewBold]}
                  numberOfLines={1}
                >
                  {item.last_message ?? "Start a conversation..."}
                </Text>
              </View>
              {isUnread && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unread_count}</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Swipeable>
  );
}

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

const SAMPLE_CONVERSATIONS: ConversationListItem[] = [];

export default function MessagesScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { unreadCount: notifUnreadCount } = useNotifications();
  const [notifVisible, setNotifVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [newConvVisible, setNewConvVisible] = useState(false);
  const [newConvSearch, setNewConvSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [convMeta, setConvMeta] = useState<Record<string, Partial<ConvMeta>>>({});
  const [selectedConv, setSelectedConv] = useState<EnrichedConv | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const sheetSlide = useRef(new Animated.Value(600)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const actionSheetSlide = useRef(new Animated.Value(600)).current;
  const actionSheetOpacity = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const openSwipeRef = useRef<Swipeable | null>(null);
  const swipeRefs = useRef<Map<string, Swipeable | null>>(new Map());

  const currentUserId = user?.id ?? "";

  useEffect(() => {
    AsyncStorage.getItem(CONV_META_KEY).then((val) => {
      if (val) {
        try { setConvMeta(JSON.parse(val) as Record<string, Partial<ConvMeta>>); } catch {}
      }
    });
  }, []);

  const updateMeta = useCallback((convId: string, update: Partial<ConvMeta>) => {
    setConvMeta((prev) => {
      const next = { ...prev, [convId]: { ...prev[convId], ...update } };
      void AsyncStorage.setItem(CONV_META_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const conversationsQuery = useQuery({
    queryKey: ["conversations", currentUserId],
    queryFn: () => fetchConversations(currentUserId),
    enabled: !!currentUserId,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase
      .channel("messages-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["conversations", currentUserId] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [currentUserId, queryClient]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const rawConversations = conversationsQuery.data ?? [];
  const showSamples = rawConversations.length === 0;
  const baseConversations = showSamples ? SAMPLE_CONVERSATIONS : rawConversations;

  const enriched: EnrichedConv[] = useMemo(() =>
    baseConversations.map((c) => {
      const meta = convMeta[c.conversation_id] ?? {};
      const unreadForced = meta.isUnreadForced;
      return {
        ...c,
        is_muted: meta.isMuted ?? c.is_muted,
        unread_count:
          unreadForced === true ? Math.max(1, c.unread_count)
          : unreadForced === false ? 0
          : c.unread_count,
        _isPinned: meta.isPinned ?? false,
        _isArchived: meta.isArchived ?? false,
        _isMuted: meta.isMuted ?? c.is_muted,
      };
    }),
    [baseConversations, convMeta]
  );

  const activeConvs = useMemo(() =>
    enriched
      .filter((c) => !c._isArchived)
      .sort((a, b) => {
        if (a._isPinned && !b._isPinned) return -1;
        if (!a._isPinned && b._isPinned) return 1;
        if (!a.last_message_at && !b.last_message_at) return 0;
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      }),
    [enriched]
  );

  const archivedConvs = useMemo(() =>
    enriched.filter((c) => c._isArchived),
    [enriched]
  );

  const displayList = showArchived ? archivedConvs : activeConvs;

  const filtered = search.trim()
    ? displayList.filter((c) =>
        (c.other_user_name ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : displayList;

  const totalUnread = activeConvs.reduce((sum, c) => sum + c.unread_count, 0);

  const handleOpen = useCallback(
    (item: EnrichedConv) => {
      if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/chat/${item.other_user_id}`);
    },
    [router]
  );

  const handleLongPress = useCallback((item: EnrichedConv) => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    openSwipeRef.current?.close();
    setSelectedConv(item);
    setActionSheetVisible(true);
    Animated.parallel([
      Animated.spring(actionSheetSlide, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(actionSheetOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [actionSheetSlide, actionSheetOpacity]);

  const closeActionSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(actionSheetSlide, { toValue: 600, duration: 250, useNativeDriver: true }),
      Animated.timing(actionSheetOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setActionSheetVisible(false);
      setSelectedConv(null);
    });
  }, [actionSheetSlide, actionSheetOpacity]);

  const handleArchive = useCallback((conv: EnrichedConv) => {
    updateMeta(conv.conversation_id, { isArchived: !conv._isArchived });
  }, [updateMeta]);

  const handlePin = useCallback((conv: EnrichedConv) => {
    updateMeta(conv.conversation_id, { isPinned: !conv._isPinned });
  }, [updateMeta]);

  const handleMute = useCallback((conv: EnrichedConv) => {
    updateMeta(conv.conversation_id, { isMuted: !conv._isMuted });
  }, [updateMeta]);

  const handleToggleRead = useCallback((conv: EnrichedConv) => {
    const currentlyUnread = conv.unread_count > 0;
    updateMeta(conv.conversation_id, { isUnreadForced: currentlyUnread ? false : true });
  }, [updateMeta]);

  const handleMarkRead = useCallback((conv: EnrichedConv) => {
    updateMeta(conv.conversation_id, { isUnreadForced: false });
  }, [updateMeta]);

  const handleMarkUnread = useCallback((conv: EnrichedConv) => {
    updateMeta(conv.conversation_id, { isUnreadForced: true });
  }, [updateMeta]);

  const handleDeleteRequest = useCallback((conv: EnrichedConv) => {
    closeActionSheet();
    setTimeout(() => {
      setSelectedConv(conv);
      setDeleteConfirmVisible(true);
    }, 300);
  }, [closeActionSheet]);

  const confirmDelete = useCallback(() => {
    if (!selectedConv) return;
    updateMeta(selectedConv.conversation_id, { isArchived: true });
    setDeleteConfirmVisible(false);
    setSelectedConv(null);
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [selectedConv, updateMeta]);

  const handleBlock = useCallback((conv: EnrichedConv) => {
    closeActionSheet();
    setTimeout(() => {
      Alert.alert(
        "Block User",
        `Block ${conv.other_user_name ?? "this user"}? They won't be able to message you.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Block", style: "destructive", onPress: () => {} },
        ]
      );
    }, 300);
  }, [closeActionSheet]);

  const handleReport = useCallback(() => {
    closeActionSheet();
    setTimeout(() => {
      Alert.alert(
        "Report User",
        "Thank you for helping keep Prayer Space safe. Our team will review this report.",
        [{ text: "OK" }]
      );
    }, 300);
  }, [closeActionSheet]);

  const handleSwipeOpen = useCallback((ref: Swipeable | null) => {
    if (openSwipeRef.current && openSwipeRef.current !== ref) {
      openSwipeRef.current.close();
    }
    openSwipeRef.current = ref;
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: EnrichedConv }) => {
      const meta = convMeta[item.conversation_id] ?? {};
      return (
        <ConversationRow
          item={item}
          currentUserId={currentUserId}
          onPress={() => handleOpen(item)}
          onLongPress={() => handleLongPress(item)}
          colors={colors}
          isPinned={meta.isPinned ?? false}
          swipeRef={(ref) => {
            swipeRefs.current.set(item.conversation_id, ref);
          }}
          onSwipeOpen={() => handleSwipeOpen(swipeRefs.current.get(item.conversation_id) ?? null)}
          onArchive={() => handleArchive(item)}
          onPin={() => handlePin(item)}
          onToggleRead={() => handleToggleRead(item)}
        />
      );
    },
    [currentUserId, handleOpen, handleLongPress, colors, convMeta, handleSwipeOpen, handleArchive, handlePin, handleToggleRead]
  );

  const connectionsQuery = useQuery<Profile[]>({
    queryKey: ["connections", currentUserId],
    queryFn: async () => {
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

  const isLoading = conversationsQuery.isLoading && rawConversations.length === 0;
  const swipeHandlers = useTabSwipe("/(tabs)/community", null);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]} {...swipeHandlers}>
      <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Messages</Text>
            {showArchived ? (
              <Text style={styles.headerSub}>Archived conversations</Text>
            ) : totalUnread > 0 ? (
              <Text style={styles.headerSub}>
                {totalUnread} unread message{totalUnread !== 1 ? "s" : ""}
              </Text>
            ) : (
              <Text style={styles.headerSub}>Your prayer conversations</Text>
            )}
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.composeBtn} testID="compose-btn" onPress={openNewConv}>
              <Edit size={18} color={colors.primary} />
            </Pressable>
            <Pressable style={styles.bellWrap} onPress={() => setNotifVisible(true)}>
              <Bell size={18} color={colors.primary} />
              {notifUnreadCount > 0 && <View style={styles.bellBadge} />}
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

        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, !showArchived && styles.filterChipActive]}
            onPress={() => setShowArchived(false)}
          >
            <Text style={[styles.filterChipText, !showArchived && styles.filterChipTextActive]}>
              All
            </Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, showArchived && styles.filterChipActive]}
            onPress={() => setShowArchived(true)}
          >
            <Archive size={12} color={showArchived ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.filterChipText, showArchived && styles.filterChipTextActive]}>
              Archived{archivedConvs.length > 0 ? ` (${archivedConvs.length})` : ""}
            </Text>
          </Pressable>
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
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 16 }]}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              search.trim() ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No results for "{search}"</Text>
                </View>
              ) : showArchived ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No archived conversations</Text>
                  <Text style={styles.emptySub}>Archived chats will appear here.</Text>
                </View>
              ) : (
                <EmptyState colors={colors} />
              )
            }
          />
        )}
      </Animated.View>

      <NotificationsPanel visible={notifVisible} onClose={() => setNotifVisible(false)} />

      {/* New conversation sheet */}
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
                    <Pressable style={styles.sheetPersonRow} onPress={() => handleStartConversation(item)}>
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

      {/* Long-press action sheet */}
      <Modal visible={actionSheetVisible} transparent animationType="none" onRequestClose={closeActionSheet}>
        <Animated.View style={[styles.modalOverlay, { opacity: actionSheetOpacity }]}>
          <Pressable style={styles.overlayDismiss} onPress={closeActionSheet} />
          <Animated.View style={[styles.actionSheet, { transform: [{ translateY: actionSheetSlide }] }]}>
            <View style={styles.sheetHandle} />
            {selectedConv && (
              <>
                <View style={styles.actionSheetHeader}>
                  {selectedConv.other_user_avatar ? (
                    <Image source={{ uri: selectedConv.other_user_avatar }} style={styles.actionSheetAvatar} />
                  ) : (
                    <View style={[styles.actionSheetAvatar, styles.actionSheetAvatarFallback]}>
                      <Text style={styles.actionSheetAvatarInitial}>
                        {(selectedConv.other_user_name ?? "?").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.actionSheetName}>{selectedConv.other_user_name ?? "Unknown"}</Text>
                </View>

                <View style={styles.actionSheetDivider} />

                <Pressable
                  style={styles.actionOption}
                  onPress={() => {
                    closeActionSheet();
                    if (selectedConv.unread_count > 0) handleMarkRead(selectedConv);
                    else handleMarkUnread(selectedConv);
                  }}
                >
                  <View style={[styles.actionOptionIcon, { backgroundColor: colors.secondary }]}>
                    {selectedConv.unread_count > 0
                      ? <Mail size={16} color={colors.foreground} />
                      : <MailOpen size={16} color={colors.foreground} />
                    }
                  </View>
                  <Text style={styles.actionOptionText}>
                    {selectedConv.unread_count > 0 ? "Mark as read" : "Mark as unread"}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.actionOption}
                  onPress={() => {
                    handlePin(selectedConv);
                    closeActionSheet();
                  }}
                >
                  <View style={[styles.actionOptionIcon, { backgroundColor: "#EFF6FF" }]}>
                    {selectedConv._isPinned
                      ? <PinOff size={16} color="#3B82F6" />
                      : <Pin size={16} color="#3B82F6" />
                    }
                  </View>
                  <Text style={styles.actionOptionText}>
                    {selectedConv._isPinned ? "Unpin conversation" : "Pin conversation"}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.actionOption}
                  onPress={() => {
                    handleMute(selectedConv);
                    closeActionSheet();
                  }}
                >
                  <View style={[styles.actionOptionIcon, { backgroundColor: colors.muted }]}>
                    {selectedConv._isMuted
                      ? <Volume2 size={16} color={colors.foreground} />
                      : <BellOff size={16} color={colors.foreground} />
                    }
                  </View>
                  <Text style={styles.actionOptionText}>
                    {selectedConv._isMuted ? "Unmute notifications" : "Mute notifications"}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.actionOption}
                  onPress={() => {
                    handleArchive(selectedConv);
                    closeActionSheet();
                  }}
                >
                  <View style={[styles.actionOptionIcon, { backgroundColor: "#F0FDF4" }]}>
                    {selectedConv._isArchived
                      ? <ArchiveRestore size={16} color="#22C55E" />
                      : <Archive size={16} color="#22C55E" />
                    }
                  </View>
                  <Text style={styles.actionOptionText}>
                    {selectedConv._isArchived ? "Unarchive conversation" : "Archive conversation"}
                  </Text>
                </Pressable>

                <View style={styles.actionSheetDivider} />

                <Pressable style={styles.actionOption} onPress={() => handleDeleteRequest(selectedConv)}>
                  <View style={[styles.actionOptionIcon, { backgroundColor: "#FFF0F0" }]}>
                    <Trash2 size={16} color={colors.destructive} />
                  </View>
                  <Text style={[styles.actionOptionText, { color: colors.destructive }]}>Delete conversation</Text>
                </Pressable>

                <Pressable style={styles.actionOption} onPress={() => handleBlock(selectedConv)}>
                  <View style={[styles.actionOptionIcon, { backgroundColor: "#FFF0F0" }]}>
                    <UserX size={16} color={colors.destructive} />
                  </View>
                  <Text style={[styles.actionOptionText, { color: colors.destructive }]}>Block user</Text>
                </Pressable>

                <Pressable style={styles.actionOption} onPress={handleReport}>
                  <View style={[styles.actionOptionIcon, { backgroundColor: "#FFF0F0" }]}>
                    <ShieldAlert size={16} color={colors.destructive} />
                  </View>
                  <Text style={[styles.actionOptionText, { color: colors.destructive }]}>Report user</Text>
                </Pressable>

                <Pressable style={[styles.actionOption, styles.cancelOption]} onPress={closeActionSheet}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
              </>
            )}
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal visible={deleteConfirmVisible} transparent animationType="fade" onRequestClose={() => setDeleteConfirmVisible(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconWrap}>
              <Trash2 size={24} color={colors.destructive} />
            </View>
            <Text style={styles.confirmTitle}>Delete this conversation?</Text>
            <Text style={styles.confirmSub}>
              The conversation will be removed from your inbox. This cannot be undone.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={[styles.confirmBtn, styles.confirmBtnCancel]}
                onPress={() => { setDeleteConfirmVisible(false); setSelectedConv(null); }}
              >
                <Text style={styles.confirmBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.confirmBtn, styles.confirmBtnDelete]} onPress={confirmDelete}>
                <Text style={styles.confirmBtnDeleteText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        </View>
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
    <Animated.View style={[styles.emptyState, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
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
      marginBottom: 12,
      backgroundColor: colors.secondary + "80",
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 11,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border + "50",
    },
    searchInput: { flex: 1, fontSize: 14, color: colors.foreground, padding: 0 },
    filterRow: {
      flexDirection: "row",
      paddingHorizontal: 24,
      marginBottom: 12,
      gap: 8,
    },
    filterChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border + "50",
    },
    filterChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.primary + "60",
    },
    filterChipText: {
      fontSize: 12,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
    },
    filterChipTextActive: {
      color: colors.primary,
    },
    listContent: { paddingHorizontal: 16, paddingBottom: 32 },
    separator: { height: 1, backgroundColor: colors.border + "35", marginLeft: 82 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 8,
      gap: 14,
      borderRadius: 16,
      backgroundColor: colors.background,
    },
    nameRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
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
    pinBadge: {
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
    pinBadgeText: { fontSize: 9 },
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
    actionSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingTop: 12,
      paddingBottom: Platform.OS === "ios" ? 40 : 24,
      paddingHorizontal: 16,
    },
    actionSheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 4,
      paddingBottom: 16,
    },
    actionSheetAvatar: { width: 40, height: 40, borderRadius: 20 },
    actionSheetAvatarFallback: {
      backgroundColor: colors.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    actionSheetAvatarInitial: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.primary,
    },
    actionSheetName: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.foreground,
      flex: 1,
    },
    actionSheetDivider: {
      height: 1,
      backgroundColor: colors.border + "60",
      marginBottom: 8,
      marginTop: 4,
    },
    actionOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingVertical: 12,
      paddingHorizontal: 4,
    },
    actionOptionIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    actionOptionText: {
      fontSize: 15,
      color: colors.foreground,
      fontWeight: "500" as const,
    },
    cancelOption: {
      marginTop: 4,
      justifyContent: "center" as const,
    },
    cancelText: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
      textAlign: "center" as const,
      flex: 1,
    },
    confirmOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
    },
    confirmCard: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 28,
      alignItems: "center",
      gap: 12,
      width: "100%",
      maxWidth: 340,
    },
    confirmIconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "#FFF0F0",
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: 4,
    },
    confirmTitle: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.foreground,
      textAlign: "center" as const,
    },
    confirmSub: {
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: "center" as const,
      lineHeight: 20,
    },
    confirmActions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 8,
      width: "100%",
    },
    confirmBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center" as const,
    },
    confirmBtnCancel: {
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    confirmBtnCancelText: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    confirmBtnDelete: {
      backgroundColor: colors.destructive,
    },
    confirmBtnDeleteText: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: "#FFFFFF",
    },
  });
}
