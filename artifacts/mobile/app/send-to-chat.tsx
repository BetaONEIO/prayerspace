import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Platform,
  Animated,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import {
  ChevronLeft,
  Search,
  Send,
  X,
  MessageCircle,
  CheckCircle,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import {
  fetchConversations,
  getOrCreateDMConversation,
  type ConversationListItem,
} from "@/lib/chat";

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

type ViewState = "select" | "confirm" | "sent";

const getUpdateTagLabels = (colors: ThemeColors): Record<string, { label: string; bg: string; color: string }> => ({
  still_need_prayer: { label: "Still need prayer", bg: colors.accent, color: colors.primary },
  answered: { label: "Answered 🙌", bg: "#E8F8F0", color: "#1A7A52" },
  thank_you: { label: "Thank you", bg: "#EEF2FF", color: "#6366F1" },
});

export default function SendToChatScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const UPDATE_TAG_LABELS = useMemo(() => getUpdateTagLabels(colors), [colors]);
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{
    postId: string;
    authorName: string;
    authorAvatar: string;
    postContent: string;
    updateTag?: string;
  }>();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewState, setViewState] = useState<ViewState>("select");
  const [selectedConv, setSelectedConv] = useState<ConversationListItem | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [additionalMessage, setAdditionalMessage] = useState<string>("");

  const confirmSlide = useRef(new Animated.Value(400)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const currentUserId = user?.id ?? "";

  const convsQuery = useQuery({
    queryKey: ["conversations", currentUserId],
    queryFn: () => fetchConversations(currentUserId),
    enabled: !!currentUserId,
  });

  const usersQuery = useQuery({
    queryKey: ["send-to-chat-users", currentUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .neq("id", currentUserId)
        .limit(50);
      if (error) {
        console.error("[SendToChat] Error fetching users:", error.message);
        return [];
      }
      return (data ?? []) as UserProfile[];
    },
    enabled: !!currentUserId,
  });

  const conversations = convsQuery.data ?? [];
  const allUsers = usersQuery.data ?? [];

  const conversationUserIds = useMemo(
    () => new Set(conversations.map((c) => c.other_user_id)),
    [conversations]
  );

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) =>
      (c.other_user_name ?? "").toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      if (conversationUserIds.has(u.id)) return false;
      if (!searchQuery.trim()) return true;
      return (u.full_name ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [allUsers, searchQuery, conversationUserIds]);

  const showConfirm = useCallback(
    (conv?: ConversationListItem, profile?: UserProfile) => {
      if (conv) setSelectedConv(conv);
      if (profile) setSelectedUser(profile);
      setViewState("confirm");
      Animated.spring(confirmSlide, {
        toValue: 0,
        useNativeDriver: true,
        tension: 72,
        friction: 13,
      }).start();
      if (Platform.OS !== "web") void Haptics.selectionAsync();
    },
    [confirmSlide]
  );

  const hideConfirm = useCallback(() => {
    Animated.timing(confirmSlide, {
      toValue: 400,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setViewState("select");
      setSelectedConv(null);
      setSelectedUser(null);
      setAdditionalMessage("");
    });
  }, [confirmSlide]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      let convId: string;
      if (selectedConv) {
        convId = selectedConv.conversation_id;
      } else if (selectedUser) {
        convId = await getOrCreateDMConversation(currentUserId, selectedUser.id);
      } else {
        throw new Error("No recipient selected");
      }

      const content =
        additionalMessage.trim() || "I thought you'd want to pray for this 🙏";

      const { error } = await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: currentUserId,
        content,
        type: "prayer_share",
        prayer_request_content: (params.postContent ?? "").replace(/^"|"$/g, ""),
        is_edited: false,
        deleted_for_everyone: false,
        deleted_for_sender: false,
      });
      if (error) throw error;

      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", convId);

      return convId;
    },
    onSuccess: (convId) => {
      console.log("[SendToChat] Prayer shared to conv:", convId.slice(0, 8));
      void queryClient.invalidateQueries({ queryKey: ["conversations", currentUserId] });
      setViewState("sent");
      if (Platform.OS !== "web")
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Animated.parallel([
        Animated.spring(successScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      setTimeout(() => router.back(), 1600);
    },
    onError: (e) => {
      console.error("[SendToChat] Send error:", e);
    },
  });

  const recipientName =
    selectedConv?.other_user_name ??
    selectedUser?.full_name ??
    "Prayer Partner";

  const recipientAvatar =
    selectedConv?.other_user_avatar ?? selectedUser?.avatar_url ?? null;

  const postContent = (params.postContent ?? "").replace(/^"|"$/g, "");
  const authorName = params.authorName ?? "";
  const authorAvatar = params.authorAvatar ?? "";
  const tagConfig = params.updateTag ? UPDATE_TAG_LABELS[params.updateTag] : null;

  const hasResults =
    filteredConversations.length > 0 || filteredUsers.length > 0;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={18} color={colors.foreground} />
          </Pressable>
          <Text style={styles.headerTitle}>Send to</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.searchRow}>
          <Search size={15} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search people or chats"
            placeholderTextColor={colors.mutedForeground + "80"}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <X size={14} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {(convsQuery.isLoading || usersQuery.isLoading) && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          {!convsQuery.isLoading && filteredConversations.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>RECENT CHATS</Text>
              {filteredConversations.map((item) => {
                const name = item.other_user_name ?? "Prayer Partner";
                return (
                  <Pressable
                    key={item.conversation_id}
                    style={styles.listItem}
                    onPress={() => showConfirm(item)}
                  >
                    <AvatarBubble
                      uri={item.other_user_avatar}
                      name={name}
                    />
                    <View style={styles.listItemBody}>
                      <Text style={styles.listItemName}>{name}</Text>
                      {item.last_message && (
                        <Text style={styles.listItemSub} numberOfLines={1}>
                          {item.last_message}
                        </Text>
                      )}
                    </View>
                    <View style={styles.listItemChevron}>
                      <MessageCircle size={16} color={colors.primary + "60"} />
                    </View>
                  </Pressable>
                );
              })}
            </>
          )}

          {!usersQuery.isLoading && filteredUsers.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
                PEOPLE
              </Text>
              {filteredUsers.map((item) => {
                const name = item.full_name ?? "Prayer Partner";
                return (
                  <Pressable
                    key={item.id}
                    style={styles.listItem}
                    onPress={() => showConfirm(undefined, item)}
                  >
                    <AvatarBubble uri={item.avatar_url} name={name} />
                    <View style={styles.listItemBody}>
                      <Text style={styles.listItemName}>{name}</Text>
                      <Text style={styles.listItemSub}>
                        Start a conversation
                      </Text>
                    </View>
                    <View style={styles.listItemChevron}>
                      <MessageCircle size={16} color={colors.primary + "60"} />
                    </View>
                  </Pressable>
                );
              })}
            </>
          )}

          {!convsQuery.isLoading &&
            !usersQuery.isLoading &&
            !hasResults && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🙏</Text>
                <Text style={styles.emptyTitle}>
                  {searchQuery.trim() ? "No results found" : "No chats yet"}
                </Text>
                <Text style={styles.emptySub}>
                  {searchQuery.trim()
                    ? "Try a different name"
                    : "Start messaging someone to share prayer with them"}
                </Text>
              </View>
            )}
        </ScrollView>
      </SafeAreaView>

      {viewState !== "select" && (
        <Animated.View
          style={[
            styles.confirmLayer,
            { transform: [{ translateX: confirmSlide }] },
          ]}
        >
          {viewState === "sent" ? (
            <View style={styles.sentWrap}>
              <Animated.View
                style={[
                  styles.sentCircle,
                  {
                    opacity: successOpacity,
                    transform: [{ scale: successScale }],
                  },
                ]}
              >
                <CheckCircle size={40} color={colors.primaryForeground} />
              </Animated.View>
              <Animated.Text
                style={[styles.sentTitle, { opacity: successOpacity }]}
              >
                Prayer shared
              </Animated.Text>
              <Animated.Text
                style={[styles.sentSub, { opacity: successOpacity }]}
              >
                {recipientName} will receive your prayer invitation
              </Animated.Text>
            </View>
          ) : (
            <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
              <View style={styles.confirmHeader}>
                <Pressable style={styles.backBtn} onPress={hideConfirm}>
                  <ChevronLeft size={18} color={colors.foreground} />
                </Pressable>
                <Text style={styles.headerTitle}>Send prayer update</Text>
                <View style={styles.headerSpacer} />
              </View>

              <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
              >
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={styles.confirmContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.recipientRow}>
                    <AvatarBubble uri={recipientAvatar} name={recipientName} size={44} />
                    <View>
                      <Text style={styles.recipientLabel}>Sending to</Text>
                      <Text style={styles.recipientName}>{recipientName}</Text>
                    </View>
                  </View>

                  <View style={styles.prayerPreviewCard}>
                    <View style={styles.previewCardBar} />
                    <View style={styles.previewCardBody}>
                      <View style={styles.previewAuthorRow}>
                        {authorAvatar ? (
                          <Image
                            source={{ uri: authorAvatar }}
                            style={styles.previewAvatar}
                          />
                        ) : (
                          <View
                            style={[styles.previewAvatar, styles.previewAvatarFallback]}
                          >
                            <Text style={styles.previewAvatarInitial}>
                              {authorName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.previewAuthorName}>
                            {authorName || "Someone"}
                          </Text>
                          <Text style={styles.previewAuthorSub}>
                            Prayer Request
                          </Text>
                        </View>
                        {tagConfig && (
                          <View
                            style={[
                              styles.previewTag,
                              { backgroundColor: tagConfig.bg },
                            ]}
                          >
                            <Text
                              style={[
                                styles.previewTagText,
                                { color: tagConfig.color },
                              ]}
                            >
                              {tagConfig.label}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.previewContent} numberOfLines={4}>
                        {postContent || "A prayer request"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.messageInputSection}>
                    <Text style={styles.messageInputLabel}>
                      Add a message{" "}
                      <Text style={styles.messageInputOptional}>(optional)</Text>
                    </Text>
                    <View style={styles.messageInputWrap}>
                      <TextInput
                        style={styles.messageInput}
                        placeholder="I thought you'd want to pray for this 🙏"
                        placeholderTextColor={colors.mutedForeground + "70"}
                        value={additionalMessage}
                        onChangeText={setAdditionalMessage}
                        multiline
                        maxLength={300}
                        textAlignVertical="top"
                      />
                    </View>
                  </View>
                </ScrollView>

                <SafeAreaView edges={["bottom"]} style={styles.confirmFooter}>
                  <Pressable
                    style={[
                      styles.sendBtn,
                      sendMutation.isPending && styles.sendBtnLoading,
                    ]}
                    onPress={() => sendMutation.mutate()}
                    disabled={sendMutation.isPending}
                  >
                    {sendMutation.isPending ? (
                      <ActivityIndicator
                        color={colors.primaryForeground}
                        size="small"
                      />
                    ) : (
                      <>
                        <Send size={18} color={colors.primaryForeground} />
                        <Text style={styles.sendBtnText}>
                          Send to {recipientName.split(" ")[0]}
                        </Text>
                      </>
                    )}
                  </Pressable>
                  {sendMutation.isError && (
                    <Text style={styles.errorText}>
                      Something went wrong. Please try again.
                    </Text>
                  )}
                </SafeAreaView>
              </KeyboardAvoidingView>
            </SafeAreaView>
          )}
        </Animated.View>
      )}
    </View>
    </>
  );
}

function AvatarBubble({
  uri,
  name,
  size = 46,
}: {
  uri: string | null | undefined;
  name: string;
  size?: number;
}) {
  const colors = useThemeColors();
  const radius = size / 2;
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: colors.accent,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          fontSize: size * 0.38,
          fontWeight: "700" as const,
          color: colors.primary,
        }}
      >
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800" as const,
    color: colors.foreground,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 36,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.foreground,
    fontWeight: "500" as const,
    padding: 0,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.mutedForeground,
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 4,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "50",
  },
  listItemBody: {
    flex: 1,
    gap: 2,
  },
  listItemName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.foreground,
    letterSpacing: -0.1,
  },
  listItemSub: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontWeight: "400" as const,
  },
  listItemChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 64,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: colors.foreground,
    letterSpacing: -0.2,
  },
  emptySub: {
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
  },
  confirmLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
  },
  confirmHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "40",
  },
  confirmContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 20,
  },
  recipientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  recipientLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: colors.primary,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginBottom: 2,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: colors.foreground,
    letterSpacing: -0.2,
  },
  prayerPreviewCard: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  previewCardBar: {
    width: 4,
    backgroundColor: colors.primary + "50",
  },
  previewCardBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  previewAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  previewAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  previewAvatarFallback: {
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  previewAvatarInitial: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  previewAuthorName: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.foreground,
  },
  previewAuthorSub: {
    fontSize: 11,
    color: colors.mutedForeground,
    fontWeight: "500" as const,
  },
  previewTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  previewTagText: {
    fontSize: 10,
    fontWeight: "700" as const,
    letterSpacing: 0.2,
  },
  previewContent: {
    fontSize: 13,
    color: colors.foreground,
    lineHeight: 20,
    fontStyle: "italic" as const,
  },
  messageInputSection: {
    gap: 10,
  },
  messageInputLabel: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.foreground,
  },
  messageInputOptional: {
    fontWeight: "400" as const,
    color: colors.mutedForeground,
  },
  messageInputWrap: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 100,
  },
  messageInput: {
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 22,
    padding: 0,
    minHeight: 72,
  },
  confirmFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border + "50",
    backgroundColor: colors.background,
    gap: 8,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 6,
  },
  sendBtnLoading: {
    opacity: 0.7,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: colors.primaryForeground,
    letterSpacing: 0.1,
  },
  errorText: {
    fontSize: 12,
    color: colors.destructive,
    textAlign: "center",
    fontWeight: "500" as const,
  },
  sentWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  sentCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 8,
  },
  sentTitle: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  sentSub: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "400" as const,
  },
});
