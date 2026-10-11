import { useMemo } from "react";
import { useFocusEffect } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { groupRpc, newGroupClientId } from "@/lib/groupChat";
import { groupInvitationsSchema } from "@/lib/groupInvitations";

export function useGroupInvitations(enabled = true) {
  const { user } = useAuth();
  const client = useQueryClient();
  const generation = useMemo(() => newGroupClientId(), [user?.id]);
  const key = useMemo(() => ["group-invitations", user?.id, generation], [user?.id, generation]);
  const query = useQuery({
    queryKey: key, enabled: !!user && enabled,
    queryFn: () => groupRpc(supabase, user!.id, "list_group_chat_invitations", {}, groupInvitationsSchema),
    staleTime: 0, refetchInterval: 5000, retry: 1,
  });
  useFocusEffect(useMemo(() => () => { if (user && enabled) void client.invalidateQueries({ queryKey: key }); }, [key, client, user?.id, enabled]));
  return { user, ...query };
}
