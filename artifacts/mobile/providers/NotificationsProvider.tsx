import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import createContextHook from "@nkzw/create-context-hook";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useGroupInvitationAlerts, groupInvitationAlertPrefix } from "@/hooks/useGroupInvitationAlerts";

export interface AppNotification {
  id: string;
  type: "prayer" | "group" | "group_invitation" | "testimony" | "streak" | "request" | "comment" | "reaction" | "reply" | "member_joined" | "event" | "mention";
  title: string;
  body: string;
  time: string;
  avatar?: string;
  unread?: boolean;
  actions?: { label: string; variant: "primary" | "secondary" }[];
  targetId?: string;
  targetRoute?: string;
  groupName?: string;
  actorId?: string;
  requestId?: string;
  persisted?: boolean;
}

type DurableNotificationRow = {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: "friend_request" | "friend_request_accepted";
  request_id: string | null;
  read_at: string | null;
  created_at: string;
};

export const [NotificationsProvider, useNotifications] = createContextHook(() => {
  const { user } = useAuth();
  const [baseNotifications, setNotifications] = useState<AppNotification[]>([]);
  const invitationAlerts = useGroupInvitationAlerts();
  const notifications = useMemo<AppNotification[]>(() => [
    ...invitationAlerts.data.map(alert => ({
      id: `${groupInvitationAlertPrefix}${alert.id}`,
      type: "group_invitation" as const,
      title: "New group invitation",
      body: `${alert.inviterName} invited you to "${alert.groupName}". Review the invitation to accept or decline.`,
      time: formatNotificationTime(alert.createdAt),
      unread: alert.unread, targetRoute: "/manage-invites", persisted: true,
      actions: [
        { label: "Review invitation", variant: "primary" as const },
        { label: "Dismiss", variant: "secondary" as const },
      ],
    })),
    ...baseNotifications,
  ], [invitationAlerts.data, baseNotifications]);
  const [prayedRequestIds, setPrayedRequestIds] = useState<Set<string>>(new Set());
  const [joinedGroupIds, setJoinedGroupIds] = useState<Set<string>>(new Set());
  const refreshVersion = useRef(0);

  const loadFriendNotifications = useCallback(async (userId: string, isCancelled: () => boolean) => {
    const version = ++refreshVersion.current;
    const { data: rows, error: notificationsError } = await supabase
      .from("notifications")
      .select("id, recipient_id, actor_id, type, request_id, read_at, created_at")
      .eq("recipient_id", userId)
      .in("type", ["friend_request", "friend_request_accepted"])
      .order("created_at", { ascending: false });

    if (notificationsError) {
      console.error("[NotificationsProvider] Failed to load notifications:", notificationsError.message);
      return;
    }

    const durableRows = (rows as DurableNotificationRow[] | null) ?? [];
    const actorIds = [...new Set(durableRows.map((row) => row.actor_id).filter((id): id is string => Boolean(id)))];

    const [{ data: blocks, error: blocksError }, { data: profiles, error: profilesError }] = await Promise.all([
      supabase
        .from("blocked_users")
        .select("blocker_id, blocked_id")
        .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`),
      actorIds.length > 0
        ? supabase.from("profiles").select("id, full_name, avatar_url").in("id", actorIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (blocksError) {
      console.error("[NotificationsProvider] Failed to load notification blocks:", blocksError.message);
      return;
    }
    if (profilesError) {
      console.warn("[NotificationsProvider] Failed to load notification profiles:", profilesError.message);
    }

    const blockedUserIds = new Set(
      ((blocks as { blocker_id: string; blocked_id: string }[] | null) ?? []).map((block) =>
        block.blocker_id === userId ? block.blocked_id : block.blocker_id
      )
    );
    const profileById = new Map(
      ((profiles as { id: string; full_name: string | null; avatar_url: string | null }[] | null) ?? [])
        .map((profile) => [profile.id, profile] as const)
    );

    const mappedNotifications: AppNotification[] = durableRows
      .filter((row) => !row.actor_id || !blockedUserIds.has(row.actor_id))
      .map((row) => {
        const profile = row.actor_id ? profileById.get(row.actor_id) : undefined;
        const actorName = profile?.full_name?.trim() || "Someone";
        const isAccepted = row.type === "friend_request_accepted";

        return {
          id: row.id,
          type: "request",
          title: isAccepted ? "Friend request accepted" : "New friend request",
          body: isAccepted
            ? `${actorName} accepted your friend request.`
            : `${actorName} wants to connect with you.`,
          time: formatNotificationTime(row.created_at),
          avatar: profile?.avatar_url ?? undefined,
          unread: !row.read_at,
          targetId: row.request_id ?? undefined,
          targetRoute: "/friend-requests",
          actorId: row.actor_id ?? undefined,
          requestId: row.request_id ?? undefined,
          persisted: true,
        };
      });

    if (isCancelled() || version !== refreshVersion.current) return;
    setNotifications((current) => [
      ...mappedNotifications,
      ...current.filter((notification) => !notification.persisted),
    ]);
  }, []);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      refreshVersion.current += 1;
      setNotifications((current) => current.filter((notification) => !notification.persisted));
      return;
    }

    let cancelled = false;
    const isCancelled = () => cancelled;
    void loadFriendNotifications(userId, isCancelled);

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          void loadFriendNotifications(userId, isCancelled);
        },
      )
      .subscribe((status, error) => {
        if (status === "CHANNEL_ERROR") {
          console.error("[NotificationsProvider] Notification realtime error:", error?.message ?? "unknown error");
        }
      });

    return () => {
      cancelled = true;
      refreshVersion.current += 1;
      void supabase.removeChannel(channel);
    };
  }, [loadFriendNotifications, user?.id]);

  const joinGroup = useCallback((groupId: string) => {
    console.log("[NotificationsProvider] Joining group:", groupId);
    setJoinedGroupIds((prev) => {
      const next = new Set(prev);
      next.add(groupId);
      return next;
    });
  }, []);

  const addNotification = useCallback((notif: Omit<AppNotification, "id">) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}`,
      persisted: false,
    };
    console.log("[NotificationsProvider] Adding notification:", newNotif.title);
    setNotifications((prev) => [newNotif, ...prev]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    if (id.startsWith(groupInvitationAlertPrefix)) { invitationAlerts.update("dismiss", id); return; }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (id.startsWith("notif-")) return;
    void (async () => {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) {
        console.error("[NotificationsProvider] Failed to dismiss notification:", error.message);
      }
    })();
  }, [invitationAlerts.update]);

  const markNotificationRead = useCallback((id: string) => {
    if (id.startsWith(groupInvitationAlertPrefix)) { invitationAlerts.update("read", id); return; }
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, unread: false } : notification
      )
    );
    if (!user?.id || id.startsWith("notif-")) return;
    void (async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id)
        .eq("recipient_id", user.id);
      if (error) {
        console.error("[NotificationsProvider] Failed to mark notification read:", error.message);
      }
    })();
  }, [user?.id, invitationAlerts.update]);

  const markAllRead = useCallback(() => {
    invitationAlerts.update("read_all");
    setNotifications((current) => current.map((notification) => ({ ...notification, unread: false })));
    if (!user?.id) return;
    void (async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_id", user.id)
        .is("read_at", null);
      if (error) {
        console.error("[NotificationsProvider] Failed to mark notifications read:", error.message);
      }
    })();
  }, [user?.id, invitationAlerts.update]);

  const markRequestPrayed = useCallback((requestId: string) => {
    console.log("[NotificationsProvider] Marking request as prayed:", requestId);
    setPrayedRequestIds((prev) => {
      const next = new Set(prev);
      next.add(requestId);
      return next;
    });
  }, []);

  const hasBeenPrayed = useCallback(
    (requestId: string) => prayedRequestIds.has(requestId),
    [prayedRequestIds]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications]
  );

  const hasJoinedGroup = useCallback(
    (groupId: string) => joinedGroupIds.has(groupId),
    [joinedGroupIds]
  );

  return useMemo(
    () => ({
      notifications,
      prayedRequestIds,
      joinedGroupIds,
      unreadCount,
      addNotification,
      removeNotification,
      markNotificationRead,
      markAllRead,
      markRequestPrayed,
      hasBeenPrayed,
      joinGroup,
      hasJoinedGroup,
      groupInvitationAlertsError: invitationAlerts.error,
      groupInvitationAlertsLoading: invitationAlerts.loading,
      retryGroupInvitationAlerts: invitationAlerts.retry,
    }),
    [notifications, prayedRequestIds, joinedGroupIds, unreadCount, addNotification, removeNotification, markNotificationRead, markAllRead, markRequestPrayed, hasBeenPrayed, joinGroup, hasJoinedGroup, invitationAlerts.error, invitationAlerts.loading, invitationAlerts.retry]
  );
});

function formatNotificationTime(dateString: string): string {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(dateString).getTime()) / 60000));
  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}h ago`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays}d ago`;
}
