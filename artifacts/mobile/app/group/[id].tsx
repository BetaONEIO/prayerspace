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
}

interface Member {
  id: string;
  name: string;
  avatar: string;
  role: "Admin" | "Leader" | "Member";
  isOnline: boolean;
  joinedDate?: string;
}

const CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "cm1",
    senderId: "alice",
    senderName: "Alice Thompson",
    senderAvatar: "https://randomuser.me/api/portraits/women/62.jpg",
    text: "Amen! Standing with you, Sarah. The Lord is your strength during this surgery.",
    time: "9:12 AM",
    isOwn: false,
  },
  {
    id: "cm2",
    senderId: "me",
    senderName: "Me",
    senderAvatar: "https://randomuser.me/api/portraits/women/44.jpg",
    text: "Thank you so much Alice. It means the world to have this community.",
    time: "9:18 AM",
    isOwn: true,
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
  const injectedRef = useRef<boolean>(false);

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
  const chatScrollRef = useRef<ScrollView>(null);

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
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");
    setGroupImageUri(null);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [chatInput, groupImageUri]);

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
                <OwnMessage key={msg.id} message={msg} onImagePress={setViewingGroupImage} />
              ) : (
                <OtherMessage key={msg.id} message={msg} onImagePress={setViewingGroupImage} />
              )
            )}
          </ScrollView>

          <View style={styles.chatInputOuter}>
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

function OwnMessage({ message, onImagePress }: { message: ChatMessage; onImagePress?: (uri: string) => void }) {
  const hasText = (message.text ?? "").trim().length > 0;
  if (message.sharedPrayer) {
    return (
      <View style={styles.ownMessageWrap}>
        <View style={styles.ownSharedBubble}>
          {hasText && (
            <Text style={[styles.ownBubbleText, styles.ownSharedText]}>
              {message.text}
            </Text>
          )}
          <SharedPrayerCardView card={message.sharedPrayer} />
        </View>
        <View style={styles.ownMeta}>
          <Text style={styles.ownTime}>{message.time}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.ownMessageWrap}>
      <View style={[styles.ownBubble, message.imageUrl && styles.ownBubbleWithImage]}>
        {message.imageUrl && (
          <Pressable onPress={() => onImagePress?.(message.imageUrl!)} activeOpacity={0.88}>
            <Image source={{ uri: message.imageUrl }} style={styles.groupMsgImage} contentFit="cover" />
          </Pressable>
        )}
        {hasText && (
          <Text style={[styles.ownBubbleText, message.imageUrl && styles.groupBubbleTextWithImage]}>{message.text}</Text>
        )}
      </View>
      <View style={styles.ownMeta}>
        <Text style={styles.ownTime}>{message.time}</Text>
      </View>
    </View>
  );
}

function OtherMessage({ message, onImagePress }: { message: ChatMessage; onImagePress?: (uri: string) => void }) {
  return (
    <View style={styles.otherMessageWrap}>
      <Image source={{ uri: message.senderAvatar }} style={styles.otherAvatar} />
      <View style={styles.otherContent}>
        <Text style={styles.otherSenderName}>{message.senderName}</Text>
        {message.isVoice ? (
          <View style={styles.voiceBubble}>
            <Pressable style={styles.voicePlayBtn}>
              <Text style={{ fontSize: 14 }}>▶</Text>
            </Pressable>
            <View style={styles.voiceWave}>
              <View style={styles.voiceBar} />
            </View>
            <Text style={styles.voiceDuration}>0:12</Text>
          </View>
        ) : message.imageUrl ? (
          <View style={[styles.otherBubble, styles.otherBubbleWithImage]}>
            <Pressable onPress={() => onImagePress?.(message.imageUrl!)} activeOpacity={0.88}>
              <Image source={{ uri: message.imageUrl }} style={styles.groupMsgImage} contentFit="cover" />
            </Pressable>
            {(message.text ?? "").trim().length > 0 && (
              <Text style={[styles.otherBubbleText, styles.groupBubbleTextWithImage]}>{message.text}</Text>
            )}
          </View>
        ) : (
          <View style={styles.otherBubble}>
            <Text style={styles.otherBubbleText}>{message.text}</Text>
          </View>
        )}
        <Text style={styles.otherTime}>{message.time}</Text>
      </View>
    </View>
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
});
