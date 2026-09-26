import React, { useCallback, useMemo } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { ChevronLeft, Clock3, Users2, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AutoScrollView } from "@/components/AutoScrollView";
import AvatarImage from "@/components/AvatarImage";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { supabase } from "@/lib/supabase";
import { loadPendingFriendRequests, type PendingFriendRequest } from "@/lib/friendRequests";
import { useAuth } from "@/providers/AuthProvider";

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} · ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

export default function SentFriendRequestsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading, isError, error, refetch } = useQuery<PendingFriendRequest[]>({
    queryKey: ["friend_requests_sent", user?.id],
    queryFn: () => loadPendingFriendRequests(user!.id, "sent"),
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  const cancelMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error: rpcError } = await supabase.rpc("cancel_friend_request", {
        request_id: requestId,
      });
      if (rpcError) throw rpcError;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["friend_requests_sent", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["friend_requests_relationships", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["friend_requests_incoming", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["friend_requests_incoming_count", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["friends", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["friendIds", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["feed-posts", user?.id] });
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (mutationError: unknown) => {
      const message = mutationError instanceof Error
        ? mutationError.message
        : (mutationError as { message?: string })?.message ?? "Could not cancel request. Please try again.";
      Alert.alert("Could not cancel request", message);
    },
  });

  const handleCancel = useCallback((requestId: string, name: string) => {
    Alert.alert(
      "Cancel friend request?",
      `Your request to ${name} will be withdrawn.`,
      [
        { text: "Keep Request", style: "cancel" },
        {
          text: "Cancel Request",
          style: "destructive",
          onPress: () => cancelMutation.mutate(requestId),
        },
      ],
    );
  }, [cancelMutation]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Go back">
            <ChevronLeft size={20} color={colors.secondaryForeground} />
          </Pressable>
          <Text style={styles.headerTitle}>Sent Requests</Text>
          <View style={styles.headerSpacer} />
        </View>

        <AutoScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingWrap}><ActivityIndicator color={colors.primary} /></View>
          ) : isError ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}><Clock3 size={42} color={colors.primary + "50"} /></View>
              <Text style={styles.emptyTitle}>Could not load sent requests</Text>
              <Text style={styles.emptyDesc}>
                {error instanceof Error ? error.message : "Check your connection and try again."}
              </Text>
              <Pressable style={styles.retryBtn} onPress={() => void refetch()}>
                <Text style={styles.retryBtnText}>Try Again</Text>
              </Pressable>
            </View>
          ) : requests.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}><Users2 size={44} color={colors.primary + "50"} /></View>
              <Text style={styles.emptyTitle}>No sent requests</Text>
              <Text style={styles.emptyDesc}>Friend requests you send will appear here while they are waiting for a response.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              <Text style={styles.listLabel}>WAITING FOR A RESPONSE</Text>
              {requests.map((request, index) => {
                const name = request.profile?.full_name?.trim() || "Profile unavailable";
                return (
                  <View key={request.id} style={[styles.card, index < requests.length - 1 && styles.cardBorder]}>
                    <Pressable
                      style={styles.cardLeft}
                      onPress={() => router.push(`/user/${request.receiver_id}`)}
                    >
                      <AvatarImage
                        avatarPath={request.profile?.avatar_url ?? null}
                        fallbackSeed={name}
                        style={styles.avatar}
                      />
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
                        {request.profile?.bio ? <Text style={styles.cardBio} numberOfLines={1}>{request.profile.bio}</Text> : null}
                        <Text style={styles.cardTime}>{formatDateTime(request.created_at)}</Text>
                      </View>
                    </Pressable>
                    <Pressable
                      style={[styles.cancelBtn, cancelMutation.isPending && styles.btnDisabled]}
                      onPress={() => handleCancel(request.id, name)}
                      disabled={cancelMutation.isPending}
                      accessibilityRole="button"
                      accessibilityLabel={`Cancel request to ${name}`}
                    >
                      <X size={15} color={colors.mutedForeground} />
                      <Text style={styles.cancelBtnText}>
                        {cancelMutation.isPending && cancelMutation.variables === request.id ? "Cancelling..." : "Cancel"}
                      </Text>
                    </Pressable>
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
    headerSpacer: { width: 40 },
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
    cancelBtn: { flexDirection: "row" as const, alignItems: "center" as const, gap: 5, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.secondary, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 9 },
    cancelBtnText: { fontSize: 12, fontWeight: "700" as const, color: colors.mutedForeground },
    btnDisabled: { opacity: 0.5 },
    retryBtn: { marginTop: 20, backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 11 },
    retryBtnText: { fontSize: 13, fontWeight: "700" as const, color: colors.primaryForeground },
  });
}