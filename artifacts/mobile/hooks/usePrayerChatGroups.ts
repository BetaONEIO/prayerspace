import { useEffect, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { groupListSchema, groupRpc, newGroupClientId } from "@/lib/groupChat";

export function usePrayerChatGroups() {
  const { user } = useAuth();
  const client = useQueryClient();
  const generation = useMemo(() => newGroupClientId(), [user?.id]);
  const key = useMemo(() => ["prayer-chat-groups", user?.id, generation], [user?.id, generation]);
  const query = useQuery({
    queryKey: key, enabled: !!user,
    queryFn: () => groupRpc(supabase, user!.id, "list_prayer_chat_groups", {}, groupListSchema),
    staleTime: 0, refetchInterval: 5000, retry: 1,
  });
  useFocusEffect(useMemo(() => () => { if (user) void client.invalidateQueries({ queryKey: key }); }, [key, client]));
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`prayer-chat-groups:${generation}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_participants", filter: `user_id=eq.${user.id}` },
        () => { void client.invalidateQueries({ queryKey: key }); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [key, user?.id, client, generation]);
  return { user, ...query };
}
