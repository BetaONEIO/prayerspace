import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { ChevronLeft, Users2 } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import AvatarImage from "@/components/AvatarImage";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { AutoScrollView } from "@/components/AutoScrollView";

type FriendProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export default function FriendsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();

  const { data: friends = [], isLoading, isError, refetch } = useQuery<FriendProfile[]>({
    queryKey: ["friends", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: relationships, error: relationshipsError } = await supabase
        .from("friend_requests")
        .select("sender_id, receiver_id")
        .eq("status", "accepted")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      if (relationshipsError) throw relationshipsError;

      const friendIds = (relationships ?? []).map((relationship) =>
        relationship.sender_id === user.id
          ? relationship.receiver_id
          : relationship.sender_id
      );
      if (friendIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio")
        .in("id", [...new Set(friendIds)]);
      if (profilesError) throw profilesError;
      return (profiles as FriendProfile[] | null) ?? [];
    },
    enabled: !!user?.id,
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Go back">
          <ChevronLeft size={20} color={colors.secondaryForeground} />
        </Pressable>
        <Text style={styles.headerTitle}>Friends</Text>
        <View style={styles.headerSpacer} />
      </View>

      <AutoScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : isError ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyTitle}>Could not load friends</Text>
            <Text style={styles.emptyDescription}>Check your connection and try again.</Text>
            <Pressable style={styles.retryButton} onPress={() => void refetch()}>
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        ) : friends.length === 0 ? (
          <View style={styles.centerState}>
            <View style={styles.emptyIcon}>
              <Users2 size={38} color={colors.primary + "70"} />
            </View>
            <Text style={styles.emptyTitle}>No friends yet</Text>
            <Text style={styles.emptyDescription}>
              Connect with people you know and pray together on Prayer Space.
            </Text>
            <Pressable style={styles.retryButton} onPress={() => router.push("/find-friend" as never)}>
              <Text style={styles.retryText}>Find Friends</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {friends.map((friend) => {
              const name = friend.full_name?.trim() || "Prayer Space User";
              return (
                <Pressable
                  key={friend.id}
                  style={({ pressed }) => [styles.friendRow, pressed && styles.pressed]}
                  onPress={() => router.push(`/user/${friend.id}`)}
                >
                  <AvatarImage
                    avatarPath={friend.avatar_url}
                    fallbackSeed={name}
                    style={styles.avatar}
                  />
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName} numberOfLines={1}>{name}</Text>
                    {friend.bio ? (
                      <Text style={styles.friendBio} numberOfLines={1}>{friend.bio}</Text>
                    ) : (
                      <Text style={styles.friendBio}>Prayer Space friend</Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </AutoScrollView>
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
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: { fontSize: 20, fontWeight: "800", color: colors.foreground },
    headerSpacer: { width: 40 },
    content: { flexGrow: 1, padding: 20 },
    loading: { marginTop: 50 },
    list: {
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    friendRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    pressed: { opacity: 0.7 },
    avatar: { width: 52, height: 52, borderRadius: 26 },
    friendInfo: { flex: 1, gap: 4 },
    friendName: { fontSize: 16, fontWeight: "700", color: colors.foreground },
    friendBio: { fontSize: 13, color: colors.mutedForeground },
    centerState: { alignItems: "center", justifyContent: "center", flex: 1, paddingHorizontal: 24 },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 18,
    },
    emptyTitle: { fontSize: 20, fontWeight: "800", color: colors.foreground, textAlign: "center" },
    emptyDescription: { fontSize: 14, lineHeight: 21, color: colors.mutedForeground, textAlign: "center", marginTop: 8, maxWidth: 300 },
    retryButton: { marginTop: 22, backgroundColor: colors.primary, borderRadius: 999, paddingHorizontal: 22, paddingVertical: 13 },
    retryText: { fontSize: 14, fontWeight: "700", color: colors.primaryForeground },
  });
}