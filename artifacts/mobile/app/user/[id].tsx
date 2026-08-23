import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  ActivityIndicator,
} from "react-native";
import { AutoScrollView } from "@/components/AutoScrollView";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
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

type ProfileData = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  favorite_verse: string | null;
};

export default function UserProfileScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [prayerCount, setPrayerCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavourited, setIsFavourited] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

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
          <Pressable style={styles.iconBtn}>
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
                  style={styles.messageBtn}
                  onPress={() => router.push(`/chat/${id ?? ""}`)}
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
