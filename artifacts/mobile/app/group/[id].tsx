import React, { useState, useCallback, useRef, useMemo } from "react";
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
  Settings,
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
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { LightColors as Colors } from "@/constants/colors";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";

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

const UPDATE_TAG_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  still_need_prayer: { label: "Still need prayer", bg: Colors.accent, color: Colors.primary },
  answered: { label: "Answered 🙌", bg: "#E8F8F0", color: "#1A7A52" },
  thank_you: { label: "Thank you", bg: "#EEF2FF", color: "#6366F1" },
  in_progress: { label: "In progress", bg: "#FFF8E7", color: "#B87A00" },
};

export default function GroupDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    pendingSharedMessage?: string;
    sharedAuthorName?: string;
    sharedAuthorAvatar?: string;
    sharedPostContent?: string;
    sharedUpdateTag?: string;
  }>();
  const { id } = params;
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<GroupTab>("Chat");

  const [chatInput, setChatInput] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(CHAT_MESSAGES);
  const [memberSearch, setMemberSearch] = useState<string>("");
  const [groupImageUri, setGroupImageUri] = useState<string | null>(null);
  const [viewingGroupImage, setViewingGroupImage] = useState<string | null>(null);
  const [contextMsg, setContextMsg] = useState<ChatMessage | null>(null);
  const [infoMsg, setInfoMsg] = useState<ChatMessage | null>(null);
  const [replyingTo, setReplyingTo] = useState<ReplyTo | null>(null);
  const msgPositionsRef = useRef<Map<string, number>>(new Map());
  const injectedRef = useRef<boolean>(false);
  const chatScrollRef = useRef<ScrollView>(null);

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

  const filteredMembers = MEMBERS.filter((m) =>
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
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      {!isChatTab && (
        <View style={[styles.banner, { paddingTop: insets.top + 12 }]}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80",
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
                <Users size={24} color={Colors.primary} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.groupName}>Grace Community</Text>
              <Text style={styles.groupStats}>128 Members · Active Now</Text>
            </View>
            <Pressable style={styles.settingsBtn}>
              <Settings size={18} color={Colors.foreground} />
            </Pressable>
          </View>
        </View>
      )}

      {isChatTab && (
        <View style={[styles.chatHeader, { paddingTop: insets.top }]}>
          <Pressable style={styles.chatBackBtn} onPress={() => router.back()}>
            <ChevronLeft size={20} color={Colors.foreground} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.chatHeaderName}>Grace Community</Text>
            <Text style={styles.chatHeaderSub}>128 Members · 12 Active</Text>
          </View>
          <Pressable style={styles.settingsBtn}>
            <Settings size={18} color={Colors.foreground} />
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
            {chatMessages.map((msg) =>
              msg.isOwn ? (
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
                  onImagePress={setViewingGroupImage}
                  onLongPress={handleLongPress}
                  onReply={handleReply}
                  onScrollToMessage={handleScrollToMessage}
                  onLayout={(y) => msgPositionsRef.current.set(msg.id, y)}
                />
              )
            )}
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
                placeholderTextColor={Colors.mutedForeground}
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
              onPress={handleSendMessage}
            >
              {(chatInput.trim().length > 0 || !!groupImageUri) ? (
                <Send size={18} color={Colors.primaryForeground} />
              ) : (
                <Mic size={20} color={Colors.primaryForeground} />
              )}
            </Pressable>
          </View>
          </View>

          <ImageViewer
            uri={viewingGroupImage}
            visible={!!viewingGroupImage}
            onClose={() => setViewingGroupImage(null)}
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
        totalMembers={TOTAL_GROUP_MEMBERS}
        onClose={() => setInfoMsg(null)}
      />

      {activeTab === "Media" && (
        <MediaGallery
          images={allMediaImages}
          onImagePress={setViewingGroupImage}
        />
      )}

      {activeTab === "Members" && (
        <ScrollView
          contentContainerStyle={styles.membersScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.memberSearchWrap}>
            <Search size={16} color={Colors.mutedForeground} />
            <TextInput
              style={styles.memberSearchInput}
              placeholder="Search members..."
              placeholderTextColor={Colors.mutedForeground}
              value={memberSearch}
              onChangeText={setMemberSearch}
            />
          </View>

          <View style={styles.memberStats}>
            <View style={styles.memberStatItem}>
              <Text style={styles.memberStatNum}>128</Text>
              <Text style={styles.memberStatLabel}>Total</Text>
            </View>
            <View style={styles.memberStatDivider} />
            <View style={styles.memberStatItem}>
              <Text style={styles.memberStatNum}>
                {MEMBERS.filter((m) => m.isOnline).length}
              </Text>
              <Text style={styles.memberStatLabel}>Online</Text>
            </View>
            <View style={styles.memberStatDivider} />
            <View style={styles.memberStatItem}>
              <Text style={styles.memberStatNum}>
                {MEMBERS.filter((m) => m.role === "Admin" || m.role === "Leader").length}
              </Text>
              <Text style={styles.memberStatLabel}>Leaders</Text>
            </View>
          </View>

          {admins.length > 0 && (
            <>
              <View style={styles.memberSectionHeader}>
                <Crown size={14} color={Colors.primary} />
                <Text style={styles.memberSectionTitle}>Admins</Text>
              </View>
              {admins.map((member) => (
                <MemberRow key={member.id} member={member} />
              ))}
            </>
          )}

          {leaders.length > 0 && (
            <>
              <View style={styles.memberSectionHeader}>
                <Shield size={14} color={Colors.accentForeground} />
                <Text style={[styles.memberSectionTitle, { color: Colors.accentForeground }]}>
                  Leaders
                </Text>
              </View>
              {leaders.map((member) => (
                <MemberRow key={member.id} member={member} />
              ))}
            </>
          )}

          {members.length > 0 && (
            <>
              <View style={styles.memberSectionHeader}>
                <Users size={14} color={Colors.mutedForeground} />
                <Text style={[styles.memberSectionTitle, { color: Colors.mutedForeground }]}>
                  Members
                </Text>
              </View>
              {members.map((member) => (
                <MemberRow key={member.id} member={member} />
              ))}
            </>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

function SharedPrayerCardView({ card }: { card: SharedPrayerCard }) {
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
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Animated.View style={[styles.swipeReplyIcon, { opacity: iconOpacity, transform: [{ scale: iconScale }] }]}>
        <Reply size={18} color={Colors.primary} />
      </Animated.View>
      <Animated.View style={{ flex: 1, transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

function QuoteView({ replyTo, isOwn, onPress }: { replyTo: ReplyTo; isOwn: boolean; onPress: () => void }) {
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
  const count = (readBy ?? []).length;
  const allRead = count >= totalMembers - 1;
  const someRead = count > 0;
  if (allRead) {
    return (
      <View style={styles.receiptRow}>
        <CheckCheck size={14} color={Colors.primary} strokeWidth={2.5} />
      </View>
    );
  }
  if (someRead) {
    return (
      <View style={styles.receiptRow}>
        <CheckCheck size={14} color={Colors.mutedForeground} strokeWidth={2} />
      </View>
    );
  }
  return (
    <View style={styles.receiptRow}>
      <Check size={14} color={Colors.mutedForeground} strokeWidth={2} />
    </View>
  );
}

function PrayingReactions({ reactions }: { reactions?: MessageReaction[] }) {
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
        {message.sharedPrayer ? (
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

function OtherMessage({ message, onImagePress, onLongPress, onReply, onScrollToMessage, onLayout }: {
  message: ChatMessage;
  onImagePress?: (uri: string) => void;
  onLongPress?: (msg: ChatMessage) => void;
  onReply?: (msg: ChatMessage) => void;
  onScrollToMessage?: (id: string) => void;
  onLayout?: (y: number) => void;
}) {
  return (
    <SwipeableMessage onReply={() => onReply?.(message)}>
      <View
        style={styles.otherMessageWrap}
        onLayout={(e) => onLayout?.(e.nativeEvent.layout.y)}
      >
        <Image source={{ uri: message.senderAvatar }} style={styles.otherAvatar} />
        <View style={styles.otherContent}>
          <Text style={styles.otherSenderName}>{message.senderName}</Text>
          {message.replyTo && (
            <QuoteView
              replyTo={message.replyTo}
              isOwn={false}
              onPress={() => onScrollToMessage?.(message.replyTo!.id)}
            />
          )}
          {message.isVoice ? (
            <Pressable onLongPress={() => onLongPress?.(message)} delayLongPress={300} style={styles.voiceBubble}>
              <Pressable style={styles.voicePlayBtn}>
                <Text style={{ fontSize: 14 }}>▶</Text>
              </Pressable>
              <View style={styles.voiceWave}>
                <View style={styles.voiceBar} />
              </View>
              <Text style={styles.voiceDuration}>0:12</Text>
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
          <Text style={styles.otherTime}>{message.time}</Text>
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  React.useEffect(() => {
    if (!visible) setShowEmojiPicker(false);
  }, [visible]);

  if (!message) return null;
  const isOwn = message.isOwn;

  const ownActions = [
    { icon: <Reply size={20} color={Colors.foreground} />, label: "Reply", onPress: () => { onReply(message); onClose(); } },
    { icon: <SmilePlus size={20} color={Colors.foreground} />, label: "React", onPress: () => setShowEmojiPicker((v) => !v) },
    { icon: <Text style={styles.menuEmoji}>🙏</Text>, label: "Pray", onPress: () => onPray(message.id) },
    { icon: <Forward size={20} color={Colors.foreground} />, label: "Forward", onPress: onClose },
    { icon: <Copy size={20} color={Colors.foreground} />, label: "Copy", onPress: () => onCopy(message.text) },
    { icon: <Info size={20} color={Colors.foreground} />, label: "Info", onPress: () => onInfo(message) },
    { icon: <Trash2 size={20} color="#E55" />, label: "Delete", labelStyle: { color: "#E55" }, onPress: () => onDelete(message.id) },
  ];
  const otherActions = [
    { icon: <Reply size={20} color={Colors.foreground} />, label: "Reply", onPress: () => { onReply(message); onClose(); } },
    { icon: <SmilePlus size={20} color={Colors.foreground} />, label: "React", onPress: () => setShowEmojiPicker((v) => !v) },
    { icon: <Text style={styles.menuEmoji}>🙏</Text>, label: "Pray", onPress: () => onPray(message.id) },
    { icon: <Forward size={20} color={Colors.foreground} />, label: "Forward", onPress: onClose },
    { icon: <Copy size={20} color={Colors.foreground} />, label: "Copy", onPress: () => onCopy(message.text) },
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
  onClose,
}: {
  message: ChatMessage | null;
  visible: boolean;
  totalMembers: number;
  onClose: () => void;
}) {
  if (!message) return null;
  const readBy = message.readBy ?? [];
  const readIds = new Set(readBy.map((r) => r.userId));
  const notSeen = MEMBERS.filter((m) => !readIds.has(m.id));

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
                  <CheckCheck size={14} color={Colors.primary} />
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
  onImagePress: (uri: string) => void;
}) {
  if (images.length === 0) {
    return (
      <View style={styles.mediaEmpty}>
        <View style={styles.mediaEmptyIcon}>
          <ImageIcon size={32} color={Colors.mutedForeground} />
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
            onPress={() => onImagePress(item.uri)}
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

function MemberRow({ member }: { member: Member }) {
  const isAdmin = member.role === "Admin";
  const isLeader = member.role === "Leader";

  const roleBg = isAdmin
    ? Colors.primary + "18"
    : isLeader
    ? Colors.accentForeground + "15"
    : Colors.secondary;

  const roleColor = isAdmin
    ? Colors.primary
    : isLeader
    ? Colors.accentForeground
    : Colors.mutedForeground;

  return (
    <View style={styles.memberRow}>
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
      <Pressable style={styles.memberMoreBtn}>
        <MoreHorizontal size={16} color={Colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.card,
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
    backgroundColor: Colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  groupName: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.4,
  },
  groupStats: {
    fontSize: 11,
    color: Colors.mutedForeground,
    fontWeight: "600" as const,
    marginTop: 2,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  tabBar: {
    flexDirection: "row" as const,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.muted,
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 5,
  },
  tabBadgeActive: {
    backgroundColor: Colors.primary + "20",
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: "800" as const,
    color: Colors.mutedForeground,
    letterSpacing: 0.2,
  },
  tabBadgeTextActive: {
    color: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.mutedForeground,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  tabIndicator: {
    position: "absolute" as const,
    bottom: 0,
    left: 20,
    right: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  chatHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  chatBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.3,
  },
  chatHeaderSub: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.mutedForeground,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  moreBtn: {
    padding: 2,
  },
  chatScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 16,
  },
  dateDivider: {
    alignSelf: "center" as const,
    backgroundColor: Colors.secondary + "80",
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border + "50",
    marginBottom: 4,
  },
  dateDividerText: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: Colors.mutedForeground,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  ownMessageWrap: {
    alignItems: "flex-end" as const,
    gap: 4,
  },
  ownBubble: {
    backgroundColor: Colors.primary,
    borderRadius: 22,
    borderTopRightRadius: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    maxWidth: "82%",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  ownSharedBubble: {
    backgroundColor: Colors.primary,
    borderRadius: 22,
    borderTopRightRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    maxWidth: "86%",
    shadowColor: Colors.primary,
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
    backgroundColor: Colors.primaryForeground,
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
    color: Colors.primaryForeground,
  },
  sharedCardAuthorName: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.primaryForeground,
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
    color: Colors.primaryForeground,
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
    color: Colors.mutedForeground,
    fontWeight: "500" as const,
  },
  otherMessageWrap: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    gap: 10,
    maxWidth: "85%",
  },
  otherAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  otherContent: {
    flex: 1,
    gap: 4,
  },
  otherSenderName: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: Colors.primary,
    marginLeft: 2,
  },
  otherBubble: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border + "60",
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
    color: Colors.foreground,
    lineHeight: 21,
  },
  otherTime: {
    fontSize: 10,
    color: Colors.mutedForeground,
    fontWeight: "500" as const,
    marginLeft: 2,
  },
  voiceBubble: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border + "60",
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
    backgroundColor: Colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  voiceWave: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.secondary,
    borderRadius: 2,
    overflow: "hidden" as const,
  },
  voiceBar: {
    width: "33%",
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  voiceDuration: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.mutedForeground,
  },
  chatInputOuter: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.secondary + "70",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    minHeight: 46,
  },
  chatInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.foreground,
    maxHeight: 90,
  },
  emojiBtn: {
    padding: 2,
  },
  chatSendBtn: {
    width: 46,
    height: 46,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  chatSendBtnActive: {
    backgroundColor: Colors.primary,
  },
  membersScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  memberSearchWrap: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    marginBottom: 16,
  },
  memberSearchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.foreground,
  },
  memberStats: {
    flexDirection: "row" as const,
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
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
    color: Colors.primary,
  },
  memberStatLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.mutedForeground,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  memberStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
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
    color: Colors.primary,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  memberRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "40",
  },
  memberAvatarWrap: {
    position: "relative" as const,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.border,
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
    borderColor: Colors.background,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.foreground,
  },
  memberJoined: {
    fontSize: 11,
    color: Colors.mutedForeground,
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
    color: Colors.foreground,
    letterSpacing: -0.3,
  },
  mediaHeaderSub: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  mediaThumb: {
    width: MEDIA_THUMB_SIZE,
    height: MEDIA_THUMB_SIZE,
    marginBottom: 3,
    borderRadius: 8,
    overflow: "hidden" as const,
    backgroundColor: Colors.muted,
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
    backgroundColor: Colors.muted,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 16,
  },
  mediaEmptyTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: Colors.foreground,
    marginBottom: 6,
    textAlign: "center" as const,
  },
  mediaEmptySubtitle: {
    fontSize: 13,
    color: Colors.mutedForeground,
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
    backgroundColor: "#FFF6F0",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#F5D9C8",
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
    backgroundColor: Colors.primary + "30",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  prayAvatarInitial: {
    fontSize: 8,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  prayLabel: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "600" as const,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end" as const,
  },
  menuSheet: {
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.border,
    alignSelf: "center" as const,
    marginBottom: 16,
  },
  menuPreviewBubble: {
    backgroundColor: Colors.secondary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuPreviewText: {
    fontSize: 13,
    color: Colors.foreground,
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
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 64,
  },
  menuActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  menuEmoji: {
    fontSize: 18,
  },
  menuActionLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: Colors.foreground,
    textAlign: "center" as const,
  },
  infoOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end" as const,
  },
  infoSheet: {
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.border,
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
    color: Colors.foreground,
    letterSpacing: -0.3,
  },
  infoCloseBtn: {
    padding: 6,
  },
  infoCloseText: {
    fontSize: 16,
    color: Colors.mutedForeground,
  },
  infoSectionLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: Colors.mutedForeground,
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
    borderBottomColor: Colors.border + "40",
  },
  infoAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoAvatarFallback: {
    backgroundColor: Colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  infoAvatarInitial: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  infoUserName: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.foreground,
  },
  infoUserTime: {
    fontSize: 11,
    color: Colors.mutedForeground,
    marginTop: 1,
  },
  infoEmpty: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: "center" as const,
    paddingVertical: 24,
  },

  swipeReplyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + "18",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: 4,
    flexShrink: 0,
  },

  quoteWrap: {
    flexDirection: "row" as const,
    backgroundColor: Colors.card,
    borderRadius: 12,
    overflow: "hidden" as const,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: Colors.border + "60",
    maxWidth: "100%",
  },
  quoteWrapOwn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.25)",
  },
  quoteBar: {
    width: 3,
    backgroundColor: Colors.primary,
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
    color: Colors.primary,
  },
  quoteSenderNameOwn: {
    color: "rgba(255,255,255,0.9)",
  },
  quoteText: {
    fontSize: 12,
    color: Colors.mutedForeground,
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
    backgroundColor: Colors.card,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emojiReactionBubbleMine: {
    backgroundColor: Colors.primary + "18",
    borderColor: Colors.primary + "50",
  },
  emojiReactionEmoji: {
    fontSize: 14,
  },
  emojiReactionCount: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: Colors.mutedForeground,
  },
  emojiReactionCountMine: {
    color: Colors.primary,
  },

  replyBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.secondary,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  replyBannerBar: {
    width: 3,
    height: "100%",
    minHeight: 28,
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  replyBannerBody: {
    flex: 1,
    gap: 1,
  },
  replyBannerName: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: Colors.primary,
  },
  replyBannerText: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  replyBannerClose: {
    padding: 4,
  },
  replyBannerCloseText: {
    fontSize: 16,
    color: Colors.mutedForeground,
  },

  quickEmojiBar: {
    flexDirection: "row" as const,
    justifyContent: "space-around" as const,
    alignItems: "center" as const,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.primary + "22",
    transform: [{ scale: 1.2 }],
  },
  quickEmojiText: {
    fontSize: 22,
  },
  menuActionItemActive: {
    backgroundColor: Colors.primary + "15",
    borderColor: Colors.primary + "40",
  },
});
