import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import {
  ChevronLeft,
  MoreVertical,
  Send,
  HandHeart,
  BellOff,
  Bell,
  ShieldAlert,
  UserX,
  Trash2,
  Pencil,
  Check,
  CheckCheck,
  X,
  Reply,
  Forward,
  Copy,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import {
  isUUID,
  getOrCreateDMConversation,
  formatMessageTime,
  canDeleteForEveryone,
  REACTION_OPTIONS,
  type Message,
  type ReactionType,
} from "@/lib/chat";
import { allContacts, chatMessages } from "@/mocks/data";
import ImageAttachment from "@/components/ImageAttachment";
import ImageViewer from "@/components/ImageViewer";
import { uploadPostImage } from "@/lib/storage";
import PrayerRequestCard, { type PrayerCardMeta } from "@/components/PrayerRequestCard";

const REACTION_COLORS: Record<ReactionType, string> = {
  pray: "#FFF0E6",
  amen: "#EEF2FF",
  support: "#FFF0F0",
};

const getReactionActiveColors = (colors: ThemeColors): Record<ReactionType, string> => ({
  pray: colors.primary,
  amen: "#6366F1",
  support: "#E55",
});

export default function ChatScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const REACTION_ACTIVE_COLORS = useMemo(() => getReactionActiveColors(colors), [colors]);
  const router = useRouter();
  const { id, autoMessage } = useLocalSearchParams<{
    id: string;
    autoMessage?: string;
  }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);

  const [inputText, setInputText] = useState("");
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [headerMenuVisible, setHeaderMenuVisible] = useState(false);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState<
    string | null
  >(null);
  const [prayerShareVisible, setPrayerShareVisible] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isImageUploading, setIsImageUploading] = useState<boolean>(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; senderName: string; content: string } | null>(null);
  const [mockExtraMessages, setMockExtraMessages] = useState<Message[]>([]);
  const [mockReactions, setMockReactions] = useState<Record<string, { reaction_type: ReactionType; user_id: string }[]>>({});
  const contextSlide = useRef(new Animated.Value(400)).current;
  const headerMenuSlide = useRef(new Animated.Value(300)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const isRealUser = useMemo(() => isUUID(id ?? ""), [id]);
  const currentUserId = user?.id ?? "";

  const convQuery = useQuery({
    queryKey: ["dm-conv", currentUserId, id],
    queryFn: async () => {
      if (!currentUserId || !id) throw new Error("Missing IDs");
      const convId = await getOrCreateDMConversation(currentUserId, id);
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", id)
        .single();
      return {
        convId,
        otherName: profile?.full_name ?? "Prayer Partner",
        otherAvatar: profile?.avatar_url ?? null,
      };
    },
    enabled: isRealUser && !!currentUserId && !!id,
    retry: 1,
  });

  const conversationId = convQuery.data?.convId;

  const messagesQuery = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*, message_reactions(*)")
        .eq("conversation_id", conversationId!)
        .eq("deleted_for_everyone", false)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) {
        console.error("[Chat] Messages fetch error:", error.message);
        throw error;
      }
      return (data ?? []) as Message[];
    },
    enabled: !!conversationId,
  });

  const blockedQuery = useQuery({
    queryKey: ["blocked", currentUserId, id],
    queryFn: async () => {
      const { data } = await supabase
        .from("blocked_users")
        .select("*")
        .eq("blocker_id", currentUserId)
        .eq("blocked_id", id)
        .maybeSingle();
      return !!data;
    },
    enabled: isRealUser && !!currentUserId && !!id,
  });

  useEffect(() => {
    if (!conversationId) return;
    console.log("[Chat] Subscribing to real-time messages for", conversationId.slice(0, 8));
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: ["messages", conversationId],
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: ["messages", conversationId],
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  useEffect(() => {
    if (isRealUser || !autoMessage) return;
    const raw = Array.isArray(autoMessage) ? autoMessage[0] : autoMessage;
    const parts = raw.split("\n\n");
    const mainText = parts[0] ?? raw;
    setInputText(mainText);
  }, [autoMessage, isRealUser]);

  const sendMutation = useMutation({
    mutationFn: async ({
      content,
      type = "text",
      prayerContent,
      image_url,
      image_path,
      reply_to,
    }: {
      content: string;
      type?: "text" | "prayer_share";
      prayerContent?: string;
      image_url?: string | null;
      image_path?: string | null;
      reply_to?: { id: string; senderName: string; content: string } | null;
    }) => {
      const insertData: Record<string, unknown> = {
        conversation_id: conversationId,
        sender_id: currentUserId,
        content,
        type,
        prayer_request_content: prayerContent ?? null,
        is_edited: false,
        deleted_for_everyone: false,
        deleted_for_sender: false,
      };
      if (image_url) insertData.image_url = image_url;
      if (image_path) insertData.image_path = image_path;
      if (reply_to) insertData.reply_to = reply_to;
      const { error } = await supabase.from("messages").insert(insertData);
      if (error) throw error;
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    },
    onError: (e) => console.error("[Chat] Send error:", e),
  });

  const editMutation = useMutation({
    mutationFn: async ({ messageId, content }: { messageId: string; content: string }) => {
      const { error } = await supabase
        .from("messages")
        .update({
          content,
          is_edited: true,
          edited_at: new Date().toISOString(),
        })
        .eq("id", messageId)
        .eq("sender_id", currentUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      setEditingMessage(null);
      setEditText("");
    },
  });

  const deleteForMeMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("messages")
        .update({ deleted_for_sender: true })
        .eq("id", messageId)
        .eq("sender_id", currentUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });

  const deleteForEveryoneMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("messages")
        .update({ deleted_for_everyone: true })
        .eq("id", messageId)
        .eq("sender_id", currentUserId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });

  const reactMutation = useMutation({
    mutationFn: async ({
      messageId,
      reactionType,
    }: {
      messageId: string;
      reactionType: ReactionType;
    }) => {
      const existing = messagesQuery.data
        ?.find((m) => m.id === messageId)
        ?.message_reactions?.find(
          (r) => r.user_id === currentUserId && r.reaction_type === reactionType
        );

      if (existing) {
        const { error } = await supabase
          .from("message_reactions")
          .delete()
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("message_reactions").upsert({
          message_id: messageId,
          user_id: currentUserId,
          reaction_type: reactionType,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });

  const blockMutation = useMutation({
    mutationFn: async () => {
      if (blockedQuery.data) {
        const { error } = await supabase
          .from("blocked_users")
          .delete()
          .eq("blocker_id", currentUserId)
          .eq("blocked_id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blocked_users").insert({
          blocker_id: currentUserId,
          blocked_id: id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blocked", currentUserId, id] });
      closeHeaderMenu();
    },
  });



  const openContextMenu = useCallback((msg: Message) => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMessage(msg);
    setContextMenuVisible(true);
    Animated.parallel([
      Animated.spring(contextSlide, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [contextSlide, overlayOpacity]);

  const closeContextMenu = useCallback(() => {
    Animated.parallel([
      Animated.timing(contextSlide, { toValue: 400, duration: 250, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setContextMenuVisible(false);
      setSelectedMessage(null);
      setReactionPickerMessageId(null);
    });
  }, [contextSlide, overlayOpacity]);

  const openHeaderMenu = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setHeaderMenuVisible(true);
    Animated.parallel([
      Animated.spring(headerMenuSlide, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [headerMenuSlide, overlayOpacity]);

  const closeHeaderMenu = useCallback(() => {
    Animated.parallel([
      Animated.timing(headerMenuSlide, { toValue: 300, duration: 250, useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setHeaderMenuVisible(false));
  }, [headerMenuSlide, overlayOpacity]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text && !imageUri) return;
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    let uploadedUrl: string | null = null;
    let uploadedPath: string | null = null;

    if (imageUri && isRealUser && currentUserId) {
      setIsImageUploading(true);
      setImageUploadError(null);
      try {
        const result = await uploadPostImage(currentUserId, imageUri);
        uploadedUrl = result.url;
        uploadedPath = result.path;
      } catch (e) {
        console.error("[Chat] Image upload failed:", e);
        setIsImageUploading(false);
        setImageUploadError("Upload failed. Tap retry or remove.");
        return;
      }
      setIsImageUploading(false);
    }

    if (!isRealUser) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMockExtraMessages((prev) => [
        ...prev,
        {
          id: `mock-sent-${Date.now()}`,
          conversation_id: "mock",
          sender_id: "user-1",
          content: text || "",
          type: "text" as const,
          prayer_request_content: null,
          image_url: imageUri ?? null,
          image_path: null,
          is_edited: false,
          edited_at: null,
          deleted_for_everyone: false,
          deleted_for_sender: false,
          created_at: timeStr,
          message_reactions: [],
        },
      ]);
      setInputText("");
      setImageUri(null);
      setImageUploadError(null);
      setReplyingTo(null);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      return;
    }

    if (isRealUser && conversationId) {
      sendMutation.mutate({
        content: text || "",
        image_url: uploadedUrl,
        image_path: uploadedPath,
        reply_to: replyingTo ? { id: replyingTo.id, senderName: replyingTo.senderName, content: replyingTo.content } : null,
      });
    }
    setInputText("");
    setImageUri(null);
    setImageUploadError(null);
    setReplyingTo(null);
  }, [inputText, imageUri, isRealUser, currentUserId, conversationId, sendMutation, replyingTo]);

  const handleSharePrayer = useCallback((prayerText: string) => {
    if (!conversationId) return;
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    sendMutation.mutate({
      content: "I'm praying for you 🙏",
      type: "prayer_share",
      prayerContent: prayerText,
    });
    setPrayerShareVisible(false);
  }, [conversationId, sendMutation]);

  const handleEditSave = useCallback(() => {
    if (!editingMessage || !editText.trim()) return;
    editMutation.mutate({ messageId: editingMessage.id, content: editText.trim() });
  }, [editingMessage, editText, editMutation]);

  const handleDeleteForMe = useCallback(() => {
    if (!selectedMessage) return;
    closeContextMenu();
    deleteForMeMutation.mutate(selectedMessage.id);
  }, [selectedMessage, closeContextMenu, deleteForMeMutation]);

  const handleDeleteForEveryone = useCallback(() => {
    if (!selectedMessage) return;
    closeContextMenu();
    deleteForEveryoneMutation.mutate(selectedMessage.id);
  }, [selectedMessage, closeContextMenu, deleteForEveryoneMutation]);

  const handleStartEdit = useCallback(() => {
    if (!selectedMessage) return;
    closeContextMenu();
    setTimeout(() => {
      setEditText(selectedMessage.content);
      setEditingMessage(selectedMessage);
    }, 300);
  }, [selectedMessage, closeContextMenu]);

  const handleReact = useCallback(
    (messageId: string, reactionType: ReactionType) => {
      if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (!isRealUser) {
        const MOCK_USER_ID = "user-1";
        setMockReactions((prev) => {
          const existing = prev[messageId] ?? [];
          const alreadyReacted = existing.some(
            (r) => r.reaction_type === reactionType && r.user_id === MOCK_USER_ID
          );
          return {
            ...prev,
            [messageId]: alreadyReacted
              ? existing.filter((r) => !(r.reaction_type === reactionType && r.user_id === MOCK_USER_ID))
              : [...existing, { reaction_type: reactionType, user_id: MOCK_USER_ID }],
          };
        });
      } else {
        reactMutation.mutate({ messageId, reactionType });
      }
      setReactionPickerMessageId(null);
      if (contextMenuVisible) closeContextMenu();
    },
    [isRealUser, reactMutation, contextMenuVisible, closeContextMenu]
  );

  const handleBlock = useCallback(() => {
    const isCurrentlyBlocked = blockedQuery.data;
    const otherName = convQuery.data?.otherName ?? "this user";
    Alert.alert(
      isCurrentlyBlocked ? "Unblock User" : "Block User",
      isCurrentlyBlocked
        ? `Allow messages from ${otherName} again?`
        : `Block ${otherName}? They won't be able to message you.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isCurrentlyBlocked ? "Unblock" : "Block",
          style: isCurrentlyBlocked ? "default" : "destructive",
          onPress: () => blockMutation.mutate(),
        },
      ]
    );
  }, [blockedQuery.data, convQuery.data?.otherName, blockMutation]);

  const handleReport = useCallback(() => {
    closeHeaderMenu();
    setTimeout(() => {
      Alert.alert(
        "Report User",
        "Thank you for helping keep Prayer Space safe. Our team will review this report.",
        [{ text: "OK" }]
      );
    }, 300);
  }, [closeHeaderMenu]);

  const handleMuteToggle = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setIsMuted((prev) => !prev);
    closeHeaderMenu();
  }, [closeHeaderMenu]);

  const handleReply = useCallback((msg: Message) => {
    closeContextMenu();
    setTimeout(() => {
      const isMine = msg.sender_id === currentUserId || (!isRealUser && msg.sender_id === "user-1");
      setReplyingTo({
        id: msg.id,
        senderName: isMine ? "You" : (convQuery.data?.otherName ?? "them"),
        content: msg.content,
      });
    }, 300);
  }, [closeContextMenu, currentUserId, isRealUser, convQuery.data?.otherName]);

  const handleCopy = useCallback(() => {
    if (!selectedMessage) return;
    closeContextMenu();
    void Clipboard.setStringAsync(selectedMessage.content).catch(() => {});
  }, [selectedMessage, closeContextMenu]);

  const handleForward = useCallback(() => {
    if (!selectedMessage) return;
    closeContextMenu();
    setTimeout(() => {
      Alert.alert("Forward message", "Forwarding is coming soon.", [{ text: "OK" }]);
    }, 300);
  }, [selectedMessage, closeContextMenu]);

  const mockContact = useMemo(
    () => (!isRealUser ? allContacts.find((c) => c.id === id) : null),
    [isRealUser, id]
  );

  const otherName = isRealUser
    ? convQuery.data?.otherName ?? "Loading..."
    : mockContact?.name ?? "Prayer Partner";

  const otherAvatar = isRealUser
    ? convQuery.data?.otherAvatar
    : mockContact?.avatar;

  const messages: Message[] = useMemo(() => {
    if (!isRealUser) {
      const base = chatMessages.map((m) => {
        const raw = m as Record<string, unknown>;
        return {
          id: raw.id as string,
          conversation_id: "mock",
          sender_id: (raw.senderId ?? raw.sender_id ?? "") as string,
          content: (raw.text ?? raw.content ?? "") as string,
          type: "text" as const,
          prayer_request_content: null,
          image_url: null,
          image_path: null,
          is_edited: false,
          edited_at: null,
          deleted_for_everyone: false,
          deleted_for_sender: false,
          created_at: (raw.time ?? "") as string,
          message_reactions: [],
        };
      });
      return [...base, ...mockExtraMessages];
    }
    return (
      messagesQuery.data?.filter(
        (m) => !(m.sender_id === currentUserId && m.deleted_for_sender)
      ) ?? []
    );
  }, [isRealUser, messagesQuery.data, currentUserId, mockExtraMessages]);

  const isBlocked = blockedQuery.data ?? false;

  const renderReactions = useCallback(
    (msg: Message) => {
      const localReactions = mockReactions[msg.id] ?? [];
      const allReactions = [...(msg.message_reactions ?? []), ...localReactions];
      if (!allReactions.length) return null;
      const MOCK_USER_ID = "user-1";
      const effectiveUserId = isRealUser ? currentUserId : MOCK_USER_ID;
      const grouped: Partial<Record<ReactionType, { count: number; isMine: boolean }>> = {};
      for (const r of allReactions) {
        if (!grouped[r.reaction_type]) grouped[r.reaction_type] = { count: 0, isMine: false };
        grouped[r.reaction_type]!.count += 1;
        if (r.user_id === effectiveUserId) grouped[r.reaction_type]!.isMine = true;
      }
      return (
        <View style={styles.reactionsRow}>
          {REACTION_OPTIONS.map(({ type, emoji }) => {
            const data = grouped[type];
            if (!data) return null;
            return (
              <Pressable
                key={type}
                style={[
                  styles.reactionPill,
                  data.isMine && { backgroundColor: REACTION_COLORS[type], borderColor: REACTION_ACTIVE_COLORS[type] },
                ]}
                onPress={() => handleReact(msg.id, type)}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                <Text
                  style={[
                    styles.reactionCount,
                    data.isMine && { color: REACTION_ACTIVE_COLORS[type] },
                  ]}
                >
                  {data.count}
                </Text>
              </Pressable>
            );
          })}
        </View>
      );
    },
    [currentUserId, isRealUser, mockReactions, handleReact]
  );

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => {
      const isMine = item.sender_id === currentUserId || (!isRealUser && item.sender_id === "user-1");
      const prevItem = index > 0 ? messages[index - 1] : null;
      const isFirstInGroup = !prevItem || prevItem.sender_id !== item.sender_id;

      const avatarEl = !isMine ? (
        isFirstInGroup ? (
          otherAvatar
            ? <Image source={{ uri: otherAvatar }} style={styles.dmAvatar} />
            : <View style={[styles.dmAvatar, styles.dmAvatarFallback]}>
                <Text style={styles.dmAvatarInitial}>{otherName.charAt(0).toUpperCase()}</Text>
              </View>
        ) : <View style={styles.dmAvatarSpacer} />
      ) : null;

      if (item.type === "prayer_share") {
        let cardMeta: PrayerCardMeta = {};
        if (item.prayer_request_content) {
          try {
            cardMeta = JSON.parse(item.prayer_request_content) as PrayerCardMeta;
          } catch {
            cardMeta = { preview_text: item.prayer_request_content };
          }
        }
        const bubble = (
          <Pressable
            onLongPress={() => openContextMenu(item)}
            style={[styles.msgRow, isMine ? styles.msgRowRight : styles.msgRowLeft]}
          >
            <PrayerRequestCard
              meta={cardMeta}
              rawContent={item.content}
              isMine={isMine}
              onReply={() => handleReply(item)}
            />
            <View style={[styles.timeRow, isMine && styles.timeRowRight]}>
              <Text style={styles.msgTime}>{formatMessageTime(item.created_at)}</Text>
              {isMine && <CheckCheck size={12} color={colors.primary} />}
            </View>
            {renderReactions(item)}
          </Pressable>
        );
        if (!isMine) {
          return (
            <View style={[styles.dmIncomingOuter, !isFirstInGroup && styles.dmMsgGrouped]}>
              {avatarEl}
              {bubble}
            </View>
          );
        }
        return bubble;
      }

      const hasImage = !!item.image_url;
      const hasText = (item.content ?? "").trim().length > 0;
      const msgReplyTo = (item as Message & { reply_to?: { senderName: string; content: string } }).reply_to;

      if (!isMine) {
        return (
          <View style={[styles.dmIncomingOuter, !isFirstInGroup && styles.dmMsgGrouped]}>
            {avatarEl}
            <Pressable
              onLongPress={() => openContextMenu(item)}
              style={[styles.msgRow, styles.msgRowLeft]}
            >
              {msgReplyTo && (
                <View style={styles.quoteWrap}>
                  <View style={styles.quoteBar} />
                  <View style={styles.quoteBody}>
                    <Text style={styles.quoteSenderName}>{msgReplyTo.senderName}</Text>
                    <Text style={styles.quoteText} numberOfLines={2}>{msgReplyTo.content}</Text>
                  </View>
                </View>
              )}
              <View style={[styles.bubble, styles.bubbleTheirs, hasImage && styles.bubbleWithImage]}>
                {hasImage && (
                  <Pressable onPress={() => setViewingImage(item.image_url!)} activeOpacity={0.88}>
                    <Image source={{ uri: item.image_url! }} style={styles.msgImage} contentFit="cover" />
                  </Pressable>
                )}
                {hasText && (
                  <Text style={[styles.bubbleText, styles.bubbleTextTheirs, hasImage && styles.bubbleTextWithImage]}>
                    {item.content}
                  </Text>
                )}
                {item.is_edited && (
                  <Text style={[styles.editedLabel, styles.editedLabelTheirs]}>edited</Text>
                )}
              </View>
              <View style={styles.timeRow}>
                <Text style={styles.msgTime}>
                  {isRealUser ? formatMessageTime(item.created_at) : item.created_at}
                </Text>
              </View>
              {renderReactions(item)}
            </Pressable>
          </View>
        );
      }

      return (
        <Pressable
          onLongPress={() => openContextMenu(item)}
          style={[styles.msgRow, styles.msgRowRight, !isFirstInGroup && styles.dmMsgGrouped]}
        >
          {msgReplyTo && (
            <View style={[styles.quoteWrap, styles.quoteWrapOwn]}>
              <View style={[styles.quoteBar, styles.quoteBarOwn]} />
              <View style={styles.quoteBody}>
                <Text style={[styles.quoteSenderName, styles.quoteSenderNameOwn]}>
                  {msgReplyTo.senderName}
                </Text>
                <Text style={[styles.quoteText, styles.quoteTextOwn]} numberOfLines={2}>
                  {msgReplyTo.content}
                </Text>
              </View>
            </View>
          )}
          <View style={[
            styles.bubble,
            styles.bubbleMine,
            hasImage && styles.bubbleWithImage,
          ]}>
            {hasImage && (
              <Pressable onPress={() => setViewingImage(item.image_url!)} activeOpacity={0.88}>
                <Image source={{ uri: item.image_url! }} style={styles.msgImage} contentFit="cover" />
              </Pressable>
            )}
            {hasText && (
              <Text style={[
                styles.bubbleText,
                styles.bubbleTextMine,
                hasImage && styles.bubbleTextWithImage,
              ]}>
                {item.content}
              </Text>
            )}
            {item.is_edited && (
              <Text style={[styles.editedLabel, styles.editedLabelMine]}>edited</Text>
            )}
          </View>
          <View style={[styles.timeRow, styles.timeRowRight]}>
            <Text style={styles.msgTime}>
              {isRealUser ? formatMessageTime(item.created_at) : item.created_at}
            </Text>
            <CheckCheck size={12} color={colors.primary} />
          </View>
          {renderReactions(item)}
        </Pressable>
      );
    },
    [currentUserId, isRealUser, openContextMenu, renderReactions, handleReply, colors, messages, otherAvatar, otherName]
  );

  const isLoading = isRealUser && (convQuery.isLoading || messagesQuery.isLoading);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={18} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatarWrap}>
            {otherAvatar ? (
              <Image source={{ uri: otherAvatar }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
                <Text style={styles.headerAvatarInitial}>
                  {otherName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View>
            <Text style={styles.headerName}>{otherName}</Text>
            {isMuted && (
              <Text style={styles.mutedLabel}>🔕 Muted</Text>
            )}
          </View>
        </View>
        {isRealUser && (
          <Pressable style={styles.headerMenuBtn} onPress={openHeaderMenu}>
            <MoreVertical size={20} color={colors.foreground} />
          </Pressable>
        )}
      </View>

      {isBlocked && (
        <View style={styles.blockedBanner}>
          <Text style={styles.blockedBannerText}>
            You've blocked this user. They cannot message you.
          </Text>
          <Pressable onPress={handleBlock}>
            <Text style={styles.blockedBannerAction}>Unblock</Text>
          </Pressable>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {isLoading ? (
          <View style={[styles.loadingState, styles.flex]}>
            <Text style={styles.loadingText}>Opening conversation...</Text>
          </View>
        ) : convQuery.isError ? (
          <View style={[styles.loadingState, styles.flex]}>
            <Text style={styles.errorText}>Could not load conversation.</Text>
            <Pressable onPress={() => convQuery.refetch()} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            style={styles.flex}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <View style={styles.emptyChatIcon}>
                  <Text style={styles.emptyChatEmoji}>🙏</Text>
                </View>
                <Text style={styles.emptyChatTitle}>Start the conversation</Text>
                <Text style={styles.emptyChatSub}>
                  Send a prayer or encouragement to get started.
                </Text>
              </View>
            }
          />
        )}

        {editingMessage ? (
          <SafeAreaView edges={["bottom"]} style={styles.editingBar}>
            <View style={styles.editingHeader}>
              <Pencil size={14} color={colors.primary} />
              <Text style={styles.editingLabel}>Editing message</Text>
              <Pressable onPress={() => { setEditingMessage(null); setEditText(""); }}>
                <X size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <View style={styles.editInputRow}>
              <TextInput
                style={styles.editInput}
                value={editText}
                onChangeText={setEditText}
                autoFocus
                multiline
                placeholderTextColor={colors.mutedForeground + "80"}
              />
              <Pressable
                style={[styles.editSaveBtn, !editText.trim() && styles.editSaveBtnDisabled]}
                onPress={handleEditSave}
                disabled={!editText.trim()}
              >
                <Check size={18} color={colors.primaryForeground} />
              </Pressable>
            </View>
          </SafeAreaView>
        ) : (
          <SafeAreaView edges={["bottom"]} style={styles.inputAreaWrap}>
            {replyingTo && (
              <View style={styles.replyBanner}>
                <View style={styles.replyBannerBar} />
                <View style={styles.replyBannerBody}>
                  <Text style={styles.replyBannerName}>{replyingTo.senderName}</Text>
                  <Text style={styles.replyBannerText} numberOfLines={1}>{replyingTo.content}</Text>
                </View>
                <Pressable onPress={() => setReplyingTo(null)} style={styles.replyBannerClose} hitSlop={12}>
                  <X size={14} color={colors.mutedForeground} />
                </Pressable>
              </View>
            )}
            {imageUri && (
              <View style={styles.imagePreviewRow}>
                <ImageAttachment
                  imageUri={imageUri}
                  onImageSelected={setImageUri}
                  onRemove={() => { setImageUri(null); setImageUploadError(null); }}
                  isUploading={isImageUploading}
                  uploadError={imageUploadError}
                  onRetry={() => void handleSend()}
                />
              </View>
            )}
            <View style={styles.inputArea}>
              <Pressable
                style={styles.addBtn}
                onPress={() => isRealUser && setPrayerShareVisible(true)}
              >
                <HandHeart size={20} color={colors.primary} />
              </Pressable>
              <ImageAttachment
                imageUri={null}
                onImageSelected={(uri) => { setImageUri(uri); setImageUploadError(null); }}
                onRemove={() => {}}
                disabled={isBlocked}
              />
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Type a message..."
                  placeholderTextColor={colors.mutedForeground + "80"}
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={() => void handleSend()}
                  returnKeyType="send"
                  multiline
                  editable={!isBlocked}
                />
              </View>
              <Pressable
                style={[styles.sendBtn, (!inputText.trim() && !imageUri) && styles.sendBtnDisabled]}
                onPress={() => void handleSend()}
                disabled={(!inputText.trim() && !imageUri) || isBlocked}
              >
                <Send size={18} color={colors.primaryForeground} />
              </Pressable>
            </View>
          </SafeAreaView>
        )}
      </KeyboardAvoidingView>

      {/* Context Menu */}
      <Modal visible={contextMenuVisible} transparent animationType="none" onRequestClose={closeContextMenu}>
        <Animated.View style={[styles.modalOverlay, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.flatten(styles.modalOverlay)} onPress={closeContextMenu} />
          <Animated.View
            style={[styles.contextSheet, { transform: [{ translateY: contextSlide }] }]}
          >
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetSectionLabel}>React</Text>
            <View style={styles.reactionPickerRow}>
              {REACTION_OPTIONS.map(({ type, emoji, label }) => (
                <Pressable
                  key={type}
                  style={styles.reactionPickerBtn}
                  onPress={() => selectedMessage && handleReact(selectedMessage.id, type)}
                >
                  <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
                  <Text style={styles.reactionPickerLabel}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.sheetDivider} />

            <Pressable style={styles.sheetOption} onPress={() => selectedMessage && handleReply(selectedMessage)}>
              <View style={[styles.sheetOptionIcon, { backgroundColor: colors.accent }]}>
                <Reply size={16} color={colors.primary} />
              </View>
              <Text style={styles.sheetOptionText}>Reply</Text>
            </Pressable>

            {selectedMessage?.content ? (
              <Pressable style={styles.sheetOption} onPress={handleCopy}>
                <View style={[styles.sheetOptionIcon, { backgroundColor: colors.secondary }]}>
                  <Copy size={16} color={colors.foreground} />
                </View>
                <Text style={styles.sheetOptionText}>Copy text</Text>
              </Pressable>
            ) : null}

            <Pressable style={styles.sheetOption} onPress={handleForward}>
              <View style={[styles.sheetOptionIcon, { backgroundColor: colors.secondary }]}>
                <Forward size={16} color={colors.foreground} />
              </View>
              <Text style={styles.sheetOptionText}>Forward</Text>
            </Pressable>

            <View style={styles.sheetDivider} />

            {selectedMessage &&
              (selectedMessage.sender_id === currentUserId || (!isRealUser && selectedMessage.sender_id === "user-1")) && (
                <>
                  <Pressable style={styles.sheetOption} onPress={handleStartEdit}>
                    <View style={[styles.sheetOptionIcon, { backgroundColor: "#EEF2FF" }]}>
                      <Pencil size={16} color="#6366F1" />
                    </View>
                    <Text style={styles.sheetOptionText}>Edit message</Text>
                  </Pressable>
                  <Pressable style={styles.sheetOption} onPress={handleDeleteForMe}>
                    <View style={[styles.sheetOptionIcon, { backgroundColor: colors.muted }]}>
                      <Trash2 size={16} color={colors.mutedForeground} />
                    </View>
                    <Text style={styles.sheetOptionText}>Delete for me</Text>
                  </Pressable>
                  {selectedMessage && canDeleteForEveryone(selectedMessage.created_at) && (
                    <Pressable style={styles.sheetOption} onPress={handleDeleteForEveryone}>
                      <View style={[styles.sheetOptionIcon, { backgroundColor: "#FFF0F0" }]}>
                        <Trash2 size={16} color={colors.destructive} />
                      </View>
                      <Text style={[styles.sheetOptionText, { color: colors.destructive }]}>
                        Delete for everyone
                      </Text>
                    </Pressable>
                  )}
                </>
              )}

            {selectedMessage &&
              selectedMessage.sender_id !== currentUserId && isRealUser && (
                <Pressable
                  style={styles.sheetOption}
                  onPress={() => {
                    closeContextMenu();
                    setTimeout(() => Alert.alert("Reported", "Thank you. Our team will review this message."), 300);
                  }}
                >
                  <View style={[styles.sheetOptionIcon, { backgroundColor: "#FFF0F0" }]}>
                    <ShieldAlert size={16} color={colors.destructive} />
                  </View>
                  <Text style={[styles.sheetOptionText, { color: colors.destructive }]}>
                    Report message
                  </Text>
                </Pressable>
              )}

            <Pressable style={[styles.sheetOption, styles.sheetCancelBtn]} onPress={closeContextMenu}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Header Menu */}
      <Modal visible={headerMenuVisible} transparent animationType="none" onRequestClose={closeHeaderMenu}>
        <Animated.View style={[styles.modalOverlay, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.flatten(styles.modalOverlay)} onPress={closeHeaderMenu} />
          <Animated.View
            style={[styles.headerSheet, { transform: [{ translateY: headerMenuSlide }] }]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{otherName}</Text>

            <Pressable style={styles.sheetOption} onPress={handleMuteToggle}>
              <View style={[styles.sheetOptionIcon, { backgroundColor: colors.muted }]}>
                {isMuted ? <Bell size={16} color={colors.foreground} /> : <BellOff size={16} color={colors.foreground} />}
              </View>
              <Text style={styles.sheetOptionText}>
                {isMuted ? "Unmute conversation" : "Mute conversation"}
              </Text>
            </Pressable>

            <Pressable style={styles.sheetOption} onPress={handleBlock}>
              <View style={[styles.sheetOptionIcon, { backgroundColor: "#FFF0F0" }]}>
                <UserX size={16} color={colors.destructive} />
              </View>
              <Text style={[styles.sheetOptionText, { color: colors.destructive }]}>
                {isBlocked ? "Unblock user" : "Block user"}
              </Text>
            </Pressable>

            <Pressable style={styles.sheetOption} onPress={handleReport}>
              <View style={[styles.sheetOptionIcon, { backgroundColor: "#FFF0F0" }]}>
                <ShieldAlert size={16} color={colors.destructive} />
              </View>
              <Text style={[styles.sheetOptionText, { color: colors.destructive }]}>
                Report user
              </Text>
            </Pressable>

            <Pressable style={[styles.sheetOption, styles.sheetCancelBtn]} onPress={closeHeaderMenu}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Modal>

      <ImageViewer uri={viewingImage} visible={!!viewingImage} onClose={() => setViewingImage(null)} />

      {/* Prayer Share Modal */}
      <Modal
        visible={prayerShareVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPrayerShareVisible(false)}
      >
        <View style={styles.prayerShareOverlay}>
          <Pressable style={StyleSheet.flatten(styles.prayerShareOverlay)} onPress={() => setPrayerShareVisible(false)} />
          <View style={styles.prayerShareSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Share a Prayer</Text>
            <Text style={styles.prayerShareDesc}>
              Send a dedicated prayer card to encourage and uplift them.
            </Text>
            {[
              "I'm lifting you up in prayer today 🙏",
              "Praying for God's peace over you right now.",
              "Standing with you in prayer. You are not alone.",
              "Lord, I pray for strength and healing for my friend.",
            ].map((text) => (
              <Pressable
                key={text}
                style={styles.prayerOption}
                onPress={() => handleSharePrayer(text)}
              >
                <Text style={styles.prayerOptionEmoji}>🕊️</Text>
                <Text style={styles.prayerOptionText}>{text}</Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.prayerShareClose}
              onPress={() => setPrayerShareVisible(false)}
            >
              <Text style={styles.prayerShareCloseText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "50",
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: colors.secondary,
  },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatarWrap: { position: "relative" as const },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerAvatarFallback: {
    backgroundColor: colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  headerAvatarInitial: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  headerName: { fontSize: 15, fontWeight: "700" as const, color: colors.foreground },
  mutedLabel: { fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
  headerMenuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  blockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFF0F0",
    borderBottomWidth: 1,
    borderBottomColor: colors.destructive + "30",
  },
  blockedBannerText: { fontSize: 12, color: colors.destructive, flex: 1 },
  blockedBannerAction: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.destructive,
    marginLeft: 12,
  },
  loadingState: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 12,
  },
  loadingText: { fontSize: 14, color: colors.mutedForeground },
  errorText: { fontSize: 14, color: colors.destructive },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  retryBtnText: {
    color: colors.primaryForeground,
    fontWeight: "600" as const,
    fontSize: 14,
  },
  chatContent: { paddingHorizontal: 16, paddingVertical: 20, gap: 10 },
  dmIncomingOuter: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    alignSelf: "flex-start" as const,
    gap: 8,
    maxWidth: "85%",
  },
  dmMsgGrouped: {
    marginTop: -6,
  },
  dmAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  dmAvatarFallback: {
    backgroundColor: colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  dmAvatarInitial: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  dmAvatarSpacer: {
    width: 40,
    flexShrink: 0,
  },
  emptyChat: {
    alignItems: "center" as const,
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyChatIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  emptyChatEmoji: { fontSize: 32 },
  emptyChatTitle: { fontSize: 17, fontWeight: "700" as const, color: colors.foreground },
  emptyChatSub: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center" as const,
    lineHeight: 20,
  },
  msgRow: { maxWidth: "80%", gap: 4 },
  msgRowLeft: { alignSelf: "flex-start" as const },
  msgRowRight: { alignSelf: "flex-end" as const },
  bubble: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, overflow: "hidden" as const },
  bubbleWithImage: { paddingHorizontal: 0, paddingVertical: 0 },
  bubbleTextWithImage: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 6 },
  msgImage: {
    width: 220,
    height: 160,
    borderRadius: 16,
  },
  bubbleMine: {
    backgroundColor: colors.primary,
    borderTopRightRadius: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  bubbleTheirs: {
    backgroundColor: colors.secondary,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border + "40",
  },
  bubbleText: { fontSize: 14, lineHeight: 22 },
  bubbleTextMine: { color: colors.primaryForeground },
  bubbleTextTheirs: { color: colors.foreground },
  editedLabel: {
    fontSize: 10,
    color: colors.mutedForeground,
    marginTop: 2,
    fontStyle: "italic" as const,
  },
  editedLabelMine: { color: "rgba(255,255,255,0.65)" },
  editedLabelTheirs: { color: colors.mutedForeground },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  timeRowRight: { justifyContent: "flex-end" as const },
  msgTime: { fontSize: 10, color: colors.mutedForeground },
  reactionsRow: { flexDirection: "row", gap: 4, marginTop: 4, flexWrap: "wrap" as const },
  reactionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border + "50",
  },
  reactionEmoji: { fontSize: 13 },
  reactionCount: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.mutedForeground,
  },
  prayerShareCard: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    borderTopRightRadius: 4,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primary + "30",
    maxWidth: 260,
  },
  prayerShareHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  prayerShareIcon: { fontSize: 18 },
  prayerShareLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.primary,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  prayerShareContent: {
    fontSize: 12,
    color: colors.foreground,
    lineHeight: 18,
    fontStyle: "italic" as const,
    backgroundColor: "rgba(217,110,39,0.08)",
    borderRadius: 8,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  prayerShareMessage: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "600" as const,
  },
  inputAreaWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border + "50",
    backgroundColor: colors.background,
  },
  imagePreviewRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  inputArea: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: colors.background,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: colors.secondary + "80",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border + "50",
    maxHeight: 120,
  },
  textInput: { fontSize: 14, color: colors.foreground, padding: 0 },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  sendBtnDisabled: { backgroundColor: colors.muted, shadowOpacity: 0 },
  editingBar: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border + "50",
    backgroundColor: colors.background,
    gap: 8,
  },
  editingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
  },
  editingLabel: { flex: 1, fontSize: 12, color: colors.primary, fontWeight: "600" as const },
  editInputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  editInput: {
    flex: 1,
    backgroundColor: colors.secondary + "80",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.foreground,
    borderWidth: 1.5,
    borderColor: colors.primary + "60",
    maxHeight: 100,
  },
  editSaveBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  editSaveBtnDisabled: { backgroundColor: colors.muted },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end" as const,
  },
  contextSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    paddingHorizontal: 16,
  },
  headerSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    paddingHorizontal: 16,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center" as const,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.foreground,
    marginBottom: 16,
  },
  sheetSectionLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.mutedForeground,
    letterSpacing: 1,
    textTransform: "uppercase" as const,
    marginBottom: 10,
  },
  reactionPickerRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  reactionPickerBtn: { alignItems: "center" as const, gap: 4 },
  reactionPickerEmoji: { fontSize: 30 },
  reactionPickerLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontWeight: "500" as const,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: colors.border + "60",
    marginBottom: 8,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  sheetOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  sheetOptionText: { fontSize: 15, color: colors.foreground, fontWeight: "500" as const },
  sheetCancelBtn: {
    marginTop: 4,
    justifyContent: "center" as const,
  },
  sheetCancelText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.mutedForeground,
    textAlign: "center" as const,
    flex: 1,
  },
  prayerShareOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end" as const,
  },
  prayerShareSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 32 : 20,
    paddingHorizontal: 20,
    gap: 8,
  },
  prayerShareDesc: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 19,
    marginBottom: 8,
  },
  prayerOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.accent,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary + "25",
  },
  prayerOptionEmoji: { fontSize: 20 },
  prayerOptionText: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 20,
  },
  prayerShareClose: {
    paddingVertical: 14,
    alignItems: "center" as const,
    marginTop: 4,
  },
  prayerShareCloseText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.mutedForeground,
  },
  replyBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.secondary + "80",
    borderTopWidth: 1,
    borderTopColor: colors.border + "40",
    gap: 8,
  },
  replyBannerBar: {
    width: 3,
    alignSelf: "stretch" as const,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  replyBannerBody: { flex: 1 },
  replyBannerName: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.primary,
    marginBottom: 1,
  },
  replyBannerText: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  replyBannerClose: {
    padding: 4,
  },
  quoteWrap: {
    flexDirection: "row" as const,
    backgroundColor: colors.secondary + "80",
    borderRadius: 10,
    overflow: "hidden" as const,
    marginBottom: 4,
    maxWidth: "100%",
  },
  quoteWrapOwn: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  quoteBar: {
    width: 3,
    backgroundColor: colors.mutedForeground,
  },
  quoteBarOwn: {
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  quoteBody: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  quoteSenderName: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.primary,
    marginBottom: 1,
  },
  quoteSenderNameOwn: {
    color: "rgba(255,255,255,0.9)",
  },
  quoteText: {
    fontSize: 12,
    color: colors.mutedForeground,
    lineHeight: 16,
  },
  quoteTextOwn: {
    color: "rgba(255,255,255,0.7)",
  },
});
