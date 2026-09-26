import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { AutoScrollView } from "@/components/AutoScrollView";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, Stack, useFocusEffect } from "expo-router";
import {
  ChevronLeft,
  MoreHorizontal,
  Heart,
  MessageCircle,
  BookOpen,
  User,
  Pencil,
  AlertCircle,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";

type ProfileData = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  favorite_verse: string | null;
};

type RelationshipStatus = "checking" | "unavailable" | "add" | "sent" | "respond" | "friends" | "blocked";

export default function UserProfileScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [prayerCount, setPrayerCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavourited, setIsFavourited] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipStatus>("checking");
  const [relationshipLoading, setRelationshipLoading] = useState(false);

  const tooltipOpacity = useRef(new Animated.Value(0)).current;
  const heartScale = useRef(new Animated.Value(1)).current;

  const isOwnProfile = Boolean(id && user?.id === id);

  const fetchProfile = useCallback(async () => {
    if (!id) {
      setError("No user ID provided.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [profileRes, statsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, avatar_url, bio, favorite_verse")
          .eq("id", id)
          .single(),
        supabase
          .from("prayer_stats")
          .select("total_prayers")
          .eq("user_id", id)
          .maybeSingle(),
      ]);

      if (profileRes.error) {
        console.error("[UserProfile] Profile fetch error:", profileRes.error.message);
        setError("This profile could not be loaded.");
      } else if (!profileRes.data) {
        setError("Profile not found.");
      } else {
        setProfile(profileRes.data);
      }

      if (statsRes.data) {
        setPrayerCount(statsRes.data.total_prayers ?? 0);
      }
    } catch (err) {
      console.error("[UserProfile] Unexpected error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const fetchRelationship = useCallback(async () => {
    if (!user?.id || !id || user.id === id) return;
    const [requestsResult, blocksResult] = await Promise.all([
      supabase
        .from("friend_requests")
        .select("sender_id, receiver_id, status, created_at")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: false }),
      supabase
        .from("blocked_users")
        .select("blocker_id, blocked_id")
        .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${id}),and(blocker_id.eq.${id},blocked_id.eq.${user.id})`),
    ]);
    if (requestsResult.error || blocksResult.error) {
      if (__DEV__) console.warn("[UserProfile] relationship lookup failed", requestsResult.error?.code ?? blocksResult.error?.code);
      setRelationshipStatus("unavailable");
      return;
    }
    if (blocksResult.data?.length) {
      setRelationshipStatus("blocked");
      return;
    }
    const requests = requestsResult.data ?? [];
    const request = requests.find((row) => row.status === "accepted")
      ?? requests.find((row) => row.status === "pending");
    if (!request) {
      setRelationshipStatus("add");
    } else if (request.status === "accepted") {
      setRelationshipStatus("friends");
    } else if (request.status === "pending") {
      setRelationshipStatus(request.sender_id === user.id ? "sent" : "respond");
    } else {
      setRelationshipStatus("add");
    }
  }, [id, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void fetchRelationship();
    }, [fetchRelationship]),
  );

  useEffect(() => {
    if (!user?.id || !id || user.id === id) return;
    const channel = supabase
      .channel(`profile-relationship:${user.id}:${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friend_requests" }, () => {
        void fetchRelationship();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "blocked_users" }, () => {
        void fetchRelationship();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchRelationship, id, user?.id]);

  const handleRelationshipAction = useCallback(() => {
    if (!user?.id || !id || relationshipLoading) return;
    if (relationshipStatus === "checking") return;
    if (relationshipStatus === "unavailable") {
      setRelationshipStatus("checking");
      void fetchRelationship();
      return;
    }
    const currentUserId = user.id;
    if (relationshipStatus === "respond") {
      router.push("/friend-requests" as never);
      return;
    }
    if (relationshipStatus === "sent") {
      router.push("/sent-friend-requests" as never);
      return;
    }
    if (relationshipStatus === "blocked") return;
    if (relationshipStatus === "friends") {
      Alert.alert(
        "Remove Friend?",
        `Remove ${profile?.full_name ?? "this person"} from your friends?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              setRelationshipLoading(true);
              void (async () => {
                const { error: rpcError } = await supabase.rpc("remove_friend", { target_user_id: id });
                if (rpcError) {
                  Alert.alert("Could not remove friend", rpcError.message);
                } else {
                  setRelationshipStatus("add");
                  void queryClient.invalidateQueries({ queryKey: ["friend_requests_relationships", currentUserId] });
                  void queryClient.invalidateQueries({ queryKey: ["friends", currentUserId] });
                  void queryClient.invalidateQueries({ queryKey: ["friendIds", currentUserId] });
                  void queryClient.invalidateQueries({ queryKey: ["feed-posts", currentUserId] });
                }
                setRelationshipLoading(false);
              })();
            },
          },
        ],
      );
      return;
    }
    setRelationshipLoading(true);
    void (async () => {
      const { error: rpcError } = await supabase.rpc("send_friend_request", { target_user_id: id });
      if (rpcError) {
        Alert.alert("Could not add friend", rpcError.message);
        void fetchRelationship();
      } else {
        await fetchRelationship();
        void queryClient.invalidateQueries({ queryKey: ["friend_requests_sent", currentUserId] });
        void queryClient.invalidateQueries({ queryKey: ["friend_requests_relationships", currentUserId] });
        void queryClient.invalidateQueries({ queryKey: ["friend_requests_incoming", currentUserId] });
        void queryClient.invalidateQueries({ queryKey: ["friend_requests_incoming_count", currentUserId] });
        void queryClient.invalidateQueries({ queryKey: ["friends", currentUserId] });
        void queryClient.invalidateQueries({ queryKey: ["friendIds", currentUserId] });
        void queryClient.invalidateQueries({ queryKey: ["feed-posts", currentUserId] });
      }
      setRelationshipLoading(false);
    })();
  }, [id, profile?.full_name, queryClient, relationshipLoading, relationshipStatus, router, user?.id, fetchRelationship]);

  const handleMoreAction = useCallback(() => {
    if (!id || isOwnProfile || relationshipStatus === "blocked") return;
    Alert.alert(
      "Profile options",
      undefined,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block User",
          style: "destructive",
          onPress: () => {
            setRelationshipLoading(true);
            void (async () => {
              const { error: rpcError } = await supabase.rpc("block_user", { target_user_id: id });
              if (rpcError) {
                Alert.alert("Could not block user", rpcError.message);
              } else {
                setRelationshipStatus("blocked");
                  if (user?.id) {
                    void queryClient.invalidateQueries({ queryKey: ["friend_requests_sent", user.id] });
                    void queryClient.invalidateQueries({ queryKey: ["friend_requests_relationships", user.id] });
                    void queryClient.invalidateQueries({ queryKey: ["friend_requests_incoming", user.id] });
                    void queryClient.invalidateQueries({ queryKey: ["friend_requests_incoming_count", user.id] });
                    void queryClient.invalidateQueries({ queryKey: ["friends", user.id] });
                    void queryClient.invalidateQueries({ queryKey: ["friendIds", user.id] });
                    void queryClient.invalidateQueries({ queryKey: ["feed-posts", user.id] });
                  }
              }
              setRelationshipLoading(false);
            })();
          },
        },
      ],
    );
  }, [id, isOwnProfile, queryClient, relationshipStatus, user?.id]);

  const handleFavourite = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newVal = !isFavourited;
    setIsFavourited(newVal);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.35, useNativeDriver: true, friction: 3 }),
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
    if (newVal) {
      setShowTooltip(true);
      Animated.sequence([
        Animated.timing(tooltipOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1500),
        Animated.timing(tooltipOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setShowTooltip(false));
    }
  }, [isFavourited, heartScale, tooltipOpacity]);

  const displayName = profile?.full_name?.trim() || "Prayer Space User";

  const formatCount = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={colors.secondaryForeground} />
        </Pressable>
        {isOwnProfile ? (
          <Pressable style={styles.iconBtn} onPress={() => router.push("/edit-profile")}>
            <Pencil size={18} color={colors.secondaryForeground} />
          </Pressable>
        ) : (
          <Pressable style={styles.iconBtn} onPress={handleMoreAction}>
            <MoreHorizontal size={20} color={colors.secondaryForeground} />
          </Pressable>
        )}
      </View>

      {/* Loading */}
      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centerStateLabel}>Loading profile…</Text>
        </View>
      ) : error ? (
        /* Error */
        <View style={styles.centerState}>
          <View style={styles.errorIconWrap}>
            <AlertCircle size={36} color={colors.mutedForeground} />
          </View>
          <Text style={styles.errorTitle}>Profile unavailable</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => void fetchProfile()}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </Pressable>
          <Pressable style={styles.backLink} onPress={() => router.back()}>
            <Text style={styles.backLinkText}>Go Back</Text>
          </Pressable>
        </View>
      ) : (
        /* Profile content */
        <AutoScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Avatar + name */}
          <View style={styles.profileSection}>
            <View style={styles.avatarWrap}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <User size={44} color={colors.mutedForeground} />
                </View>
              )}
            </View>

            <Text style={styles.name}>{displayName}</Text>

            {profile?.bio ? (
              <Text style={styles.bio}>{profile.bio}</Text>
            ) : null}

            {/* Actions */}
            {isOwnProfile ? (
              <Pressable
                style={styles.editBtn}
                onPress={() => router.push("/edit-profile")}
              >
                <Pencil size={16} color={colors.primaryForeground} />
                <Text style={styles.editBtnText}>Edit Profile</Text>
              </Pressable>
            ) : (
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.friendBtn, relationshipStatus === "blocked" && styles.disabledBtn]}
                  onPress={handleRelationshipAction}
                  disabled={relationshipLoading || relationshipStatus === "blocked" || relationshipStatus === "checking"}
                >
                  <User size={16} color={colors.primaryForeground} />
                  <Text style={styles.friendBtnText}>
                    {relationshipLoading
                      ? "Updating…"
                      : relationshipStatus === "checking"
                        ? "Checking..."
                        : relationshipStatus === "unavailable"
                          ? "Retry status"
                          : relationshipStatus === "sent"
                        ? "Request Sent"
                        : relationshipStatus === "respond"
                          ? "Respond"
                          : relationshipStatus === "friends"
                            ? "Friends"
                            : relationshipStatus === "blocked"
                              ? "Blocked"
                              : "Add Friend"}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.messageBtn, relationshipStatus === "blocked" && styles.disabledBtn]}
                  onPress={() => router.push(`/chat/${id ?? ""}`)}
                  disabled={relationshipStatus === "blocked"}
                >
                  <MessageCircle size={18} color={colors.primaryForeground} />
                  <Text style={styles.messageBtnText}>Message</Text>
                </Pressable>
                <View style={styles.favWrap}>
                  <Pressable style={styles.heartCircle} onPress={handleFavourite}>
                    <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                      <Heart
                        size={22}
                        color={isFavourited ? colors.primary : colors.secondaryForeground}
                        fill={isFavourited ? colors.primary : "none"}
                      />
                    </Animated.View>
                  </Pressable>
                  {showTooltip && (
                    <Animated.View style={[styles.tooltip, { opacity: tooltipOpacity }]}>
                      <View style={styles.tooltipArrow} />
                      <Text style={styles.tooltipText}>Added to Favourites</Text>
                    </Animated.View>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Stats — only prayer count is available from Supabase */}
          {prayerCount !== null && prayerCount > 0 && (
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>{formatCount(prayerCount)}</Text>
                <Text style={styles.statLabel}>PRAYERS</Text>
              </View>
            </View>
          )}

          {/* Recent activity — no activity table yet */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No recent activity yet</Text>
            </View>
          </View>

          {/* Favourite verse — only if the user has set one */}
          {profile?.favorite_verse ? (
            <View style={styles.verseCard}>
              <BookOpen size={18} color={colors.primary} style={styles.verseIcon} />
              <Text style={styles.verseText}>"{profile.favorite_verse}"</Text>
              <Text style={styles.verseAuthor}>— {displayName}'s favourite verse</Text>
            </View>
          ) : null}

          <View style={{ height: 40 }} />
        </AutoScrollView>
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingVertical: 14,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    scrollContent: { paddingHorizontal: 24 },

    // Center states (loading / error)
    centerState: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingHorizontal: 32,
      gap: 12,
    },
    centerStateLabel: {
      fontSize: 14,
      color: colors.mutedForeground,
      marginTop: 12,
    },
    errorIconWrap: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: colors.secondary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginBottom: 4,
    },
    errorTitle: {
      fontSize: 20,
      fontWeight: "800" as const,
      color: colors.foreground,
      letterSpacing: -0.3,
      textAlign: "center" as const,
    },
    errorSub: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: "center" as const,
      lineHeight: 20,
      maxWidth: 280,
    },
    retryBtn: {
      marginTop: 8,
      paddingHorizontal: 28,
      paddingVertical: 14,
      backgroundColor: colors.primary,
      borderRadius: 16,
    },
    retryBtnText: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
    },
    backLink: { paddingVertical: 8 },
    backLinkText: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
    },

    // Profile section
    profileSection: { alignItems: "center" as const, marginBottom: 28 },
    avatarWrap: { position: "relative" as const, marginBottom: 16 },
    avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: colors.card },
    avatarPlaceholder: {
      backgroundColor: colors.secondary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    name: {
      fontSize: 24,
      fontWeight: "800" as const,
      color: colors.foreground,
      textAlign: "center" as const,
      marginBottom: 6,
    },
    bio: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: "center" as const,
      lineHeight: 20,
      maxWidth: 300,
      marginBottom: 18,
    },

    // Own profile edit button
    editBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 28,
      borderRadius: 999,
      marginTop: 4,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    editBtnText: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
    },

    // Other user actions
    actionRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      width: "100%" as const,
      marginTop: 4,
    },
    friendBtn: {
      flex: 1,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 7,
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 999,
    },
    friendBtnText: {
      fontSize: 13,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
    },
    disabledBtn: {
      opacity: 0.55,
    },
    messageBtn: {
      flex: 1,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 999,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    messageBtnText: { fontSize: 15, fontWeight: "700" as const, color: colors.primaryForeground },
    favWrap: { position: "relative" as const },
    heartCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.secondary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    tooltip: {
      position: "absolute" as const,
      bottom: 64,
      right: -10,
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      minWidth: 140,
      alignItems: "center" as const,
    },
    tooltipArrow: {
      position: "absolute" as const,
      bottom: -6,
      right: 24,
      width: 12,
      height: 12,
      backgroundColor: colors.primary,
      transform: [{ rotate: "45deg" }],
    },
    tooltipText: { color: colors.primaryForeground, fontSize: 13, fontWeight: "700" as const },

    // Stats
    statsRow: { flexDirection: "row" as const, gap: 12, marginBottom: 28 },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 24,
      alignItems: "center" as const,
      borderWidth: 1,
      borderColor: colors.border + "80",
    },
    statNum: { fontSize: 20, fontWeight: "800" as const, color: colors.foreground },
    statLabel: {
      fontSize: 9,
      fontWeight: "700" as const,
      color: colors.mutedForeground,
      letterSpacing: 0.5,
      marginTop: 4,
    },

    // Sections
    section: { marginBottom: 24 },
    sectionTitle: {
      fontSize: 11,
      fontWeight: "800" as const,
      color: colors.mutedForeground,
      letterSpacing: 1.5,
      marginBottom: 12,
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      paddingVertical: 28,
      paddingHorizontal: 20,
      alignItems: "center" as const,
      borderWidth: 1,
      borderColor: colors.border + "50",
    },
    emptyText: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontWeight: "500" as const,
    },

    // Verse
    verseCard: {
      backgroundColor: colors.secondary,
      borderRadius: 28,
      padding: 24,
      alignItems: "center" as const,
      borderWidth: 1,
      borderColor: colors.primary + "10",
      marginBottom: 8,
    },
    verseIcon: { marginBottom: 10 },
    verseText: {
      fontSize: 14,
      fontWeight: "500" as const,
      color: colors.secondaryForeground,
      textAlign: "center" as const,
      marginBottom: 12,
      lineHeight: 22,
    },
    verseAuthor: {
      fontSize: 12,
      fontWeight: "700" as const,
      color: colors.primary,
      letterSpacing: 0.5,
    },
  });
}
