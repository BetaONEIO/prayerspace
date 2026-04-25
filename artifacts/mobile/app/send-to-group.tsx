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
  Users,
  CheckCircle,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { LightColors as Colors } from "@/constants/colors";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";

interface MyGroup {
  id: string;
  name: string;
  memberCount: number;
  lastActivity: string;
  avatar: string;
  activeRequests: number;
}

const USER_GROUPS: MyGroup[] = [
  {
    id: "g1",
    name: "Grace Community",
    memberCount: 24,
    lastActivity: "2 hours ago",
    avatar: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80",
    activeRequests: 3,
  },
  {
    id: "g2",
    name: "Morning Prayer Circle",
    memberCount: 11,
    lastActivity: "Yesterday",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
    activeRequests: 1,
  },
  {
    id: "g3",
    name: "Family First",
    memberCount: 6,
    lastActivity: "3 days ago",
    avatar: "https://images.unsplash.com/photo-1511895426328-dc8714191011?w=400&q=80",
    activeRequests: 0,
  },
];

const UPDATE_TAG_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  still_need_prayer: { label: "Still need prayer", bg: Colors.accent, color: Colors.primary },
  answered: { label: "Answered 🙌", bg: "#E8F8F0", color: "#1A7A52" },
  thank_you: { label: "Thank you", bg: "#EEF2FF", color: "#6366F1" },
};

type ViewState = "select" | "compose" | "sent";

export default function SendToGroupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    postId: string;
    authorName: string;
    authorAvatar: string;
    postContent: string;
    updateTag?: string;
  }>();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewState, setViewState] = useState<ViewState>("select");
  const [selectedGroup, setSelectedGroup] = useState<MyGroup | null>(null);
  const [additionalMessage, setAdditionalMessage] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);

  const composeSlide = useRef(new Animated.Value(400)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const listFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    console.log("[SendToGroup] Screen mounted, postId:", params.postId ?? "none");
  }, []);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return USER_GROUPS;
    const q = searchQuery.toLowerCase();
    return USER_GROUPS.filter((g) => g.name.toLowerCase().includes(q));
  }, [searchQuery]);

  const handleSelectGroup = useCallback((group: MyGroup) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    console.log("[SendToGroup] Group selected:", group.name);
    setSelectedGroup(group);
    setViewState("compose");
    Animated.parallel([
      Animated.timing(listFade, { toValue: 0.4, duration: 180, useNativeDriver: true }),
      Animated.spring(composeSlide, {
        toValue: 0,
        useNativeDriver: true,
        tension: 72,
        friction: 13,
      }),
    ]).start();
  }, [composeSlide, listFade]);

  const handleBackToSelect = useCallback(() => {
    Animated.parallel([
      Animated.timing(listFade, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(composeSlide, {
        toValue: 400,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setViewState("select");
      setSelectedGroup(null);
      setAdditionalMessage("");
    });
  }, [composeSlide, listFade]);

  const handleSend = useCallback(() => {
    if (!selectedGroup) return;
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSending(true);
    console.log("[SendToGroup] Sending prayer update to group:", selectedGroup.name, "postId:", params.postId ?? "none");

    setTimeout(() => {
      setIsSending(false);
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
      setTimeout(() => {
        router.replace({
          pathname: "/group/[id]",
          params: {
            id: selectedGroup.id,
            pendingSharedMessage: additionalMessage.trim(),
            sharedAuthorName: params.authorName ?? "",
            sharedAuthorAvatar: params.authorAvatar ?? "",
            sharedPostContent: params.postContent ?? "",
            sharedUpdateTag: params.updateTag ?? "",
          },
        });
      }, 1400);
    }, 900);
  }, [selectedGroup, params, additionalMessage, successScale, successOpacity, router]);

  const postContent = (params.postContent ?? "").replace(/^"|"$/g, "");
  const authorName = params.authorName ?? "";
  const authorAvatar = params.authorAvatar ?? "";
  const tagConfig = params.updateTag ? UPDATE_TAG_LABELS[params.updateTag] : null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.root}>
      <Animated.View style={[styles.mainLayer, { opacity: listFade }]}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <ChevronLeft size={18} color={Colors.foreground} />
            </Pressable>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Send to Group</Text>
              <Text style={styles.headerSubtitle}>Choose a group to share this prayer update with</Text>
            </View>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.searchRow}>
            <Search size={15} color={Colors.mutedForeground} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search groups"
              placeholderTextColor={Colors.mutedForeground + "80"}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                <X size={14} color={Colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {filteredGroups.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>YOUR GROUPS</Text>
                {filteredGroups.map((group) => (
                  <Pressable
                    key={group.id}
                    style={styles.groupRow}
                    onPress={() => handleSelectGroup(group)}
                  >
                    <View style={styles.groupAvatarWrap}>
                      <Image
                        source={{ uri: group.avatar }}
                        style={styles.groupAvatar}
                        contentFit="cover"
                      />
                    </View>
                    <View style={styles.groupInfo}>
                      <Text style={styles.groupName}>{group.name}</Text>
                      <Text style={styles.groupMeta}>
                        {group.memberCount} members · {group.lastActivity}
                      </Text>
                    </View>
                    <View style={styles.groupChevron}>
                      <Users size={16} color={Colors.primary + "70"} />
                    </View>
                  </Pressable>
                ))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🙏</Text>
                <Text style={styles.emptyTitle}>
                  {searchQuery.trim() ? "No groups found" : "You're not in any groups yet"}
                </Text>
                <Text style={styles.emptySub}>
                  {searchQuery.trim()
                    ? "Try a different name"
                    : "Join a prayer group to start sharing updates with your community"}
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>

      {viewState !== "select" && (
        <Animated.View
          style={[
            styles.composeLayer,
            { transform: [{ translateX: composeSlide }] },
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
                <CheckCircle size={40} color={Colors.primaryForeground} />
              </Animated.View>
              <Animated.Text style={[styles.sentTitle, { opacity: successOpacity }]}>
                Shared to group
              </Animated.Text>
              <Animated.Text style={[styles.sentSub, { opacity: successOpacity }]}>
                {selectedGroup?.name} will receive your prayer invitation
              </Animated.Text>
            </View>
          ) : (
            <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
              <View style={styles.composeHeader}>
                <Pressable style={styles.backBtn} onPress={handleBackToSelect}>
                  <ChevronLeft size={18} color={Colors.foreground} />
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
                  contentContainerStyle={styles.composeContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {selectedGroup && (
                    <View style={styles.destinationRow}>
                      <Image
                        source={{ uri: selectedGroup.avatar }}
                        style={styles.destinationAvatar}
                        contentFit="cover"
                      />
                      <View>
                        <Text style={styles.destinationLabel}>Sending to</Text>
                        <Text style={styles.destinationName}>{selectedGroup.name}</Text>
                        <Text style={styles.destinationMeta}>
                          {selectedGroup.memberCount} members
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.messageInputSection}>
                    <Text style={styles.messageInputLabel}>
                      Add a message{" "}
                      <Text style={styles.messageInputOptional}>(optional)</Text>
                    </Text>
                    <View style={styles.messageInputWrap}>
                      <TextInput
                        style={styles.messageInput}
                        placeholder="Say something to the group..."
                        placeholderTextColor={Colors.mutedForeground + "70"}
                        value={additionalMessage}
                        onChangeText={setAdditionalMessage}
                        multiline
                        maxLength={300}
                        textAlignVertical="top"
                        autoFocus={false}
                      />
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
                            contentFit="cover"
                          />
                        ) : (
                          <View style={[styles.previewAvatar, styles.previewAvatarFallback]}>
                            <Text style={styles.previewAvatarInitial}>
                              {authorName.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.previewAuthorName}>
                            {authorName || "Someone"}
                          </Text>
                          <Text style={styles.previewAuthorSub}>Prayer Request</Text>
                        </View>
                        {tagConfig && (
                          <View
                            style={[styles.previewTag, { backgroundColor: tagConfig.bg }]}
                          >
                            <Text
                              style={[styles.previewTagText, { color: tagConfig.color }]}
                            >
                              {tagConfig.label}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.previewContent} numberOfLines={4}>
                        {postContent || "A prayer request"}
                      </Text>
                      <View style={styles.previewReadOnly}>
                        <Text style={styles.previewReadOnlyText}>Quoted prayer · read only</Text>
                      </View>
                    </View>
                  </View>
                </ScrollView>

                <SafeAreaView edges={["bottom"]} style={styles.composeFooter}>
                  <Pressable
                    style={[styles.sendBtn, isSending && styles.sendBtnLoading]}
                    onPress={handleSend}
                    disabled={isSending}
                  >
                    {isSending ? (
                      <ActivityIndicator color={Colors.primaryForeground} size="small" />
                    ) : (
                      <>
                        <Send size={18} color={Colors.primaryForeground} />
                        <Text style={styles.sendBtnText}>
                          Send to {selectedGroup?.name.split(" ")[0]}
                        </Text>
                      </>
                    )}
                  </Pressable>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  mainLayer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.3,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 11,
    color: Colors.mutedForeground,
    textAlign: "center",
    marginTop: 2,
    fontWeight: "500" as const,
  },
  headerSpacer: {
    width: 36,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.foreground,
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
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.mutedForeground,
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 4,
  },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "50",
  },
  groupAvatarWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  groupAvatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
  },
  groupInfo: {
    flex: 1,
    gap: 3,
  },
  groupName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.foreground,
    letterSpacing: -0.1,
  },
  groupMeta: {
    fontSize: 12,
    color: Colors.mutedForeground,
    fontWeight: "400" as const,
  },
  groupChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.accent,
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
    color: Colors.foreground,
    letterSpacing: -0.2,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    color: Colors.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
  },
  composeLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
  },
  composeHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + "40",
  },
  composeContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 20,
  },
  destinationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  destinationAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  destinationLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.primary,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginBottom: 2,
  },
  destinationName: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.2,
  },
  destinationMeta: {
    fontSize: 11,
    color: Colors.mutedForeground,
    fontWeight: "500" as const,
    marginTop: 1,
  },
  messageInputSection: {
    gap: 10,
  },
  messageInputLabel: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.foreground,
  },
  messageInputOptional: {
    fontWeight: "400" as const,
    color: Colors.mutedForeground,
  },
  messageInputWrap: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 90,
  },
  messageInput: {
    fontSize: 14,
    color: Colors.foreground,
    lineHeight: 22,
    padding: 0,
    minHeight: 62,
  },
  prayerPreviewCard: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  previewCardBar: {
    width: 4,
    backgroundColor: Colors.primary + "50",
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
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  previewAvatarInitial: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.primary,
  },
  previewAuthorName: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: Colors.foreground,
  },
  previewAuthorSub: {
    fontSize: 11,
    color: Colors.mutedForeground,
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
    color: Colors.foreground,
    lineHeight: 20,
    fontStyle: "italic" as const,
  },
  previewReadOnly: {
    alignSelf: "flex-start",
    backgroundColor: Colors.secondary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  previewReadOnlyText: {
    fontSize: 10,
    color: Colors.mutedForeground,
    fontWeight: "600" as const,
    letterSpacing: 0.2,
  },
  composeFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border + "50",
    backgroundColor: Colors.background,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    shadowColor: Colors.primary,
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
    color: Colors.primaryForeground,
    letterSpacing: 0.1,
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
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
    marginBottom: 8,
  },
  sentTitle: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.5,
  },
  sentSub: {
    fontSize: 14,
    color: Colors.mutedForeground,
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "400" as const,
  },
});
