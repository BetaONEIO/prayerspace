import React, { useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, Platform } from "react-native";
import { AutoScrollView } from "@/components/AutoScrollView";
import AvatarImage from "@/components/AvatarImage";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { ChevronLeft, UserCheck, X, Users2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface FriendRequestRow {
  id: string;
  sender_id: string;
  created_at: string;
  sender: { full_name: string | null; avatar_url: string | null; bio: string | null; } | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function FriendRequestsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery<FriendRequestRow[]>({
    queryKey: ["friend_requests_incoming", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("friend_requests").select("id, sender_id, created_at, sender:profiles!friend_requests_sender_id_fkey(full_name, avatar_url, bio)").eq("receiver_id", user.id).eq("status", "pending").order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as FriendRequestRow[]) ?? [];
    },
    enabled: !!user?.id,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: "accepted" | "declined" }) => {
      const { error } = await supabase.from("friend_requests").update({ status }).eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      void queryClient.invalidateQueries({ queryKey: ["friend_requests_incoming", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["friend_requests_incoming_count", user?.id] });
      if (Platform.OS !== "web") void Haptics.notificationAsync(status === "accepted" ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    },
    onError: () => Alert.alert("Error", "Could not update request. Please try again."),
  });

  const handleAccept = useCallback((requestId: string) => respondMutation.mutate({ requestId, status: "accepted" }), [respondMutation]);
  const handleDecline = useCallback((requestId: string) => respondMutation.mutate({ requestId, status: "declined" }), [respondMutation]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}><ChevronLeft size={20} color={colors.secondaryForeground} /></Pressable>
          <Text style={styles.headerTitle}>Friend Requests</Text>
          {requests.length > 0 ? (
            <View style={styles.badge}><Text style={styles.badgeText}>{requests.length}</Text></View>
          ) : <View style={{ width: 40 }} />}
        </View>

        <AutoScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingWrap}><ActivityIndicator color={colors.primary} /></View>
          ) : requests.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}><Users2 size={44} color={colors.primary + "50"} /></View>
              <Text style={styles.emptyTitle}>No pending requests</Text>
              <Text style={styles.emptyDesc}>When someone sends you a friend request on Prayer Space, it will appear here.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              <Text style={styles.listLabel}>PEOPLE WHO WANT TO CONNECT</Text>
              {requests.map((req, index) => {
                const name = req.sender?.full_name ?? "Someone";
                return (
                  <View key={req.id} style={[styles.card, index < requests.length - 1 && styles.cardBorder]}>
                    <View style={styles.cardLeft}>
                      <AvatarImage avatarPath={req.sender?.avatar_url ?? null} fallbackSeed={name} style={styles.avatar} />
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
                        {req.sender?.bio && <Text style={styles.cardBio} numberOfLines={1}>{req.sender.bio}</Text>}
                        <Text style={styles.cardTime}>{timeAgo(req.created_at)}</Text>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      <Pressable style={[styles.declineBtn, respondMutation.isPending && styles.btnDisabled]} onPress={() => handleDecline(req.id)} disabled={respondMutation.isPending} hitSlop={6}>
                        <X size={16} color={colors.mutedForeground} />
                      </Pressable>
                      <Pressable style={[styles.acceptBtn, respondMutation.isPending && styles.btnDisabled]} onPress={() => handleAccept(req.id)} disabled={respondMutation.isPending}>
                        <UserCheck size={15} color={colors.primaryForeground} />
                        <Text style={styles.acceptBtnText}>Accept</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          <View style={{ height: 40 }} />
        </AutoScrollView>
      </SafeAreaView>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 14 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: "center" as const, justifyContent: "center" as const },
    headerTitle: { fontSize: 20, fontWeight: "700" as const, color: colors.foreground },
    badge: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + "18", alignItems: "center" as const, justifyContent: "center" as const },
    badgeText: { fontSize: 15, fontWeight: "800" as const, color: colors.primary },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, flexGrow: 1 },
    loadingWrap: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, paddingTop: 80 },
    emptyState: { flex: 1, alignItems: "center" as const, paddingTop: 80, paddingHorizontal: 32 },
    emptyIconWrap: { width: 88, height: 88, borderRadius: 28, backgroundColor: colors.primary + "0E", alignItems: "center" as const, justifyContent: "center" as const, marginBottom: 24 },
    emptyTitle: { fontSize: 20, fontWeight: "700" as const, color: colors.foreground, marginBottom: 10, textAlign: "center" as const },
    emptyDesc: { fontSize: 14, color: colors.mutedForeground, textAlign: "center" as const, lineHeight: 22 },
    list: { gap: 0 },
    listLabel: { fontSize: 11, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 1.2, marginBottom: 12, paddingHorizontal: 4 },
    card: { backgroundColor: colors.card, borderRadius: 0, paddingVertical: 16, paddingHorizontal: 4, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, gap: 12 },
    cardBorder: { borderBottomWidth: 1, borderBottomColor: colors.border + "50" },
    cardLeft: { flex: 1, flexDirection: "row" as const, alignItems: "center" as const, gap: 14 },
    avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: colors.primary + "20" },
    cardInfo: { flex: 1, gap: 2 },
    cardName: { fontSize: 16, fontWeight: "700" as const, color: colors.foreground },
    cardBio: { fontSize: 13, color: colors.mutedForeground },
    cardTime: { fontSize: 11, color: colors.mutedForeground + "99" },
    cardActions: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
    declineBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.secondary, alignItems: "center" as const, justifyContent: "center" as const, borderWidth: 1, borderColor: colors.border },
    acceptBtn: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
    acceptBtnText: { fontSize: 13, fontWeight: "700" as const, color: colors.primaryForeground },
    btnDisabled: { opacity: 0.5 },
  });
}
