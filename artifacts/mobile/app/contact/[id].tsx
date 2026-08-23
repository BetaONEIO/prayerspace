import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated as RNAnimated,
  ActivityIndicator,
} from "react-native";
import { AutoScrollView } from "@/components/AutoScrollView";
import { Image } from "expo-image";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { ArrowLeft, MoreHorizontal, MessageCircle, Heart, User, AlertCircle } from "lucide-react-native";
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

export default function ContactDetailScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavourited, setIsFavourited] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipOpacity = useRef(new RNAnimated.Value(0)).current;

  const isOwnProfile = Boolean(id && user?.id === id);

  const fetchProfile = useCallback(async () => {
    if (!id) { setError("No user ID provided."); setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio, favorite_verse")
        .eq("id", id)
        .single();
      if (fetchError || !data) {
        setError("This profile could not be loaded.");
      } else {
        setProfile(data);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { void fetchProfile(); }, [fetchProfile]);

  const handleFavourite = useCallback(() => {
    const newVal = !isFavourited;
    setIsFavourited(newVal);
    if (newVal) {
      setShowTooltip(true);
      RNAnimated.sequence([
        RNAnimated.timing(tooltipOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        RNAnimated.delay(1500),
        RNAnimated.timing(tooltipOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setShowTooltip(false));
    }
  }, [isFavourited, tooltipOpacity]);

  const displayName = profile?.full_name?.trim() || "Prayer Space User";

  return (
    <AutoScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerBg}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerRow}>
            <Pressable style={styles.glassBtn} onPress={() => router.back()}>
              <ArrowLeft size={20} color={colors.foreground} />
            </Pressable>
            {isLoading ? (
              <View style={[styles.avatarWrap, styles.avatarPlaceholder]}>
                <User size={32} color={colors.mutedForeground} />
              </View>
            ) : profile?.avatar_url ? (
              <View style={styles.avatarWrap}>
                <Image source={{ uri: profile.avatar_url }} style={styles.avatar} contentFit="cover" />
              </View>
            ) : (
              <View style={[styles.avatarWrap, styles.avatarPlaceholder]}>
                <User size={32} color={colors.mutedForeground} />
              </View>
            )}
            <Pressable style={styles.glassBtn}>
              <MoreHorizontal size={20} color={colors.foreground} />
            </Pressable>
          </View>

          {!isLoading && !error && (
            <View style={styles.nameSection}>
              <Text style={styles.name}>{displayName}</Text>
              {profile?.full_name ? (
                <Text style={styles.handle}>
                  @{profile.full_name.toLowerCase().replace(/\s+/g, "_")}
                </Text>
              ) : null}
            </View>
          )}
        </SafeAreaView>
      </View>

      <View style={styles.body}>
        {isLoading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centerState}>
            <AlertCircle size={36} color={colors.mutedForeground} />
            <Text style={styles.errorTitle}>Profile unavailable</Text>
            <Text style={styles.errorSub}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={() => void fetchProfile()}>
              <Text style={styles.retryBtnText}>Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.actionRow}>
              {!isOwnProfile ? (
                <>
                  <Pressable
                    style={styles.prayBtn}
                    onPress={() => router.push(`/chat/${id ?? ""}` as never)}
                  >
                    <MessageCircle size={20} color={colors.primaryForeground} />
                    <Text style={styles.prayBtnText}>Message</Text>
                  </Pressable>
                  <View style={styles.favWrap}>
                    <Pressable style={styles.chatBtn} onPress={handleFavourite}>
                      <Heart
                        size={22}
                        color={isFavourited ? colors.primary : colors.secondaryForeground}
                        fill={isFavourited ? colors.primary : "none"}
                      />
                    </Pressable>
                    {showTooltip && (
                      <RNAnimated.View style={[styles.tooltip, { opacity: tooltipOpacity }]}>
                        <View style={styles.tooltipArrow} />
                        <Text style={styles.tooltipText}>Added to Favourites</Text>
                      </RNAnimated.View>
                    )}
                  </View>
                </>
              ) : (
                <Pressable
                  style={styles.prayBtn}
                  onPress={() => router.push("/edit-profile")}
                >
                  <Text style={styles.prayBtnText}>Edit Profile</Text>
                </Pressable>
              )}
            </View>

            {profile?.bio ? (
              <View style={[styles.section, { marginBottom: 24 }]}>
                <Text style={styles.sectionLabel}>About</Text>
                <Text style={styles.bioText}>{profile.bio}</Text>
              </View>
            ) : null}

            {profile?.favorite_verse ? (
              <View style={[styles.section, { marginBottom: 40 }]}>
                <Text style={styles.sectionLabel}>Favourite Verse</Text>
                <Text style={styles.verseText}>"{profile.favorite_verse}"</Text>
              </View>
            ) : null}

            {!profile?.bio && !profile?.favorite_verse ? (
              <View style={[styles.section, { marginBottom: 40 }]}>
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No profile information added yet</Text>
                </View>
              </View>
            ) : null}
          </>
        )}
      </View>
    </AutoScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: colors.background },
    scrollContent: { paddingBottom: 24 },
    headerBg: { backgroundColor: colors.primary + "18", paddingBottom: 20 },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingTop: 12,
    },
    glassBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card + "80",
      alignItems: "center",
      justifyContent: "center",
    },
    avatarWrap: { position: "relative" },
    avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: colors.card },
    avatarPlaceholder: {
      width: 88,
      height: 88,
      borderRadius: 44,
      borderWidth: 3,
      borderColor: colors.card,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    nameSection: { alignItems: "center", paddingTop: 10 },
    name: { fontSize: 22, fontWeight: "800" as const, color: colors.foreground, marginTop: 12 },
    handle: { fontSize: 14, color: colors.mutedForeground, marginTop: 4 },
    body: { paddingHorizontal: 24, paddingTop: 16 },
    actionRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
    prayBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 999,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    prayBtnText: { fontSize: 15, fontWeight: "700" as const, color: colors.primaryForeground },
    favWrap: { position: "relative" },
    chatBtn: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    tooltip: {
      position: "absolute",
      bottom: 64,
      right: -10,
      backgroundColor: colors.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 10,
      minWidth: 140,
      alignItems: "center",
    },
    tooltipArrow: {
      position: "absolute",
      bottom: -6,
      right: 24,
      width: 12,
      height: 12,
      backgroundColor: colors.primary,
      transform: [{ rotate: "45deg" }],
    },
    tooltipText: { color: colors.primaryForeground, fontSize: 13, fontWeight: "700" as const },
    section: { marginBottom: 24 },
    sectionLabel: {
      fontSize: 11,
      fontWeight: "800" as const,
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 1.5,
      marginBottom: 10,
    },
    bioText: { fontSize: 14, color: colors.foreground, lineHeight: 21 },
    verseText: {
      fontSize: 14,
      fontStyle: "italic",
      color: colors.mutedForeground,
      lineHeight: 21,
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      paddingVertical: 28,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border + "50",
    },
    emptyText: { fontSize: 14, color: colors.mutedForeground, fontWeight: "500" as const },
    centerState: {
      paddingVertical: 48,
      alignItems: "center",
      gap: 12,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.foreground,
      textAlign: "center",
    },
    errorSub: { fontSize: 14, color: colors.mutedForeground, textAlign: "center" },
    retryBtn: {
      marginTop: 8,
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: colors.primary,
      borderRadius: 14,
    },
    retryBtnText: { fontSize: 14, fontWeight: "700" as const, color: colors.primaryForeground },
  });
}
