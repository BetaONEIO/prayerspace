import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useFocusEffect } from "expo-router";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { groupChatSchema, groupRpc, newGroupClientId } from "@/lib/groupChat";
import { isUUID } from "@/lib/chat";

export function useScopedGroupState<T>(scope: object, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const latestScope = useRef(scope);
  latestScope.current = scope;
  const [state, setState] = useState({ scope, value: initial });
  const value = state.scope === scope ? state.value : initial;
  const setValue = useCallback((next: SetStateAction<T>) => {
    if (latestScope.current !== scope) return;
    setState(previous => latestScope.current !== scope ? previous : ({
      scope,
      value: typeof next === "function" ? (next as (value: T) => T)(previous.scope === scope ? previous.value : initial) : next,
    }));
  }, [scope, initial]);
  return [value, setValue];
}

export function useGroupChat(groupId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scope = useMemo(() => ({ userId: user?.id, groupId, generation: newGroupClientId() }), [user?.id, groupId]);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const [connection, setConnection] = useScopedGroupState<"connecting" | "live" | "offline">(scope, "connecting");
  const queryKey = useMemo(() => ["group-chat", user?.id, groupId, scope.generation], [scope]);
  const query = useInfiniteQuery({
    queryKey, enabled: !!user?.id && isUUID(groupId),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => groupRpc(supabase, user!.id, "get_group_chat", { p_group_id: groupId, p_before_id: pageParam }, groupChatSchema),
    getNextPageParam: last => last.messages.length === 100 ? last.messages[0].id : undefined,
    staleTime: 0, refetchInterval: 5000, retry: 1,
  });
  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: ["prayer-chat-groups", user?.id] }),
    ]);
  }, [queryClient, queryKey, user?.id]);

  useFocusEffect(useCallback(() => {
    if (user?.id && isUUID(groupId)) void queryClient.invalidateQueries({ queryKey });
  }, [scope, queryClient, queryKey]));

  useEffect(() => {
    if (!user?.id || !isUUID(groupId)) return;
    let active = true;
    const changed = () => { if (active) void queryClient.invalidateQueries({ queryKey }); };
    const channel = supabase.channel(`group-chat:${user.id}:${groupId}:${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${groupId}` }, changed)
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, changed)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_participants", filter: `conversation_id=eq.${groupId}` }, changed)
      .subscribe(status => {
        if (!active) return;
        setConnection(status === "SUBSCRIBED" ? "live" : status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED" ? "offline" : "connecting");
        if (status === "SUBSCRIBED") changed();
      });
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [scope, queryClient, queryKey, setConnection]);

  const chat = query.data?.pages[0] ?? null;
  const messages = useMemo(() => query.data?.pages.flatMap(page => page.messages)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)) ?? [], [query.data]);
  return { user, scope, currentScope, query, chat, messages, connection, refresh };
}
