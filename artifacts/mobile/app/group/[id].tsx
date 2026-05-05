import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import ImageAttachment from "@/components/ImageAttachment";
import ImageViewer from "@/components/ImageViewer";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  Share,
  Dimensions,
  FlatList,
  Modal,
  TouchableOpacity,
  Clipboard,
  PanResponder,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ChevronLeft,
  MoreVertical,
  MoreHorizontal,
  Mic,
  Send,
  Users,
  Plus,
  Crown,
  Shield,
  Search,
  ImageIcon,
  Check,
  CheckCheck,
  Reply,
  SmilePlus,
  Forward,
  Copy,
  Trash2,
  Flag,
  Info,
  Settings,
  LogOut,
  UserPlus,
  Play,
  Pause,
  Square,
  X,
  MessageSquare,
  UserMinus,
  ShieldCheck,
  ShieldOff,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";
import { useGroupState, groupStore, GroupMember as StoreGroupMember } from "@/lib/groupStore";
import { useChurchEntitlements } from "@/hooks/useChurchEntitlements";

type GroupTab = "Chat" | "Members" | "Media";

const SCREEN_WIDTH = Dimensions.get("window").width;
const MEDIA_THUMB_SIZE = (SCREEN_WIDTH - 40 - 6) / 3;

interface SharedPrayerCard {
  authorName: string;
  authorAvatar: string;
  postContent: string;
  updateTag?: string;
}

interface MessageReaction {
  userId: string;
  userName: string;
  userAvatar: string;
  type: "pray" | "emoji";
  emoji?: string;
  createdAt: string;
}

interface MessageRead {
  userId: string;
  userName: string;
  userAvatar: string;
  readAt: string;
  deliveredAt?: string;
}

interface ReplyTo {
  id: string;
  senderName: string;
  text: string;
  imageUrl?: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  time: string;
  isOwn: boolean;
  isVoice?: boolean;
  audioUri?: string;
  audioDurationMs?: number;
  sharedPrayer?: SharedPrayerCard;
  imageUrl?: string;
  reactions?: MessageReaction[];
  readBy?: MessageRead[];
  replyTo?: ReplyTo;
}

const EMOJI_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "🤗", "🙏"];

interface Member {
  id: string;
  name: string;
  avatar: string;
  role: "Admin" | "Leader" | "Member";
  isOnline: boolean;
  joinedDate?: string;
}

const TOTAL_GROUP_MEMBERS = 12;
const IS_CURRENT_USER_ADMIN = true;

const CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "cm1",
    senderId: "alice",
    senderName: "Alice Thompson",
    senderAvatar: "https://randomuser.me/api/portraits/women/62.jpg",
    text: "Amen! Standing with you, Sarah. The Lord is your strength during this surgery.",
    time: "9:12 AM",
    isOwn: false,
    reactions: [
      { userId: "me", userName: "Me", userAvatar: "https://randomuser.me/api/portraits/women/44.jpg", type: "pray", createdAt: "9:13 AM" },
      { userId: "michael", userName: "Michael", userAvatar: "https://randomuser.me/api/portraits/men/32.jpg", type: "pray", createdAt: "9:14 AM" },
      { userId: "david", userName: "David", userAvatar: "https://randomuser.me/api/portraits/men/85.jpg", type: "pray", createdAt: "9:15 AM" },
    ],
  },
  {
    id: "cm2",
    senderId: "me",
    senderName: "Me",
    senderAvatar: "https://randomuser.me/api/portraits/women/44.jpg",
    text: "Thank you so much Alice. It means the world to have this community.",
    time: "9:18 AM",
    isOwn: true,
    readBy: [
      { userId: "alice", userName: "Alice Thompson", userAvatar: "https://randomuser.me/api/portraits/women/62.jpg", readAt: "9:19 AM", deliveredAt: "9:18 AM" },
      { userId: "michael", userName: "Michael Reeves", userAvatar: "https://randomuser.me/api/portraits/men/32.jpg", readAt: "9:20 AM", deliveredAt: "9:18 AM" },
      { userId: "emma", userName: "Emma Watson", userAvatar: "https://randomuser.me/api/portraits/women/44.jpg", readAt: "9:22 AM", deliveredAt: "9:19 AM" },
      { userId: "david", userName: "David Chen", userAvatar: "https://randomuser.me/api/portraits/men/85.jpg", readAt: "9:21 AM", deliveredAt: "9:19 AM" },
      { userId: "chloe", userName: "Chloe Martin", userAvatar: "https://randomuser.me/api/portraits/women/24.jpg", readAt: "9:25 AM", deliveredAt: "9:20 AM" },
      { userId: "bob", userName: "Bob Jenkins", userAvatar: "https://randomuser.me/api/portraits/men/42.jpg", readAt: "9:28 AM", deliveredAt: "9:20 AM" },
      { userId: "diana", userName: "Diana Prince", userAvatar: "https://randomuser.me/api/portraits/women/33.jpg", readAt: "9:30 AM", deliveredAt: "9:21 AM" },
      { userId: "chris", userName: "Chris Evans", userAvatar: "https://randomuser.me/api/portraits/men/12.jpg", readAt: "9:31 AM", deliveredAt: "9:21 AM" },
      { userId: "sarah", userName: "Sarah Jenkins", userAvatar: "https://randomuser.me/api/portraits/women/45.jpg", readAt: "9:33 AM", deliveredAt: "9:22 AM" },
      { userId: "nathan", userName: "Nathan Ford", userAvatar: "https://randomuser.me/api/portraits/men/55.jpg", readAt: "9:35 AM", deliveredAt: "9:22 AM" },
      { userId: "grace", userName: "Grace Kim", userAvatar: "https://randomuser.me/api/portraits/women/68.jpg", readAt: "9:37 AM", deliveredAt: "9:23 AM" },
    ],
    reactions: [
      { userId: "alice", userName: "Alice", userAvatar: "https://randomuser.me/api/portraits/women/62.jpg", type: "pray", createdAt: "9:20 AM" },
      { userId: "michael", userName: "Michael", userAvatar: "https://randomuser.me/api/portraits/men/32.jpg", type: "pray", createdAt: "9:21 AM" },
    ],
  },
  {
    id: "cm3",
    senderId: "michael",
    senderName: "Michael Reeves",
    senderAvatar: "https://randomuser.me/api/portraits/men/32.jpg",
    text: "",
    time: "9:25 AM",
    isOwn: false,
    isVoice: true,
  },
  {
    id: "cm4",
    senderId: "emma",
    senderName: "Emma Watson",
    senderAvatar: "https://randomuser.me/api/portraits/women/44.jpg",
    text: "Just shared a prayer for you in my morning devotions. Keep us posted! ❤️",
    time: "10:02 AM",
    isOwn: false,
    reactions: [
      { userId: "me", userName: "Me", userAvatar: "https://randomuser.me/api/portraits/women/44.jpg", type: "pray", createdAt: "10:03 AM" },
    ],
  },
  {
    id: "cm5",
    senderId: "alice",
    senderName: "Alice Thompson",
    senderAvatar: "https://randomuser.me/api/portraits/women/62.jpg",
    text: "Look at this beautiful sunrise this morning. God's creation! 🌅",
    imageUrl: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=600&q=80",
    time: "7:05 AM",
    isOwn: false,
  },
  {
    id: "cm6",
    senderId: "me",
    senderName: "Me",
    senderAvatar: "https://randomuser.me/api/portraits/women/44.jpg",
    text: "Sharing our church gathering last Sunday 🙏",
    imageUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80",
    time: "2:30 PM",
    isOwn: true,
    readBy: [
      { userId: "alice", userName: "Alice Thompson", userAvatar: "https://randomuser.me/api/portraits/women/62.jpg", readAt: "2:32 PM", deliveredAt: "2:31 PM" },
      { userId: "michael", userName: "Michael Reeves", userAvatar: "https://randomuser.me/api/portraits/men/32.jpg", readAt: "2:35 PM", deliveredAt: "2:31 PM" },
      { userId: "emma", userName: "Emma Watson", userAvatar: "https://randomuser.me/api/portraits/women/44.jpg", readAt: "2:40 PM", deliveredAt: "2:32 PM" },
    ],
  },
  {
    id: "cm7",
    senderId: "david",
    senderName: "David Chen",
    senderAvatar: "https://randomuser.me/api/portraits/men/85.jpg",
    text: "Our prayer group met at the park yesterday",
    imageUrl: "https://images.unsplash.com/photo-1543965170-e36ed9636e5e?w=600&q=80",
    time: "Yesterday",
    isOwn: false,
  },
  {
    id: "cm8",
    senderId: "grace",
    senderName: "Grace Kim",
    senderAvatar: "https://randomuser.me/api/portraits/women/68.jpg",
    text: "",
    imageUrl: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=600&q=80",
    time: "Monday",
    isOwn: false,
  },
  {
    id: "cm9",
    senderId: "me",
    senderName: "Me",
    senderAvatar: "https://randomuser.me/api/portraits/women/44.jpg",
    text: "Scripture verse for today 📖",
    imageUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=80",
    time: "Sunday",
    isOwn: true,
    readBy: [],
  },
  {
    id: "cm10",
    senderId: "emma",
    senderName: "Emma Watson",
    senderAvatar: "https://randomuser.me/api/portraits/women/44.jpg",
    text: "The candles from our prayer vigil 🕯️",
    imageUrl: "https://images.unsplash.com/photo-1482446945327-8e0abb5a7a8e?w=600&q=80",
    time: "Last week",
    isOwn: false,
  },
];

const MEMBERS: Member[] = [
  {
    id: "m1",
    name: "Pastor Michael",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    role: "Admin",
    isOnline: true,
    joinedDate: "Founder",
  },
  {
    id: "m2",
    name: "Alice Thompson",
    avatar: "https://randomuser.me/api/portraits/women/62.jpg",
    role: "Admin",
    isOnline: true,
    joinedDate: "Since Jan 2023",
  },
  {
    id: "m3",
    name: "David Chen",
    avatar: "https://randomuser.me/api/portraits/men/85.jpg",
    role: "Leader",
    isOnline: false,
    joinedDate: "Since Mar 2023",
  },
  {
    id: "m4",
    name: "Emma Watson",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    role: "Leader",
    isOnline: true,
    joinedDate: "Since Jun 2023",
  },
  {
    id: "m5",
    name: "Chloe Martin",
    avatar: "https://randomuser.me/api/portraits/women/24.jpg",
    role: "Member",
    isOnline: true,
    joinedDate: "Since Aug 2023",
  },
  {
    id: "m6",
    name: "Bob Jenkins",
    avatar: "https://randomuser.me/api/portraits/men/42.jpg",
    role: "Member",
    isOnline: false,
    joinedDate: "Since Sep 2023",
  },
  {
    id: "m7",
    name: "Diana Prince",
    avatar: "https://randomuser.me/api/portraits/women/33.jpg",
    role: "Member",
    isOnline: true,
    joinedDate: "Since Oct 2023",
  },
  {
    id: "m8",
    name: "Chris Evans",
    avatar: "https://randomuser.me/api/portraits/men/12.jpg",
    role: "Member",
    isOnline: false,
    joinedDate: "Since Nov 2023",
  },
  {
    id: "m9",
    name: "Sarah Jenkins",
    avatar: "https://randomuser.me/api/portraits/women/45.jpg",
    role: "Member",
    isOnline: true,
    joinedDate: "Since Dec 2023",
  },
  {
    id: "m10",
    name: "Nathan Ford",
    avatar: "https://randomuser.me/api/portraits/men/55.jpg",
    role: "Member",
    isOnline: false,
    joinedDate: "Since Jan 2024",
  },
  {
    id: "m11",
    name: "Grace Kim",
    avatar: "https://randomuser.me/api/portraits/women/68.jpg",
    role: "Member",
    isOnline: true,
    joinedDate: "Since Feb 2024",
  },
  {
    id: "m12",
    name: "James Okafor",
    avatar: "https://randomuser.me/api/portraits/men/75.jpg",
    role: "Member",
    isOnline: false,
    joinedDate: "Since Mar 2024",
  },
];

function getUpdateTagLabels(colors: ThemeColors): Record<string, { label: string; bg: string; color: string }> {
  return {
    still_need_prayer: { label: "Still need prayer", bg: colors.accent, color: colors.primary },
    answered: { label: "Answered 🙌", bg: "#E8F8F0", color: "#1A7A52" },
    thank_you: { label: "Thank you", bg: "#EEF2FF", color: "#6366F1" },
    in_progress: { label: "In progress", bg: "#FFF8E7", color: "#B87A00" },
  };
}

export default function GroupDetailScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{
    id: string;
    pendingSharedMessage?: string;
    sharedAuthorName?: string;
    sharedAuthorAvatar?: string;
    sharedPostContent?: string;
    sharedUpdateTag?: string;
  }>();
  const { id } = params;
  const groupId = id || "group-1";
  const groupState = useGroupState(groupId);
  const insets = useSafeAreaInsets();
  const { isPremiumCommunity, isOwner } = useChurchEntitlements();
  const [activeTab, setActiveTab] = useState<GroupTab>("Chat");

  const [chatInput, setChatInput] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(CHAT_MESSAGES);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [memberActionsTarget, setMemberActionsTarget] = useState<Member | null>(null);
  const [viewingMediaItem, setViewingMediaItem] = useState<MediaItem | null>(null);
  const [memberSearch, setMemberSearch] = useState<string>("");
  const [groupImageUri, setGroupImageUri] = useState<string | null>(null);
  const [viewingGroupImage, setViewingGroupImage] = useState<string | null>(null);
  const [contextMsg, setContextMsg] = useState<ChatMessage | null>(null);
  const [infoMsg, setInfoMsg] = useState<ChatMessage | null>(null);
  const [replyingTo, setReplyingTo] = useState<ReplyTo | null>(null);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const groupMenuAnim = useRef(new Animated.Value(260)).current;
  const groupMenuBackdrop = useRef(new Animated.Value(0)).current;
  const msgPositionsRef = useRef<Map<string, number>>(new Map());
  const injectedRef = useRef<boolean>(false);
  const chatScrollRef = useRef<ScrollView>(null);

  const openGroupMenu = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowGroupMenu(true);
    Animated.parallel([
      Animated.timing(groupMenuBackdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(groupMenuAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  }, [groupMenuAnim, groupMenuBackdrop]);

  const closeGroupMenu = useCallback(() => {
    Animated.parallel([
      Animated.timing(groupMenuBackdrop, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(groupMenuAnim, { toValue: 260, duration: 180, useNativeDriver: true }),
    ]).start(() => setShowGroupMenu(false));
  }, [groupMenuAnim, groupMenuBackdrop]);

  const handleLongPress = useCallback((msg: ChatMessage) => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setContextMsg(msg);
  }, []);

  const handleReply = useCallback((msg: ChatMessage) => {
    setReplyingTo({ id: msg.id, senderName: msg.isOwn ? "You" : msg.senderName, text: msg.text, imageUrl: msg.imageUrl });
    setContextMsg(null);
  }, []);

  const handleScrollToMessage = useCallback((msgId: string) => {
    const y = msgPositionsRef.current.get(msgId);
    if (y !== undefined) {
      chatScrollRef.current?.scrollTo({ y: Math.max(0, y - 80), animated: true });
    }
  }, []);

  const handleAddPrayReaction = useCallback((msgId: string) => {
    setChatMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const existing = (m.reactions ?? []).find((r) => r.userId === "me" && r.type === "pray");
        if (existing) return m;
        return {
          ...m,
          reactions: [
            ...(m.reactions ?? []),
            { userId: "me", userName: "Me", userAvatar: "https://randomuser.me/api/portraits/women/44.jpg", type: "pray" as const, createdAt: "Just now" },
          ],
        };
      })
    );
    setContextMsg(null);
  }, []);

  const handleAddEmojiReaction = useCallback((msgId: string, emoji: string) => {
    setChatMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const existing = (m.reactions ?? []).find((r) => r.userId === "me" && r.type === "emoji" && r.emoji === emoji);
        if (existing) {
          return { ...m, reactions: (m.reactions ?? []).filter((r) => !(r.userId === "me" && r.type === "emoji" && r.emoji === emoji)) };
        }
        return {
          ...m,
          reactions: [
            ...(m.reactions ?? []),
            { userId: "me", userName: "Me", userAvatar: "https://randomuser.me/api/portraits/women/44.jpg", type: "emoji" as const, emoji, createdAt: "Just now" },
          ],
        };
      })
    );
    setContextMsg(null);
  }, []);

  const handleDeleteMessage = useCallback((msgId: string) => {
    Alert.alert("Delete message", "Remove this message for everyone?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setChatMessages((prev) => prev.filter((m) => m.id !== msgId));
          setContextMsg(null);
        },
      },
    ]);
  }, []);

  React.useEffect(() => {
    if (injectedRef.current) return;
    if (!params.sharedPostContent) return;
    injectedRef.current = true;
    console.log("[GroupChat] Injecting shared prayer message from params");
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const sharedMsg: ChatMessage = {
      id: `shared_${Date.now()}`,
      senderId: "me",
      senderName: "Me",
      senderAvatar: "https://randomuser.me/api/portraits/women/44.jpg",
      text: params.pendingSharedMessage ?? "",
      time: timeStr,
      isOwn: true,
      sharedPrayer: {
        authorName: params.sharedAuthorName ?? "",
        authorAvatar: params.sharedAuthorAvatar ?? "",
        postContent: (params.sharedPostContent ?? "").replace(/^"|"$/g, ""),
        updateTag: params.sharedUpdateTag || undefined,
      },
    };
    setChatMessages((prev) => [...prev, sharedMsg]);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 150);
  }, []);

  const handleTabPress = useCallback((tab: GroupTab) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setActiveTab(tab);
  }, []);

  const handleSendMessage = useCallback(() => {
    const trimmed = chatInput.trim();
    if (!trimmed && !groupImageUri) return;
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMsg: ChatMessage = {
      id: `cm_${Date.now()}`,
      senderId: "me",
      senderName: "Me",
      senderAvatar: "https://randomuser.me/api/portraits/women/44.jpg",
      text: trimmed,
      imageUrl: groupImageUri ?? undefined,
      time: "Just now",
      isOwn: true,
      replyTo: replyingTo ?? undefined,
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");
    setGroupImageUri(null);
    setReplyingTo(null);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [chatInput, groupImageUri, replyingTo]);

  const handleSendVoiceMessage = useCallback((uri: string, durationMs: number) => {
    setShowVoiceRecorder(false);
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newMsg: ChatMessage = {
      id: `vm_${Date.now()}`,
      senderId: "me",
      senderName: "Me",
      senderAvatar: "https://randomuser.me/api/portraits/women/44.jpg",
      text: "",
      time: "Just now",
      isOwn: true,
      isVoice: true,
      audioUri: uri,
      audioDurationMs: durationMs,
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const filteredMembers = groupState.members.filter((m) =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const admins = filteredMembers.filter((m) => m.role === "Admin");
  const leaders = filteredMembers.filter((m) => m.role === "Leader");
  const members = filteredMembers.filter((m) => m.role === "Member");
  const allMediaImages = useMemo(() => {
    return chatMessages
      .filter((m) => !!m.imageUrl)
      .map((m) => ({
        id: m.id,
        uri: m.imageUrl!,
        senderName: m.senderName,
        time: m.time,
      }))
      .reverse();
  }, [chatMessages]);

  const isChatTab = activeTab === "Chat";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!isChatTab && (
        <View style={[styles.banner, { paddingTop: insets.top + 12 }]}>
          <Image
            source={{
              uri: groupState.photoUri ?? "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80",
            }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
          <View style={styles.bannerOverlay} />

          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={20} color="#fff" />
          </Pressable>

          <View style={styles.bannerBottom}>
            <View style={styles.groupIconWrap}>
              <View style={styles.groupIconInner}>
                <Users size={24} color={colors.primary} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.groupName}>{groupState.name}</Text>
              {isPremiumCommunity && (
                <View style={styles.premiumPill}>
                  <Text style={styles.premiumPillText}>✦ Premium Community</Text>
                </View>
              )}
              <Text style={styles.groupStats}>128 Members · Active Now</Text>
            </View>
            <Pressable style={styles.settingsBtn} onPress={openGroupMenu}>
              <MoreVertical size={18} color={colors.foreground} />
            </Pressable>
          </View>
        </View>
      )}

      {isChatTab && (
        <View style={[styles.chatHeader, { paddingTop: insets.top }]}>
          <Pressable style={styles.chatBackBtn} onPress={() => router.back()}>
            <ChevronLeft size={20} color={colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.chatHeaderName}>{groupState.name}</Text>
            <Text style={styles.chatHeaderSub}>128 Members · 12 Active</Text>
          </View>
          <Pressable style={styles.settingsBtn} onPress={openGroupMenu}>
            <MoreVertical size={18} color={colors.foreground} />
          </Pressable>
        </View>
      )}

      <View style={styles.tabBar}>
        {(["Chat", "Members", "Media"] as GroupTab[]).map((tab) => (
          <Pressable
            key={tab}
            style={styles.tabItem}
            onPress={() => handleTabPress(tab)}
          >
            <View style={styles.tabLabelRow}>
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
              {tab === "Media" && allMediaImages.length > 0 && (
                <View style={[styles.tabBadge, activeTab === tab && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, activeTab === tab && styles.tabBadgeTextActive]}>
                    {allMediaImages.length}
                  </Text>
                </View>
              )}
            </View>
            {activeTab === tab && <View style={styles.tabIndicator} />}
          </Pressable>
        ))}
      </View>

      {activeTab === "Chat" && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            ref={chatScrollRef}
            contentContainerStyle={styles.chatScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.dateDivider}>
              <Text style={styles.dateDividerText}>Today</Text>
            </View>
            {chatMessages.map((msg, index) => {
              const prevMsg = chatMessages[index - 1];
              const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId;
              return msg.isOwn ? (
                <OwnMessage
                  key={msg.id}
                  message={msg}
                  onImagePress={setViewingGroupImage}
                  onLongPress={handleLongPress}
                  onReply={handleReply}
                  onScrollToMessage={handleScrollToMessage}
                  onLayout={(y) => msgPositionsRef.current.set(msg.id, y)}
                />
              ) : (
                <OtherMessage
                  key={msg.id}
                  message={msg}
                  showHeader={isFirstInGroup}
                  onImagePress={setViewingGroupImage}
                  onLongPress={handleLongPress}
                  onReply={handleReply}
                  onScrollToMessage={handleScrollToMessage}
                  onLayout={(y) => msgPositionsRef.current.set(msg.id, y)}
                />
              );
            })}
          </ScrollView>

          <View style={styles.chatInputOuter}>
            {replyingTo && (
              <View style={styles.replyBanner}>
                <View style={styles.replyBannerBar} />
                <View style={styles.replyBannerBody}>
                  <Text style={styles.replyBannerName}>{replyingTo.senderName}</Text>
                  {replyingTo.imageUrl && !replyingTo.text && <Text style={styles.replyBannerText}>📷 Photo</Text>}
                  {replyingTo.text ? <Text style={styles.replyBannerText} numberOfLines={1}>{replyingTo.text}</Text> : null}
                </View>
                <Pressable onPress={() => setReplyingTo(null)} style={styles.replyBannerClose} hitSlop={10}>
                  <Text style={styles.replyBannerCloseText}>✕</Text>
                </Pressable>
              </View>
            )}
            {groupImageUri && (
              <View style={styles.groupImagePreviewRow}>
                <ImageAttachment
                  imageUri={groupImageUri}
                  onImageSelected={setGroupImageUri}
                  onRemove={() => setGroupImageUri(null)}
                />
              </View>
            )}
            <View style={[styles.chatInputBar, { paddingBottom: insets.bottom + 8 }]}>
            <ImageAttachment
              imageUri={null}
              onImageSelected={(uri) => setGroupImageUri(uri)}
              onRemove={() => {}}
            />
            <View style={styles.chatInputWrap}>
              <TextInput
                style={styles.chatInput}
                placeholder="Type a message..."
                placeholderTextColor={colors.mutedForeground}
                value={chatInput}
                onChangeText={setChatInput}
                multiline
              />
              <Pressable style={styles.emojiBtn}>
                <Text style={{ fontSize: 20 }}>🙂</Text>
              </Pressable>
            </View>
            <Pressable
              style={[styles.chatSendBtn, (chatInput.trim().length > 0 || !!groupImageUri) && styles.chatSendBtnActive]}
              onPress={chatInput.trim().length > 0 || !!groupImageUri ? handleSendMessage : () => {
                if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowVoiceRecorder(true);
              }}
            >
              {(chatInput.trim().length > 0 || !!groupImageUri) ? (
                <Send size={18} color={colors.primaryForeground} />
              ) : (
                <Mic size={20} color={colors.primaryForeground} />
              )}
            </Pressable>
          </View>
          </View>

          <ImageViewer
            uri={viewingGroupImage}
            visible={!!viewingGroupImage}
            onClose={() => setViewingGroupImage(null)}
          />

          <ChatVoiceRecorder
            visible={showVoiceRecorder}
            onSend={handleSendVoiceMessage}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        </KeyboardAvoidingView>
      )}

      <MessageContextMenu
        message={contextMsg}
        visible={!!contextMsg}
        onClose={() => setContextMsg(null)}
        onReply={(msg) => handleReply(msg)}
        onPray={(id) => handleAddPrayReaction(id)}
        onReact={(id, emoji) => handleAddEmojiReaction(id, emoji)}
        onCopy={(text) => {
          try { Clipboard.setString(text); } catch {}
          setContextMsg(null);
        }}
        onDelete={(id) => handleDeleteMessage(id)}
        onInfo={(msg) => { setInfoMsg(msg); setContextMsg(null); }}
        onReport={() => { Alert.alert("Reported", "This message has been reported."); setContextMsg(null); }}
      />

      <MessageInfoSheet
        message={infoMsg}
        visible={!!infoMsg}
        totalMembers={groupState.members.length}
        members={groupState.members}
        onClose={() => setInfoMsg(null)}
      />

      <MemberActionsSheet
        member={memberActionsTarget}
        visible={!!memberActionsTarget}
        onClose={() => setMemberActionsTarget(null)}
        onViewProfile={() => memberActionsTarget && router.push(`/user/${memberActionsTarget.id}` as never)}
        onMessage={() => memberActionsTarget && Alert.alert("Message", `Opening DM with ${memberActionsTarget.name}`)}
        onToggleAdmin={(m) => {
          const updated = groupState.members.map((mem) =>
            mem.id === m.id
              ? { ...mem, role: (mem.role === "Admin" ? "Member" : "Admin") as Member["role"] }
              : mem
          );
          groupStore.update(groupId, { members: updated });
        }}
        onToggleLeader={(m) => {
          const updated = groupState.members.map((mem) =>
            mem.id === m.id
              ? { ...mem, role: (mem.role === "Leader" ? "Member" : "Leader") as Member["role"] }
              : mem
          );
          groupStore.update(groupId, { members: updated });
        }}
        onRemove={(m) => {
          groupStore.update(groupId, { members: groupState.members.filter((mem) => mem.id !== m.id) });
        }}
      />

      <MediaViewer
        item={viewingMediaItem}
        visible={!!viewingMediaItem}
        onClose={() => setViewingMediaItem(null)}
      />

      {activeTab === "Media" && (
        <MediaGallery
          images={allMediaImages}
          onImagePress={(item) => setViewingMediaItem(item)}
        />
      )}

      {activeTab === "Members" && (
        <ScrollView
          contentContainerStyle={styles.membersScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.memberSearchWrap}>
            <Search size={16} color={colors.mutedForeground} />
            <TextInput
              style={styles.memberSearchInput}
              placeholder="Search members..."
              placeholderTextColor={colors.mutedForeground}
              value={memberSearch}
              onChangeText={setMemberSearch}
            />
          </View>

          <View style={styles.memberStats}>
            <View style={styles.memberStatItem}>
              <Text style={styles.memberStatNum}>{groupState.members.length}</Text>
              <Text style={styles.memberStatLabel}>Total</Text>
            </View>
            <View style={styles.memberStatDivider} />
            <View style={styles.memberStatItem}>
              <Text style={styles.memberStatNum}>
                {groupState.members.filter((m) => m.isOnline).length}
              </Text>
              <Text style={styles.memberStatLabel}>Online</Text>
            </View>
            <View style={styles.memberStatDivider} />
            <View style={styles.memberStatItem}>
              <Text style={styles.memberStatNum}>
                {groupState.members.filter((m) => m.role === "Admin" || m.role === "Leader").length}
              </Text>
              <Text style={styles.memberStatLabel}>Leaders</Text>
            </View>
          </View>

          {admins.length > 0 && (
            <>
              <View style={styles.memberSectionHeader}>
                <Crown size={14} color={colors.primary} />
                <Text style={styles.memberSectionTitle}>Admins</Text>
              </View>
              {admins.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  onPress={() => router.push(`/user/${member.id}` as never)}
                  onMore={() => { if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMemberActionsTarget(member); }}
                />
              ))}
            </>
          )}

          {leaders.length > 0 && (
            <>
              <View style={styles.memberSectionHeader}>
                <Shield size={14} color={colors.accentForeground} />
                <Text style={[styles.memberSectionTitle, { color: colors.accentForeground }]}>
                  Leaders
                </Text>
              </View>
              {leaders.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  onPress={() => router.push(`/user/${member.id}` as never)}
                  onMore={() => { if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMemberActionsTarget(member); }}
                />
              ))}
            </>
          )}

          {members.length > 0 && (
            <>
              <View style={styles.memberSectionHeader}>
                <Users size={14} color={colors.mutedForeground} />
                <Text style={[styles.memberSectionTitle, { color: colors.mutedForeground }]}>
                  Members
                </Text>
              </View>
              {members.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  onPress={() => router.push(`/user/${member.id}` as never)}
                  onMore={() => { if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMemberActionsTarget(member); }}
                />
              ))}
            </>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {showGroupMenu && (
        <Modal visible transparent animationType="none" onRequestClose={closeGroupMenu} statusBarTranslucent>
          <View style={styles.groupMenuRoot}>
            <Animated.View style={[styles.groupMenuBackdrop, { opacity: groupMenuBackdrop }]}>
              <Pressable style={StyleSheet.absoluteFill} onPress={closeGroupMenu} />
            </Animated.View>
            <Animated.View style={[styles.groupMenuSheet, { backgroundColor: colors.card, transform: [{ translateY: groupMenuAnim }] }]}>
              <View style={styles.groupMenuHandle} />

              <Text style={[styles.groupMenuGroupName, { color: colors.foreground }]}>{groupState.name}</Text>
              {isPremiumCommunity && (
                <View style={[styles.menuPremiumBadge, { backgroundColor: colors.primary + "15" }]}>
                  <Crown size={11} color={colors.primary} />
                  <Text style={[styles.menuPremiumText, { color: colors.primary }]}>Premium Community</Text>
                </View>
              )}
              {isOwner && isPremiumCommunity && (
                <Text style={[styles.menuOwnerText, { color: colors.mutedForeground }]}>You are the owner</Text>
              )}

              {IS_CURRENT_USER_ADMIN && (
                <Pressable
                  style={[styles.groupMenuItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    closeGroupMenu();
                    setTimeout(() => router.push(`/group/manage?id=${id}` as never), 250);
                  }}
                >
                  <View style={[styles.groupMenuIconWrap, { backgroundColor: colors.primary + "15" }]}>
                    <Settings size={18} color={colors.primary} />
                  </View>
                  <View style={styles.groupMenuItemBody}>
                    <Text style={[styles.groupMenuItemTitle, { color: colors.foreground }]}>Manage Group</Text>
                    <Text style={[styles.groupMenuItemDesc, { color: colors.mutedForeground }]}>Edit details, manage members, privacy</Text>
                  </View>
                </Pressable>
              )}

              <Pressable
                style={[styles.groupMenuItem, { borderBottomColor: colors.border }]}
                onPress={() => {
                  closeGroupMenu();
                  void Share.share({
                    message: `Join ${groupState.name} on Prayer Space — a private space to pray and stay connected.\n\nhttps://prayerspace.app/join`,
                  });
                }}
              >
                <View style={[styles.groupMenuIconWrap, { backgroundColor: colors.accent }]}>
                  <UserPlus size={18} color={colors.accentForeground} />
                </View>
                <View style={styles.groupMenuItemBody}>
                  <Text style={[styles.groupMenuItemTitle, { color: colors.foreground }]}>Invite Members</Text>
                  <Text style={[styles.groupMenuItemDesc, { color: colors.mutedForeground }]}>Share a link to join this group</Text>
                </View>
              </Pressable>

              <Pressable
                style={[styles.groupMenuItem, { borderBottomColor: "transparent" }]}
                onPress={() => {
                  closeGroupMenu();
                  setTimeout(() => {
                    Alert.alert(
                      "Leave Group",
                      `Are you sure you want to leave ${groupState.name}?`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Leave",
                          style: "destructive",
                          onPress: () => router.replace("/(tabs)/community" as never),
                        },
                      ]
                    );
                  }, 300);
                }}
              >
                <View style={[styles.groupMenuIconWrap, { backgroundColor: "#FEF2F2" }]}>
                  <LogOut size={18} color="#DC2626" />
                </View>
                <View style={styles.groupMenuItemBody}>
                  <Text style={[styles.groupMenuItemTitle, { color: "#DC2626" }]}>Leave Group</Text>
                  <Text style={[styles.groupMenuItemDesc, { color: colors.mutedForeground }]}>You won't receive group messages</Text>
                </View>
              </Pressable>

              <Pressable style={[styles.groupMenuCancelBtn, { backgroundColor: colors.secondary }]} onPress={closeGroupMenu}>
                <Text style={[styles.groupMenuCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </Pressable>
            </Animated.View>
          </View>
        </Modal>
      )}
    </View>
  );
}

function formatVoiceDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const WAVEFORM_HEIGHTS = [5, 10, 16, 12, 7, 14, 20, 13, 8, 16, 22, 14, 7, 12, 18, 10, 5, 14, 20, 11, 8, 16, 13, 9, 15, 20, 13, 5, 10, 16];

function InlineVoicePlayer({ uri, durationMs, isOwn }: { uri?: string; durationMs: number; isOwn: boolean }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const hasFinishedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (soundRef.current) { soundRef.current.unloadAsync().catch(() => {}); soundRef.current = null; }
    };
  }, []);

  const togglePlay = useCallback(async () => {
    if (!uri) return;
    if (isPlaying) {
      await soundRef.current?.pauseAsync();
      setIsPlaying(false);
    } else {
      hasFinishedRef.current = false;
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(0);
        await soundRef.current.playAsync();
      } else {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded) {
              setPositionMs(status.positionMillis ?? 0);
              if (status.didJustFinish && !hasFinishedRef.current) {
                hasFinishedRef.current = true;
                setIsPlaying(false);
                setPositionMs(0);
              }
            }
          }
        );
        soundRef.current = sound;
      }
      setIsPlaying(true);
    }
  }, [uri, isPlaying]);

  const totalDuration = durationMs || 1;
  const progress = Math.min(positionMs / totalDuration, 1);
  const displayMs = isPlaying ? positionMs : durationMs;
  const accentColor = isOwn ? colors.primaryForeground : colors.primary;
  const trackColor = isOwn ? "rgba(255,255,255,0.25)" : (colors.secondary);

  return (
    <View style={styles.inlineVoiceRow}>
      <Pressable onPress={togglePlay} style={[styles.inlineVoicePlayBtn, isOwn && styles.inlineVoicePlayBtnOwn]}>
        {isPlaying
          ? <Pause size={14} color={isOwn ? colors.primary : colors.primaryForeground} />
          : <Play size={14} color={isOwn ? colors.primary : colors.primaryForeground} />
        }
      </Pressable>
      <View style={styles.inlineWaveformWrap}>
        {WAVEFORM_HEIGHTS.map((h, i) => {
          const barProgress = i / WAVEFORM_HEIGHTS.length;
          const filled = barProgress <= progress;
          return (
            <View
              key={i}
              style={[
                styles.inlineWaveBar,
                { height: h, backgroundColor: filled ? accentColor : trackColor },
              ]}
            />
          );
        })}
      </View>
      <Text style={[styles.inlineVoiceDuration, isOwn && styles.inlineVoiceDurationOwn]}>
        {formatVoiceDuration(displayMs)}
      </Text>
    </View>
  );
}

function ChatVoiceRecorder({ visible, onSend, onCancel }: {
  visible: boolean;
  onSend: (uri: string, durationMs: number) => void;
  onCancel: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [recState, setRecState] = useState<"idle" | "recording" | "preview">("idle");
  const [durationMs, setDurationMs] = useState(0);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackMs, setPlaybackMs] = useState(0);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasFinishedRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const stopAll = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    pulseLoopRef.current?.stop();
    pulseAnim.setValue(1);
    if (recordingRef.current) { recordingRef.current.stopAndUnloadAsync().catch(() => {}); recordingRef.current = null; }
    if (soundRef.current) { soundRef.current.unloadAsync().catch(() => {}); soundRef.current = null; }
    Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
  }, [pulseAnim]);

  useEffect(() => {
    if (!visible) {
      stopAll();
      setRecState("idle");
      setDurationMs(0);
      setRecordedUri(null);
      setRecordedDuration(0);
      setIsPlaying(false);
      setPlaybackMs(0);
    }
  }, [visible, stopAll]);

  useEffect(() => () => stopAll(), [stopAll]);

  const startRecording = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert("Permission needed", "Microphone access is required to record a voice message.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setRecState("recording");
      setDurationMs(0);
      if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      timerRef.current = setInterval(() => setDurationMs((d) => d + 100), 100);
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      pulseLoopRef.current.start();
    } catch {
      Alert.alert("Error", "Could not start recording. Please try again.");
    }
  }, [pulseAnim]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    pulseLoopRef.current?.stop();
    pulseAnim.setValue(1);
    const captured = durationMs;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      if (uri && captured > 400) {
        setRecordedUri(uri);
        setRecordedDuration(captured);
        setRecState("preview");
        if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setRecState("idle");
        setDurationMs(0);
      }
    } catch {
      setRecState("idle");
      setDurationMs(0);
    }
  }, [durationMs, pulseAnim]);

  const togglePreviewPlay = useCallback(async () => {
    if (!recordedUri) return;
    if (isPlaying) {
      await soundRef.current?.pauseAsync();
      setIsPlaying(false);
    } else {
      hasFinishedRef.current = false;
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(0);
        await soundRef.current.playAsync();
      } else {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
        const { sound } = await Audio.Sound.createAsync(
          { uri: recordedUri },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded) {
              setPlaybackMs(status.positionMillis ?? 0);
              if (status.didJustFinish && !hasFinishedRef.current) {
                hasFinishedRef.current = true;
                setIsPlaying(false);
                setPlaybackMs(0);
              }
            }
          }
        );
        soundRef.current = sound;
      }
      setIsPlaying(true);
    }
  }, [isPlaying, recordedUri]);

  const handleSend = useCallback(() => {
    if (!recordedUri) return;
    if (soundRef.current) { soundRef.current.unloadAsync().catch(() => {}); soundRef.current = null; }
    onSend(recordedUri, recordedDuration);
  }, [recordedUri, recordedDuration, onSend]);

  const handleDiscard = useCallback(() => {
    stopAll();
    setRecState("idle");
    setDurationMs(0);
    setRecordedUri(null);
    setRecordedDuration(0);
    setIsPlaying(false);
    setPlaybackMs(0);
    onCancel();
  }, [stopAll, onCancel]);

  const handleReRecord = useCallback(() => {
    stopAll();
    setRecState("idle");
    setDurationMs(0);
    setRecordedUri(null);
    setRecordedDuration(0);
    setIsPlaying(false);
    setPlaybackMs(0);
  }, [stopAll]);

  if (!visible) return null;

  const progress = recState === "preview" && recordedDuration > 0
    ? Math.min(playbackMs / recordedDuration, 1)
    : 0;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={handleDiscard}>
      <View style={styles.vrBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={recState === "idle" ? handleDiscard : undefined} />
        <View style={styles.vrSheet}>
          <View style={styles.vrHandle} />
          <View style={styles.vrHeader}>
            <Text style={styles.vrTitle}>Voice Message</Text>
            <Pressable onPress={handleDiscard} hitSlop={12} style={styles.vrCloseBtn}>
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {recState === "idle" && (
            <View style={styles.vrIdleBody}>
              <Text style={styles.vrHint}>Tap to start recording</Text>
              <Pressable onPress={startRecording} style={styles.vrBigMicBtn}>
                <Mic size={36} color={colors.primaryForeground} />
              </Pressable>
            </View>
          )}

          {recState === "recording" && (
            <View style={styles.vrRecordingBody}>
              <Animated.View style={[styles.vrPulseRing, { transform: [{ scale: pulseAnim }] }]} />
              <View style={styles.vrRecordingCenter}>
                <View style={styles.vrRedDot} />
                <Text style={styles.vrRecordingDuration}>{formatVoiceDuration(durationMs)}</Text>
              </View>
              <Text style={styles.vrRecordingHint}>Recording… tap to stop</Text>
              <Pressable onPress={stopRecording} style={styles.vrStopBtn}>
                <Square size={22} color={colors.primaryForeground} fill={colors.primaryForeground} />
              </Pressable>
            </View>
          )}

          {recState === "preview" && (
            <View style={styles.vrPreviewBody}>
              <View style={styles.vrPreviewPlayer}>
                <Pressable onPress={togglePreviewPlay} style={styles.vrPreviewPlayBtn}>
                  {isPlaying
                    ? <Pause size={22} color={colors.primaryForeground} />
                    : <Play size={22} color={colors.primaryForeground} />
                  }
                </Pressable>
                <View style={styles.vrPreviewTrackWrap}>
                  <View style={styles.vrPreviewTrack}>
                    <View style={[styles.vrPreviewFill, { width: `${Math.round(progress * 100)}%` }]} />
                  </View>
                  <Text style={styles.vrPreviewDuration}>{formatVoiceDuration(isPlaying ? playbackMs : recordedDuration)}</Text>
                </View>
              </View>
              <View style={styles.vrPreviewActions}>
                <Pressable onPress={handleReRecord} style={styles.vrDiscardBtn}>
                  <Text style={styles.vrDiscardText}>Re-record</Text>
                </Pressable>
                <Pressable onPress={handleSend} style={styles.vrSendBtn}>
                  <Send size={16} color={colors.primaryForeground} />
                  <Text style={styles.vrSendText}>Send</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function SharedPrayerCardView({ card }: { card: SharedPrayerCard }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const UPDATE_TAG_LABELS = useMemo(() => getUpdateTagLabels(colors), [colors]);
  const tagConfig = card.updateTag ? UPDATE_TAG_LABELS[card.updateTag] : null;
  return (
    <View style={styles.sharedCardWrap}>
      <View style={styles.sharedCardBar} />
      <View style={styles.sharedCardBody}>
        <View style={styles.sharedCardAuthorRow}>
          {card.authorAvatar ? (
            <Image
              source={{ uri: card.authorAvatar }}
              style={styles.sharedCardAvatar}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.sharedCardAvatar, styles.sharedCardAvatarFallback]}>
              <Text style={styles.sharedCardAvatarInitial}>
                {(card.authorName || "?").charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.sharedCardAuthorName} numberOfLines={1}>
              {card.authorName || "Someone"}
            </Text>
            <Text style={styles.sharedCardAuthorSub}>Prayer Request</Text>
          </View>
          {tagConfig && (
            <View style={[styles.sharedCardTag, { backgroundColor: tagConfig.bg }]}>
              <Text style={[styles.sharedCardTagText, { color: tagConfig.color }]}>
                {tagConfig.label}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.sharedCardContent} numberOfLines={3}>
          {card.postContent || "A prayer request"}
        </Text>
        <Text style={styles.sharedCardLabel}>🙏 Shared prayer update</Text>
      </View>
    </View>
  );
}

function SwipeableMessage({
  children,
  onReply,
}: {
  children: React.ReactNode;
  onReply: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const translateX = useRef(new Animated.Value(0)).current;
  const triggeredRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5 && gs.dx > 0,
      onPanResponderMove: (_, gs) => {
        const clamped = Math.min(Math.max(gs.dx, 0), 80);
        translateX.setValue(clamped);
        if (clamped >= 65 && !triggeredRef.current) {
          triggeredRef.current = true;
          if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx >= 65) onReply();
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 120,
          friction: 10,
        }).start();
        triggeredRef.current = false;
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        triggeredRef.current = false;
      },
    })
  ).current;

  const iconOpacity = translateX.interpolate({ inputRange: [0, 30, 70], outputRange: [0, 0.5, 1] });
  const iconScale = translateX.interpolate({ inputRange: [0, 40, 70], outputRange: [0.6, 0.85, 1] });

  return (
    <View style={{ overflow: "visible" }}>
      <Animated.View
        style={[
          styles.swipeReplyIcon,
          {
            position: "absolute",
            left: -44,
            top: "50%",
            marginTop: -18,
            opacity: iconOpacity,
            transform: [{ scale: iconScale }],
          },
        ]}
      >
        <Reply size={18} color={colors.primary} />
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

function QuoteView({ replyTo, isOwn, onPress }: { replyTo: ReplyTo; isOwn: boolean; onPress: () => void }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable onPress={onPress} style={[styles.quoteWrap, isOwn && styles.quoteWrapOwn]}>
      <View style={[styles.quoteBar, isOwn && styles.quoteBarOwn]} />
      <View style={styles.quoteBody}>
        <Text style={[styles.quoteSenderName, isOwn && styles.quoteSenderNameOwn]}>{replyTo.senderName}</Text>
        {replyTo.imageUrl && !replyTo.text
          ? <Text style={[styles.quoteText, isOwn && styles.quoteTextOwn]}>📷 Photo</Text>
          : <Text style={[styles.quoteText, isOwn && styles.quoteTextOwn]} numberOfLines={2}>{replyTo.text || "Message"}</Text>
        }
      </View>
      {replyTo.imageUrl && (
        <Image source={{ uri: replyTo.imageUrl }} style={styles.quoteThumb} contentFit="cover" />
      )}
    </Pressable>
  );
}

function EmojiReactions({ reactions, onPress }: { reactions?: MessageReaction[]; onPress?: (emoji: string) => void }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const emojiReactions = (reactions ?? []).filter((r) => r.type === "emoji" && r.emoji);
  if (emojiReactions.length === 0) return null;

  const counts: Record<string, { count: number; isMine: boolean }> = {};
  for (const r of emojiReactions) {
    const e = r.emoji!;
    if (!counts[e]) counts[e] = { count: 0, isMine: false };
    counts[e].count++;
    if (r.userId === "me") counts[e].isMine = true;
  }

  return (
    <View style={styles.emojiReactionRow}>
      {Object.entries(counts).map(([emoji, { count, isMine }]) => (
        <Pressable
          key={emoji}
          onPress={() => onPress?.(emoji)}
          style={[styles.emojiReactionBubble, isMine && styles.emojiReactionBubbleMine]}
        >
          <Text style={styles.emojiReactionEmoji}>{emoji}</Text>
          {count > 1 && <Text style={[styles.emojiReactionCount, isMine && styles.emojiReactionCountMine]}>{count}</Text>}
        </Pressable>
      ))}
    </View>
  );
}

function ReadReceipt({ readBy, totalMembers }: { readBy?: MessageRead[]; totalMembers: number }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const count = (readBy ?? []).length;
  const allRead = count >= totalMembers - 1;
  const someRead = count > 0;
  if (allRead) {
    return (
      <View style={styles.receiptRow}>
        <CheckCheck size={14} color={colors.primary} strokeWidth={2.5} />
      </View>
    );
  }
  if (someRead) {
    return (
      <View style={styles.receiptRow}>
        <CheckCheck size={14} color={colors.mutedForeground} strokeWidth={2} />
      </View>
    );
  }
  return (
    <View style={styles.receiptRow}>
      <Check size={14} color={colors.mutedForeground} strokeWidth={2} />
    </View>
  );
}

function PrayingReactions({ reactions }: { reactions?: MessageReaction[] }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const prayReactions = (reactions ?? []).filter((r) => r.type === "pray");
  if (prayReactions.length === 0) return null;
  const count = prayReactions.length;
  const displayNames = prayReactions.slice(0, 2).map((r) => r.userName);
  let label = "";
  if (count === 1) label = `${displayNames[0]} praying`;
  else if (count === 2) label = `${displayNames[0]} & ${displayNames[1]} praying`;
  else label = `${displayNames[0]}, ${displayNames[1]} & ${count - 2} more praying`;

  return (
    <View style={styles.prayReactionRow}>
      <View style={styles.prayAvatarStack}>
        {prayReactions.slice(0, 3).map((r, i) => (
          r.userAvatar ? (
            <Image
              key={r.userId}
              source={{ uri: r.userAvatar }}
              style={[styles.prayAvatar, { marginLeft: i === 0 ? 0 : -6, zIndex: 3 - i }]}
              contentFit="cover"
            />
          ) : (
            <View
              key={r.userId}
              style={[styles.prayAvatar, styles.prayAvatarFallback, { marginLeft: i === 0 ? 0 : -6, zIndex: 3 - i }]}
            >
              <Text style={styles.prayAvatarInitial}>{(r.userName || "?").charAt(0)}</Text>
            </View>
          )
        ))}
      </View>
      <Text style={styles.prayLabel}>🙏 {label}</Text>
    </View>
  );
}

function OwnMessage({ message, onImagePress, onLongPress, onReply, onScrollToMessage, onLayout }: {
  message: ChatMessage;
  onImagePress?: (uri: string) => void;
  onLongPress?: (msg: ChatMessage) => void;
  onReply?: (msg: ChatMessage) => void;
  onScrollToMessage?: (id: string) => void;
  onLayout?: (y: number) => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const hasText = (message.text ?? "").trim().length > 0;
  return (
    <SwipeableMessage onReply={() => onReply?.(message)}>
      <View
        style={styles.ownMessageWrap}
        onLayout={(e) => onLayout?.(e.nativeEvent.layout.y)}
      >
        {message.replyTo && (
          <QuoteView
            replyTo={message.replyTo}
            isOwn
            onPress={() => onScrollToMessage?.(message.replyTo!.id)}
          />
        )}
        {message.isVoice ? (
          <Pressable onLongPress={() => onLongPress?.(message)} delayLongPress={300} style={[styles.voiceBubble, styles.voiceBubbleOwn]}>
            <InlineVoicePlayer uri={message.audioUri} durationMs={message.audioDurationMs ?? 0} isOwn />
          </Pressable>
        ) : message.sharedPrayer ? (
          <Pressable
            onLongPress={() => onLongPress?.(message)}
            delayLongPress={300}
            style={styles.ownSharedBubble}
          >
            {hasText && <Text style={[styles.ownBubbleText, styles.ownSharedText]}>{message.text}</Text>}
            <SharedPrayerCardView card={message.sharedPrayer} />
          </Pressable>
        ) : (
          <Pressable
            onLongPress={() => onLongPress?.(message)}
            delayLongPress={300}
            style={[styles.ownBubble, message.imageUrl && styles.ownBubbleWithImage]}
          >
            {message.imageUrl && (
              <Pressable onPress={() => onImagePress?.(message.imageUrl!)} activeOpacity={0.88}>
                <Image source={{ uri: message.imageUrl }} style={styles.groupMsgImage} contentFit="cover" />
              </Pressable>
            )}
            {hasText && (
              <Text style={[styles.ownBubbleText, message.imageUrl && styles.groupBubbleTextWithImage]}>{message.text}</Text>
            )}
          </Pressable>
        )}
        <EmojiReactions reactions={message.reactions} />
        <PrayingReactions reactions={message.reactions} />
        <View style={styles.ownMeta}>
          <Text style={styles.ownTime}>{message.time}</Text>
          <ReadReceipt readBy={message.readBy} totalMembers={TOTAL_GROUP_MEMBERS} />
        </View>
      </View>
    </SwipeableMessage>
  );
}

function OtherMessage({ message, showHeader = true, onImagePress, onLongPress, onReply, onScrollToMessage, onLayout }: {
  message: ChatMessage;
  showHeader?: boolean;
  onImagePress?: (uri: string) => void;
  onLongPress?: (msg: ChatMessage) => void;
  onReply?: (msg: ChatMessage) => void;
  onScrollToMessage?: (id: string) => void;
  onLayout?: (y: number) => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <SwipeableMessage onReply={() => onReply?.(message)}>
      <View
        style={[styles.otherMessageWrap, !showHeader && styles.otherMessageGrouped]}
        onLayout={(e) => onLayout?.(e.nativeEvent.layout.y)}
      >
        {showHeader ? (
          <Image source={{ uri: message.senderAvatar }} style={styles.otherAvatar} />
        ) : (
          <View style={styles.otherAvatarSpacer} />
        )}
        <View style={styles.otherContent}>
          {showHeader && (
            <View style={styles.otherSenderRow}>
              <Text style={styles.otherSenderName}>{message.senderName}</Text>
              <Text style={styles.otherSenderTime}>· {message.time}</Text>
            </View>
          )}
          {message.replyTo && (
            <QuoteView
              replyTo={message.replyTo}
              isOwn={false}
              onPress={() => onScrollToMessage?.(message.replyTo!.id)}
            />
          )}
          {message.isVoice ? (
            <Pressable onLongPress={() => onLongPress?.(message)} delayLongPress={300} style={styles.voiceBubble}>
              <InlineVoicePlayer uri={message.audioUri} durationMs={message.audioDurationMs ?? 12000} isOwn={false} />
            </Pressable>
          ) : message.imageUrl ? (
            <Pressable
              onLongPress={() => onLongPress?.(message)}
              delayLongPress={300}
              style={[styles.otherBubble, styles.otherBubbleWithImage]}
            >
              <Pressable onPress={() => onImagePress?.(message.imageUrl!)} activeOpacity={0.88}>
                <Image source={{ uri: message.imageUrl }} style={styles.groupMsgImage} contentFit="cover" />
              </Pressable>
              {(message.text ?? "").trim().length > 0 && (
                <Text style={[styles.otherBubbleText, styles.groupBubbleTextWithImage]}>{message.text}</Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              onLongPress={() => onLongPress?.(message)}
              delayLongPress={300}
              style={styles.otherBubble}
            >
              <Text style={styles.otherBubbleText}>{message.text}</Text>
            </Pressable>
          )}
          <EmojiReactions reactions={message.reactions} />
          <PrayingReactions reactions={message.reactions} />
          {!showHeader && <Text style={styles.otherTime}>{message.time}</Text>}
        </View>
      </View>
    </SwipeableMessage>
  );
}

function MessageContextMenu({
  message,
  visible,
  onClose,
  onReply,
  onPray,
  onReact,
  onCopy,
  onDelete,
  onInfo,
  onReport,
}: {
  message: ChatMessage | null;
  visible: boolean;
  onClose: () => void;
  onReply: (msg: ChatMessage) => void;
  onPray: (id: string) => void;
  onReact: (id: string, emoji: string) => void;
  onCopy: (text: string) => void;
  onDelete: (id: string) => void;
  onInfo: (msg: ChatMessage) => void;
  onReport: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  React.useEffect(() => {
    if (!visible) setShowEmojiPicker(false);
  }, [visible]);

  if (!message) return null;
  const isOwn = message.isOwn;

  const ownActions = [
    { icon: <Reply size={20} color={colors.foreground} />, label: "Reply", onPress: () => { onReply(message); onClose(); } },
    { icon: <SmilePlus size={20} color={colors.foreground} />, label: "React", onPress: () => setShowEmojiPicker((v) => !v) },
    { icon: <Text style={styles.menuEmoji}>🙏</Text>, label: "Pray", onPress: () => onPray(message.id) },
    { icon: <Forward size={20} color={colors.foreground} />, label: "Forward", onPress: onClose },
    { icon: <Copy size={20} color={colors.foreground} />, label: "Copy", onPress: () => onCopy(message.text) },
    { icon: <Info size={20} color={colors.foreground} />, label: "Info", onPress: () => onInfo(message) },
    { icon: <Trash2 size={20} color="#E55" />, label: "Delete", labelStyle: { color: "#E55" }, onPress: () => onDelete(message.id) },
  ];
  const otherActions = [
    { icon: <Reply size={20} color={colors.foreground} />, label: "Reply", onPress: () => { onReply(message); onClose(); } },
    { icon: <SmilePlus size={20} color={colors.foreground} />, label: "React", onPress: () => setShowEmojiPicker((v) => !v) },
    { icon: <Text style={styles.menuEmoji}>🙏</Text>, label: "Pray", onPress: () => onPray(message.id) },
    { icon: <Forward size={20} color={colors.foreground} />, label: "Forward", onPress: onClose },
    { icon: <Copy size={20} color={colors.foreground} />, label: "Copy", onPress: () => onCopy(message.text) },
    { icon: <Flag size={20} color="#E55" />, label: "Report", labelStyle: { color: "#E55" }, onPress: onReport },
  ];
  const actions = isOwn ? ownActions : otherActions;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.menuSheet}>
          <View style={styles.menuHandle} />

          {/* Quick emoji reaction bar */}
          <View style={styles.quickEmojiBar}>
            {EMOJI_REACTIONS.map((emoji) => {
              const alreadyReacted = (message.reactions ?? []).some((r) => r.userId === "me" && r.type === "emoji" && r.emoji === emoji);
              return (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => { onReact(message.id, emoji); }}
                  style={[styles.quickEmojiBtn, alreadyReacted && styles.quickEmojiBtnActive]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickEmojiText}>{emoji}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {message.text ? (
            <View style={styles.menuPreviewBubble}>
              <Text style={styles.menuPreviewText} numberOfLines={3}>{message.text}</Text>
            </View>
          ) : null}

          <View style={styles.menuActions}>
            {actions.map((action, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.menuActionItem, action.label === "React" && showEmojiPicker && styles.menuActionItemActive]}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.menuActionIcon}>{action.icon}</View>
                <Text style={[styles.menuActionLabel, (action as any).labelStyle]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function MessageInfoSheet({
  message,
  visible,
  totalMembers,
  members,
  onClose,
}: {
  message: ChatMessage | null;
  visible: boolean;
  totalMembers: number;
  members: StoreGroupMember[];
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (!message) return null;
  const readBy = message.readBy ?? [];
  const readIds = new Set(readBy.map((r) => r.userId));
  const notSeen = members.filter((m) => !readIds.has(m.id));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.infoOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.infoSheet} onStartShouldSetResponder={() => true}>
          <View style={styles.infoHandle} />
          <View style={styles.infoHeaderRow}>
            <Text style={styles.infoTitle}>Message info</Text>
            <Pressable onPress={onClose} style={styles.infoCloseBtn} hitSlop={10}>
              <Text style={styles.infoCloseText}>✕</Text>
            </Pressable>
          </View>

          {readBy.length > 0 && (
            <>
              <Text style={styles.infoSectionLabel}>READ BY</Text>
              {readBy.map((r) => (
                <View key={r.userId} style={styles.infoUserRow}>
                  {r.userAvatar ? (
                    <Image source={{ uri: r.userAvatar }} style={styles.infoAvatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.infoAvatar, styles.infoAvatarFallback]}>
                      <Text style={styles.infoAvatarInitial}>{r.userName.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoUserName}>{r.userName}</Text>
                    <Text style={styles.infoUserTime}>{r.readAt}</Text>
                  </View>
                  <CheckCheck size={14} color={colors.primary} />
                </View>
              ))}
            </>
          )}

          {notSeen.length > 0 && (
            <>
              <Text style={[styles.infoSectionLabel, { marginTop: readBy.length > 0 ? 16 : 0 }]}>NOT YET SEEN</Text>
              {notSeen.map((m) => (
                <View key={m.id} style={styles.infoUserRow}>
                  <Image source={{ uri: m.avatar }} style={styles.infoAvatar} contentFit="cover" />
                  <Text style={styles.infoUserName}>{m.name}</Text>
                </View>
              ))}
            </>
          )}

          {readBy.length === 0 && notSeen.length === 0 && (
            <Text style={styles.infoEmpty}>No read data available yet.</Text>
          )}
          <View style={{ height: 32 }} />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

interface MediaItem {
  id: string;
  uri: string;
  senderName: string;
  time: string;
}

function MediaGallery({
  images,
  onImagePress,
}: {
  images: MediaItem[];
  onImagePress: (item: MediaItem) => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (images.length === 0) {
    return (
      <View style={styles.mediaEmpty}>
        <View style={styles.mediaEmptyIcon}>
          <ImageIcon size={32} color={colors.mutedForeground} />
        </View>
        <Text style={styles.mediaEmptyTitle}>No media yet</Text>
        <Text style={styles.mediaEmptySubtitle}>
          Images shared in this group will appear here
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={images}
      keyExtractor={(item) => item.id}
      numColumns={3}
      contentContainerStyle={styles.mediaGrid}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={styles.mediaHeader}>
          <Text style={styles.mediaHeaderTitle}>{images.length} Photos</Text>
          <Text style={styles.mediaHeaderSub}>Tap to view full screen</Text>
        </View>
      }
      renderItem={({ item, index }) => {
        const isLastInRow = (index + 1) % 3 === 0;
        return (
          <Pressable
            style={[
              styles.mediaThumb,
              !isLastInRow && { marginRight: 3 },
            ]}
            onPress={() => onImagePress(item)}
            testID={`media-thumb-${item.id}`}
          >
            <Image
              source={{ uri: item.uri }}
              style={styles.mediaThumbImage}
              contentFit="cover"
            />
            <View style={styles.mediaThumbOverlay}>
              <Text style={styles.mediaThumbTime} numberOfLines={1}>
                {item.time}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

function MemberActionsSheet({
  member,
  visible,
  onClose,
  onViewProfile,
  onMessage,
  onToggleAdmin,
  onToggleLeader,
  onRemove,
}: {
  member: Member | null;
  visible: boolean;
  onClose: () => void;
  onViewProfile: () => void;
  onMessage: () => void;
  onToggleAdmin: (m: Member) => void;
  onToggleLeader: (m: Member) => void;
  onRemove: (m: Member) => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (!member) return null;
  const isAdmin = member.role === "Admin";
  const isLeader = member.role === "Leader";

  type Action = {
    icon: React.ReactNode;
    label: string;
    labelColor?: string;
    onPress: () => void;
    separator?: boolean;
  };

  const actions: Action[] = [
    {
      icon: <UserPlus size={20} color={colors.foreground} />,
      label: "View Profile",
      onPress: () => { onViewProfile(); onClose(); },
    },
    {
      icon: <MessageSquare size={20} color={colors.foreground} />,
      label: "Message",
      onPress: () => { onMessage(); onClose(); },
    },
  ];

  if (IS_CURRENT_USER_ADMIN) {
    actions.push({
      icon: isAdmin
        ? <ShieldOff size={20} color={colors.foreground} />
        : <ShieldCheck size={20} color={colors.primary} />,
      label: isAdmin ? "Remove as Admin" : "Make Admin",
      separator: true,
      onPress: () => { onToggleAdmin(member); onClose(); },
    });
    actions.push({
      icon: isLeader
        ? <ShieldOff size={20} color={colors.foreground} />
        : <Shield size={20} color={colors.accentForeground} />,
      label: isLeader ? "Remove as Leader" : "Make Leader",
      onPress: () => { onToggleLeader(member); onClose(); },
    });
    actions.push({
      icon: <UserMinus size={20} color="#E55" />,
      label: "Remove from Group",
      labelColor: "#E55",
      onPress: () => {
        onClose();
        Alert.alert(
          "Remove Member",
          `Remove ${member.name} from this group?`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Remove", style: "destructive", onPress: () => onRemove(member) },
          ]
        );
      },
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.memberSheetOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.memberSheetCard, { backgroundColor: colors.card }]}>
          <View style={styles.memberSheetHandle} />

          {/* Member header */}
          <View style={styles.memberSheetHeader}>
            <Image source={{ uri: member.avatar }} style={styles.memberSheetAvatar} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.memberSheetName, { color: colors.foreground }]}>{member.name}</Text>
              <Text style={[styles.memberSheetRole, { color: colors.mutedForeground }]}>{member.role}</Text>
            </View>
            {member.isOnline && (
              <View style={[styles.memberSheetOnline, { backgroundColor: "#4CAF50" }]}>
                <Text style={styles.memberSheetOnlineText}>Online</Text>
              </View>
            )}
          </View>

          <View style={[styles.memberSheetDivider, { backgroundColor: colors.border }]} />

          {actions.map((action, i) => (
            <React.Fragment key={i}>
              {action.separator && i > 0 && (
                <View style={[styles.memberSheetDivider, { backgroundColor: colors.border }]} />
              )}
              <Pressable
                style={styles.memberSheetAction}
                onPress={action.onPress}
                android_ripple={{ color: colors.primary + "10" }}
              >
                {action.icon}
                <Text style={[styles.memberSheetActionLabel, { color: action.labelColor ?? colors.foreground }]}>
                  {action.label}
                </Text>
              </Pressable>
            </React.Fragment>
          ))}

          <View style={{ height: 24 }} />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function MediaViewer({
  item,
  visible,
  onClose,
}: {
  item: MediaItem | null;
  visible: boolean;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  if (!item) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "#000" }]}>
        {/* Full-screen image */}
        <Image
          source={{ uri: item.uri }}
          style={StyleSheet.absoluteFillObject}
          contentFit="contain"
        />

        {/* Close button */}
        <Pressable
          style={[mediaViewerStyles.closeBtn, { top: insets.top + 12 }]}
          onPress={onClose}
          hitSlop={12}
        >
          <X size={22} color="#fff" />
        </Pressable>

        {/* Footer with metadata */}
        <View style={[mediaViewerStyles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={mediaViewerStyles.senderName}>{item.senderName}</Text>
          <Text style={mediaViewerStyles.postedTime}>Posted at {item.time}</Text>
        </View>
      </View>
    </Modal>
  );
}

const mediaViewerStyles = StyleSheet.create({
  closeBtn: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  senderName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  postedTime: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
  },
});

function MemberRow({ member, onPress, onMore }: { member: Member; onPress?: () => void; onMore?: () => void }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isAdmin = member.role === "Admin";
  const isLeader = member.role === "Leader";

  const roleBg = isAdmin
    ? colors.primary + "18"
    : isLeader
    ? colors.accentForeground + "15"
    : colors.secondary;

  const roleColor = isAdmin
    ? colors.primary
    : isLeader
    ? colors.accentForeground
    : colors.mutedForeground;

  return (
    <Pressable style={styles.memberRow} onPress={onPress} android_ripple={{ color: colors.primary + "10" }}>
      <View style={styles.memberAvatarWrap}>
        <Image source={{ uri: member.avatar }} style={styles.memberAvatar} />
        {member.isOnline && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{member.name}</Text>
        {member.joinedDate && (
          <Text style={styles.memberJoined}>{member.joinedDate}</Text>
        )}
      </View>
      <View style={[styles.roleBadge, { backgroundColor: roleBg }]}>
        {isAdmin && <Crown size={10} color={roleColor} />}
        {isLeader && <Shield size={10} color={roleColor} />}
        <Text style={[styles.roleText, { color: roleColor }]}>{member.role}</Text>
      </View>
      <Pressable style={styles.memberMoreBtn} onPress={onMore} hitSlop={10}>
        <MoreHorizontal size={16} color={colors.mutedForeground} />
      </Pressable>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  banner: {
    height: 200,
    position: "relative" as const,
    justifyContent: "flex-end" as const,
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    opacity: 0.5,
  },
  backBtn: {
    position: "absolute" as const,
    top: 52,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  groupMenuRoot: {
    flex: 1,
    justifyContent: "flex-end" as const,
  },
  groupMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  groupMenuSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 44,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  groupMenuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center" as const,
    marginTop: 12,
    marginBottom: 12,
  },
  groupMenuGroupName: {
    fontSize: 13,
    fontWeight: "700" as const,
    letterSpacing: 0.2,
    textAlign: "center" as const,
    marginBottom: 8,
    opacity: 0.55,
  },
  menuPremiumBadge: { flexDirection: "row" as const, alignItems: "center" as const, gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: "center" as const, marginBottom: 4 },
  menuPremiumText: { fontSize: 12, fontWeight: "700" as const },
  menuOwnerText: { fontSize: 11, textAlign: "center" as const, marginBottom: 12 },
  premiumPill: { flexDirection: "row" as const, alignItems: "center" as const, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" as const, marginVertical: 3 },
  premiumPillText: { fontSize: 11, color: "#fff", fontWeight: "700" as const },
  groupMenuItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  groupMenuIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  groupMenuItemBody: {
    flex: 1,
  },
  groupMenuItemTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  groupMenuItemDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  groupMenuCancelBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  groupMenuCancelText: {
    fontSize: 14,
    fontWeight: "600" as const,
  },
  bannerBottom: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  groupIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.card,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  groupIconInner: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  groupName: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: colors.foreground,
    letterSpacing: -0.4,
  },
  groupStats: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontWeight: "600" as const,
    marginTop: 2,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  tabBar: {
    flexDirection: "row" as const,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  tabItem: {
    flex: 1,
    alignItems: "center" as const,
    paddingVertical: 14,
    position: "relative" as const,
  },
  tabLabelRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
  },
  tabBadge: {
    backgroundColor: colors.muted,
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 5,
  },
  tabBadgeActive: {
    backgroundColor: colors.primary + "20",
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: colors.mutedForeground,
    letterSpacing: 0.2,
  },
  tabBadgeTextActive: {
    color: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.mutedForeground,
  },
  tabTextActive: {
    color: colors.primary,
  },
  tabIndicator: {
    position: "absolute" as const,
    bottom: 0,
    left: 20,
    right: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  chatHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  chatBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  chatHeaderSub: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.mutedForeground,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  moreBtn: {
    padding: 2,
  },
  chatScroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 10,
  },
  dateDivider: {
    alignSelf: "center" as const,
    backgroundColor: colors.secondary + "80",
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border + "50",
    marginBottom: 4,
  },
  dateDividerText: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: colors.mutedForeground,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  ownMessageWrap: {
    alignSelf: "flex-end" as const,
    alignItems: "flex-end" as const,
    maxWidth: "90%",
    gap: 4,
  },
  ownBubble: {
    backgroundColor: colors.primary,
    borderRadius: 22,
    borderTopRightRadius: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  ownSharedBubble: {
    backgroundColor: colors.primary,
    borderRadius: 22,
    borderTopRightRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
    gap: 10,
  },
  ownSharedText: {
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  sharedCardWrap: {
    flexDirection: "row" as const,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  sharedCardBar: {
    width: 3,
    backgroundColor: colors.primaryForeground,
    opacity: 0.7,
  },
  sharedCardBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  sharedCardAuthorRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  sharedCardAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  sharedCardAvatarFallback: {
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  sharedCardAvatarInitial: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.primaryForeground,
  },
  sharedCardAuthorName: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.primaryForeground,
  },
  sharedCardAuthorSub: {
    fontSize: 9,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500" as const,
  },
  sharedCardTag: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sharedCardTagText: {
    fontSize: 9,
    fontWeight: "700" as const,
    letterSpacing: 0.2,
  },
  sharedCardContent: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 18,
    fontStyle: "italic" as const,
  },
  sharedCardLabel: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 0.3,
    textTransform: "uppercase" as const,
  },
  ownBubbleText: {
    fontSize: 14,
    color: colors.primaryForeground,
    lineHeight: 21,
    fontWeight: "500" as const,
  },
  ownMeta: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  ownTime: {
    fontSize: 10,
    color: colors.mutedForeground,
    fontWeight: "500" as const,
  },
  otherMessageWrap: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    alignSelf: "flex-start" as const,
    gap: 12,
    maxWidth: "90%",
  },
  otherMessageGrouped: {
    marginTop: -6,
  },
  otherAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  otherAvatarSpacer: {
    width: 40,
  },
  otherContent: {
    flex: 1,
    gap: 2,
  },
  otherSenderRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    marginLeft: 2,
    marginBottom: 2,
  },
  otherSenderName: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  otherSenderTime: {
    fontSize: 10,
    color: colors.mutedForeground,
    fontWeight: "500" as const,
  },
  otherBubble: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border + "60",
    borderRadius: 22,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  otherBubbleText: {
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 21,
  },
  otherTime: {
    fontSize: 10,
    color: colors.mutedForeground,
    fontWeight: "500" as const,
    marginLeft: 2,
    marginTop: 2,
  },
  voiceBubble: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border + "60",
    borderRadius: 22,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    width: 180,
  },
  voicePlayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  voiceWave: {
    flex: 1,
    height: 4,
    backgroundColor: colors.secondary,
    borderRadius: 2,
    overflow: "hidden" as const,
  },
  voiceBar: {
    width: "33%",
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  voiceDuration: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.mutedForeground,
  },
  chatInputOuter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  groupImagePreviewRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  chatInputBar: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    backgroundColor: colors.background,
  },
  groupMsgImage: {
    width: 200,
    height: 150,
    borderRadius: 14,
  },
  ownBubbleWithImage: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: "hidden" as const,
  },
  otherBubbleWithImage: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    overflow: "hidden" as const,
  },
  groupBubbleTextWithImage: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
  },
  chatInputWrap: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: colors.secondary + "70",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    minHeight: 46,
  },
  chatInput: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
    maxHeight: 90,
  },
  emojiBtn: {
    padding: 2,
  },
  chatSendBtn: {
    width: 46,
    height: 46,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  chatSendBtnActive: {
    backgroundColor: colors.primary,
  },
  membersScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  memberSearchWrap: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    marginBottom: 16,
  },
  memberSearchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
  },
  memberStats: {
    flexDirection: "row" as const,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 24,
    alignItems: "center" as const,
    justifyContent: "space-around" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  memberStatItem: {
    alignItems: "center" as const,
    flex: 1,
  },
  memberStatNum: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: colors.primary,
  },
  memberStatLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.mutedForeground,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  memberStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },
  memberSectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 8,
    marginTop: 4,
  },
  memberSectionTitle: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: colors.primary,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  memberRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "40",
  },
  memberAvatarWrap: {
    position: "relative" as const,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  onlineDot: {
    position: "absolute" as const,
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#B85A1D",
    borderWidth: 2,
    borderColor: colors.background,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.foreground,
  },
  memberJoined: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontWeight: "500" as const,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "800" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  memberMoreBtn: {
    padding: 4,
  },
  memberSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end" as const,
  },
  memberSheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  memberSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center" as const,
    marginTop: 12,
    marginBottom: 16,
  },
  memberSheetHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    marginBottom: 16,
  },
  memberSheetAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  memberSheetName: {
    fontSize: 16,
    fontWeight: "700" as const,
    marginBottom: 2,
  },
  memberSheetRole: {
    fontSize: 13,
  },
  memberSheetOnline: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  memberSheetOnlineText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600" as const,
  },
  memberSheetDivider: {
    height: 1,
    marginBottom: 8,
  },
  memberSheetAction: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    paddingVertical: 13,
  },
  memberSheetActionLabel: {
    fontSize: 15,
    fontWeight: "500" as const,
  },
  mediaGrid: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  mediaHeader: {
    paddingVertical: 16,
  },
  mediaHeaderTitle: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  mediaHeaderSub: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  mediaThumb: {
    width: MEDIA_THUMB_SIZE,
    height: MEDIA_THUMB_SIZE,
    marginBottom: 3,
    borderRadius: 8,
    overflow: "hidden" as const,
    backgroundColor: colors.muted,
  },
  mediaThumbImage: {
    width: "100%",
    height: "100%",
  },
  mediaThumbOverlay: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  mediaThumbTime: {
    fontSize: 9,
    fontWeight: "600" as const,
    color: "#fff",
  },
  mediaEmpty: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  mediaEmptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.muted,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 16,
  },
  mediaEmptyTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: colors.foreground,
    marginBottom: 6,
    textAlign: "center" as const,
  },
  mediaEmptySubtitle: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center" as const,
    lineHeight: 20,
  },
  receiptRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  prayReactionRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 4,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prayAvatarStack: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  prayAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fff",
  },
  prayAvatarFallback: {
    backgroundColor: colors.primary + "20",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  prayAvatarInitial: {
    fontSize: 8,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  prayLabel: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "600" as const,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end" as const,
  },
  menuSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 36,
    paddingHorizontal: 20,
  },
  menuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center" as const,
    marginBottom: 16,
  },
  menuPreviewBubble: {
    backgroundColor: colors.secondary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuPreviewText: {
    fontSize: 13,
    color: colors.foreground,
    lineHeight: 19,
  },
  menuActions: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    justifyContent: "center" as const,
  },
  menuActionItem: {
    alignItems: "center" as const,
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 64,
  },
  menuActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  menuEmoji: {
    fontSize: 18,
  },
  menuActionLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.foreground,
    textAlign: "center" as const,
  },
  infoOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end" as const,
  },
  infoSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: "75%",
  },
  infoHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center" as const,
    marginBottom: 16,
  },
  infoHeaderRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  infoCloseBtn: {
    padding: 6,
  },
  infoCloseText: {
    fontSize: 16,
    color: colors.mutedForeground,
  },
  infoSectionLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: colors.mutedForeground,
    textTransform: "uppercase" as const,
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  infoUserRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "40",
  },
  infoAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoAvatarFallback: {
    backgroundColor: colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  infoAvatarInitial: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  infoUserName: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.foreground,
  },
  infoUserTime: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 1,
  },
  infoEmpty: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center" as const,
    paddingVertical: 24,
  },

  swipeReplyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + "18",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: 4,
    flexShrink: 0,
  },

  quoteWrap: {
    flexDirection: "row" as const,
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: "hidden" as const,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.border + "60",
    maxWidth: "100%",
  },
  quoteWrapOwn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.25)",
  },
  quoteBar: {
    width: 3,
    backgroundColor: colors.primary,
  },
  quoteBarOwn: {
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  quoteBody: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
  },
  quoteSenderName: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: colors.primary,
  },
  quoteSenderNameOwn: {
    color: "rgba(255,255,255,0.9)",
  },
  quoteText: {
    fontSize: 12,
    color: colors.mutedForeground,
    lineHeight: 17,
  },
  quoteTextOwn: {
    color: "rgba(255,255,255,0.65)",
  },
  quoteThumb: {
    width: 44,
    height: 44,
  },

  emojiReactionRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 4,
    marginTop: 4,
  },
  emojiReactionBubble: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emojiReactionBubbleMine: {
    backgroundColor: colors.primary + "18",
    borderColor: colors.primary + "50",
  },
  emojiReactionEmoji: {
    fontSize: 14,
  },
  emojiReactionCount: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.mutedForeground,
  },
  emojiReactionCountMine: {
    color: colors.primary,
  },

  replyBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: colors.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  replyBannerBar: {
    width: 3,
    height: "100%",
    minHeight: 28,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  replyBannerBody: {
    flex: 1,
    gap: 1,
  },
  replyBannerName: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: colors.primary,
  },
  replyBannerText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  replyBannerClose: {
    padding: 4,
  },
  replyBannerCloseText: {
    fontSize: 16,
    color: colors.mutedForeground,
  },

  quickEmojiBar: {
    flexDirection: "row" as const,
    justifyContent: "space-around" as const,
    alignItems: "center" as const,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  quickEmojiBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: "transparent",
  },
  quickEmojiBtnActive: {
    backgroundColor: colors.primary + "22",
    transform: [{ scale: 1.2 }],
  },
  quickEmojiText: {
    fontSize: 22,
  },
  menuActionItemActive: {
    backgroundColor: colors.primary + "15",
    borderColor: colors.primary + "40",
  },

  voiceBubbleOwn: {
    backgroundColor: colors.primary,
    borderColor: "transparent",
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 6,
  },
  inlineVoiceRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  inlineVoicePlayBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  inlineVoicePlayBtnOwn: {
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  inlineWaveformWrap: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 2,
    height: 24,
  },
  inlineWaveBar: {
    width: 3,
    borderRadius: 2,
  },
  inlineVoiceDuration: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.mutedForeground,
    minWidth: 28,
    textAlign: "right" as const,
  },
  inlineVoiceDurationOwn: {
    color: "rgba(255,255,255,0.8)",
  },

  vrBackdrop: {
    flex: 1,
    justifyContent: "flex-end" as const,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  vrSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    minHeight: 260,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  vrHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center" as const,
    marginBottom: 18,
  },
  vrHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 32,
  },
  vrTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: colors.foreground,
  },
  vrCloseBtn: {
    padding: 4,
  },
  vrIdleBody: {
    alignItems: "center" as const,
    gap: 20,
    paddingBottom: 8,
  },
  vrHint: {
    fontSize: 14,
    color: colors.mutedForeground,
    fontWeight: "500" as const,
  },
  vrBigMicBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  vrRecordingBody: {
    alignItems: "center" as const,
    gap: 16,
    paddingBottom: 8,
  },
  vrPulseRing: {
    position: "absolute" as const,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary + "25",
  },
  vrRecordingCenter: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    marginTop: 16,
  },
  vrRedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E84040",
  },
  vrRecordingDuration: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: colors.foreground,
    letterSpacing: 1,
    fontVariant: ["tabular-nums"] as const,
  },
  vrRecordingHint: {
    fontSize: 13,
    color: colors.mutedForeground,
    fontWeight: "500" as const,
  },
  vrStopBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    marginTop: 8,
  },
  vrPreviewBody: {
    gap: 28,
    paddingBottom: 8,
  },
  vrPreviewPlayer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  vrPreviewPlayBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  vrPreviewTrackWrap: {
    flex: 1,
    gap: 8,
  },
  vrPreviewTrack: {
    height: 6,
    backgroundColor: colors.secondary,
    borderRadius: 3,
    overflow: "hidden" as const,
  },
  vrPreviewFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  vrPreviewDuration: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.mutedForeground,
  },
  vrPreviewActions: {
    flexDirection: "row" as const,
    gap: 12,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  vrDiscardBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center" as const,
  },
  vrDiscardText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.mutedForeground,
  },
  vrSendBtn: {
    flex: 2,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  vrSendText: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.primaryForeground,
  },
});
