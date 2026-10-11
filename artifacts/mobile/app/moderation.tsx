import React, { useMemo, useState } from "react";
import { Alert, ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AutoScrollView } from "@/components/AutoScrollView";
import { useAuth } from "@/providers/AuthProvider";
import { useThemeColors } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { assertLocalDataIdentity, getLocalDataIdentity } from "@/lib/accountLocalData";

type Report = { id: string; target_kind: string; reason: string; created_at: string; snapshot: { content?: string; name?: string } };
export default function ModerationScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { user, localDataEpoch } = useAuth();
  const owner = useMemo(() => ({ ...getLocalDataIdentity() }), [user?.id, localDataEpoch]);
  const client = useQueryClient();
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queue = useQuery({
    queryKey: ["moderationQueue", user?.id, localDataEpoch],
    enabled: !!user,
    refetchInterval: 30000,
    queryFn: async () => {
      assertLocalDataIdentity(owner);
      const { data, error } = await supabase.rpc("get_moderation_queue").abortSignal(AbortSignal.timeout(15000));
      assertLocalDataIdentity(owner);
      if (error) throw new Error("Moderator access is required, or the queue is temporarily unavailable.");
      if (!Array.isArray(data)) throw new Error("The moderation queue returned an invalid response.");
      return data as Report[];
    },
    retry: false,
  });
  const review = async (report: Report, status: "resolved" | "dismissed", remove = false) => {
    setWorking(report.id); setError(null);
    try {
      assertLocalDataIdentity(owner);
      const { error } = await supabase.rpc("review_abuse_report", {
        p_expected_user_id: owner.userId, p_report_id: report.id, p_status: status, p_remove_content: remove,
      });
      assertLocalDataIdentity(owner);
      if (error) throw new Error("Review could not be saved. Please retry.");
      await client.invalidateQueries({ queryKey: ["moderationQueue", user?.id, localDataEpoch] });
    } catch (error) { setError(error instanceof Error ? error.message : "Review failed"); }
    finally { setWorking(null); }
  };
  const confirmRemoval = (report: Report) => {
    const run = () => void review(report, "resolved", true);
    const message = "Permanently remove this reported post or message? This also removes associated reactions or updates. This cannot be undone.";
    if (Platform.OS === "web") { if (window.confirm(message)) run(); }
    else Alert.alert("Remove reported content", message, [
      { text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: run },
    ]);
  };
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
    <View style={styles.header}>
      <Pressable onPress={() => router.back()}><Text style={{ color: colors.primary }}>Back</Text></Pressable>
      <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: "700" }}>Moderation</Text>
      <Pressable onPress={() => void queue.refetch()}><Text style={{ color: colors.primary }}>Refresh</Text></Pressable>
    </View>
    <AutoScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text style={{ color: colors.mutedForeground }}>Open reports, oldest first (up to 100). Access is assigned by the project administrator; ordinary users cannot grant themselves access.</Text>
      {queue.isPending && <ActivityIndicator color={colors.primary} />}
      {(error || queue.error) && <Text accessibilityRole="alert" style={{ color: colors.destructive }}>{error ?? queue.error?.message}</Text>}
      {queue.data?.length === 0 && <Text style={{ color: colors.foreground }}>No open reports.</Text>}
      {queue.data?.map(report => <View key={report.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={{ color: colors.foreground, fontWeight: "700" }}>{report.target_kind} · {report.reason}</Text>
        <Text style={{ color: colors.mutedForeground }}>{new Date(report.created_at).toLocaleString()}</Text>
        <Text style={{ color: colors.foreground }}>{report.snapshot.content ?? report.snapshot.name ?? "Account or conversation report"}</Text>
        <View style={{ flexDirection: "row", gap: 18, flexWrap: "wrap" }}>
          <Pressable disabled={!!working} onPress={() => void review(report, "resolved")}><Text style={{ color: colors.primary }}>Mark resolved</Text></Pressable>
          <Pressable disabled={!!working} onPress={() => void review(report, "dismissed")}><Text style={{ color: colors.mutedForeground }}>Dismiss</Text></Pressable>
          {["post", "message"].includes(report.target_kind) && <Pressable disabled={!!working} onPress={() => confirmRemoval(report)}>
            <Text style={{ color: colors.destructive }}>Remove content</Text>
          </Pressable>}
        </View>
        {working === report.id && <ActivityIndicator color={colors.primary} />}
      </View>)}
    </AutoScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  header: { padding: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  card: { borderRadius: 20, borderWidth: 1, padding: 18, gap: 14 },
});
