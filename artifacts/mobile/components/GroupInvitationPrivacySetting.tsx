import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronRight, Users } from "lucide-react-native";
import { useFocusEffect } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useAuth } from "@/providers/AuthProvider";
import { useThemeColors } from "@/providers/ThemeProvider";
import { supabase } from "@/lib/supabase";
import { groupRpc, newGroupClientId } from "@/lib/groupChat";

const preferenceSchema = z.enum(["friends", "none"]);
type Preference = z.infer<typeof preferenceSchema>;
const options: { value: Preference; label: string }[] = [
  { value: "friends", label: "Friends" },
  { value: "none", label: "No one" },
];

export default function GroupInvitationPrivacySetting() {
  const { user } = useAuth();
  return <AccountInvitationSetting key={user?.id ?? "signed-out"} userId={user?.id} />;
}

function AccountInvitationSetting({ userId }: { userId?: string }) {
  const colors = useThemeColors();
  const styles = useMemo(() => StyleSheet.create({
    container: { padding: 18, gap: 10 },
    row: { flexDirection: "row", alignItems: "center", gap: 14 },
    title: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.foreground },
    value: { fontSize: 13, fontWeight: "700", color: colors.primary },
    description: { fontSize: 12, color: colors.mutedForeground },
    option: { padding: 12, borderRadius: 10, backgroundColor: colors.secondary },
    optionText: { color: colors.primary, fontWeight: "600" },
    error: { color: colors.destructive },
    saved: { color: colors.primary },
  }), [colors]);
  const client = useQueryClient();
  const generation = useMemo(() => newGroupClientId(), []);
  const key = useMemo(() => ["group-invitation-preference", userId, generation], [userId, generation]);
  const [expanded, setExpanded] = useState(false);
  const [saved, setSaved] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const save = useMutation({
    onMutate: async () => { await client.cancelQueries({ queryKey: key }); },
    mutationFn: (preference: Preference) => {
      if (!userId) throw new Error("Sign in to change your invitation preference.");
      return groupRpc(supabase, userId, "set_group_invitation_preference",
        { p_preference: preference }, preferenceSchema);
    },
    onSuccess: async (preference) => {
      if (!mounted.current) return;
      client.setQueryData(key, preference);
      setExpanded(false);
      setSaved(true);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["group-invitations", userId] }),
        client.invalidateQueries({ queryKey: ["group-chat-invites", userId] }),
      ]);
    },
  });
  const query = useQuery({
    queryKey: key, enabled: !!userId && !save.isPending,
    queryFn: () => groupRpc(supabase, userId!, "get_group_invitation_preference", {}, preferenceSchema),
    staleTime: 0, refetchInterval: 5000, retry: 1,
  });
  useFocusEffect(useCallback(() => {
    if (userId && !save.isPending) void client.invalidateQueries({ queryKey: key });
  }, [userId, save.isPending, client, key]));
  const label = save.isPending ? "Saving…" : !userId ? "Sign in" :
    query.data === "none" ? "No one" : query.data === "friends" ? "Friends" :
      query.isError ? "Unavailable" : "Loading…";

  return <View style={styles.container}>
    <Pressable accessibilityRole="button" accessibilityLabel="Who can invite you to groups"
      accessibilityState={{ expanded, disabled: !query.isSuccess || save.isPending }}
      disabled={!query.isSuccess || save.isPending}
      onPress={() => { save.reset(); setSaved(false); setExpanded(v => !v); }}
      style={styles.row}>
      <Users size={18} color={colors.primary + "90"} />
      <Text style={styles.title}>Who can invite you to groups</Text>
      <Text style={styles.value}>{label}</Text>
      <ChevronRight size={16} color={colors.mutedForeground} />
    </Pressable>
    <Text style={styles.description}>
      Only accepted friends can invite you. Choosing No one also cancels pending invitations. Existing memberships stay unchanged.
    </Text>
    {expanded && options.map(option => <Pressable key={option.value}
      accessibilityRole="radio" accessibilityLabel={option.label}
      accessibilityState={{ checked: query.data === option.value, disabled: save.isPending }}
      disabled={save.isPending} onPress={() => { setSaved(false); save.mutate(option.value); }}
      style={styles.option}>
      <Text style={styles.optionText}>{option.label}{query.data === option.value ? " ✓" : ""}</Text>
    </Pressable>)}
    {query.isError && <Pressable accessibilityRole="button" onPress={() => void query.refetch()}>
      <Text style={styles.error}>Couldn't load your invitation preference. Tap to retry.</Text>
    </Pressable>}
    {save.isError && <Text accessibilityRole="alert" style={styles.error}>
      Couldn't save your preference: {save.error.message} Choose an option to retry.
    </Text>}
    {saved && !save.isError && <Text accessibilityLiveRegion="polite" style={styles.saved}>Preference saved.</Text>}
  </View>;
}
