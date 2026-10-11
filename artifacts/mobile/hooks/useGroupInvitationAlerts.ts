import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { groupRpc, newGroupClientId, emptyGroupResult } from "@/lib/groupChat";

export const groupInvitationAlertPrefix = "group-invite:";
const alertsSchema = z.array(z.object({
  id: z.string().uuid(), groupName: z.string(), inviterName: z.string(),
  createdAt: z.string().datetime({ offset: true }), unread: z.boolean(),
}));

// Used above the navigator: no navigation/focus hooks here. Polling refreshes
// other-device writes and cancellation, expiry, blocks and membership changes.
export function useGroupInvitationAlerts() {
  const { user } = useAuth();
  const client = useQueryClient();
  const generation = useMemo(() => newGroupClientId(), [user?.id]);
  const key = useMemo(() => ["group-invitation-alerts", user?.id, generation], [user?.id, generation]);
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const [operationError, setOperationError] = useState<string | null>(null);
  const query = useQuery({
    queryKey: key, enabled: !!user,
    queryFn: () => groupRpc(supabase, user!.id, "list_group_invitation_alerts", {}, alertsSchema),
    staleTime: 0, refetchInterval: 5000, retry: 1,
  });
  const update = useCallback((action: "read" | "dismiss" | "read_all", notificationId?: string) => {
    if (!user) return;
    void (async () => {
      try {
        await client.cancelQueries({ queryKey: key });
        if (!live.current) return;
        await groupRpc(supabase, user.id, "mark_group_invitation_alert", {
          p_action: action,
          p_invitation_id: notificationId ? notificationId.slice(groupInvitationAlertPrefix.length) : null,
        }, emptyGroupResult);
        if (!live.current) return;
        setOperationError(null);
        await client.invalidateQueries({ queryKey: key });
      } catch (error) {
        if (live.current) setOperationError(error instanceof Error ? error.message : "Could not update invitation alerts.");
      }
    })();
  }, [user?.id, client, key]);
  const retry = useCallback(() => {
    setOperationError(null);
    void query.refetch();
  }, [query.refetch]);
  return {
    data: query.data ?? [], loading: !!user && query.isLoading,
    error: operationError ?? (query.isError ? query.error.message : null),
    retry, update,
  };
}
