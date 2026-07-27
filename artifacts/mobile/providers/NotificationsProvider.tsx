import { useState, useCallback, useMemo } from "react";
import createContextHook from "@nkzw/create-context-hook";

export interface AppNotification {
  id: string;
  type: "prayer" | "group" | "testimony" | "streak" | "request" | "comment" | "reaction" | "reply" | "member_joined" | "event" | "mention";
  title: string;
  body: string;
  time: string;
  avatar?: string;
  unread?: boolean;
  actions?: { label: string; variant: "primary" | "secondary" }[];
  targetId?: string;
  targetRoute?: string;
  groupName?: string;
}

// No placeholder notifications — only real notifications from Supabase push events are shown
const INITIAL_NOTIFICATIONS: AppNotification[] = [];

export const [NotificationsProvider, useNotifications] = createContextHook(() => {
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [prayedRequestIds, setPrayedRequestIds] = useState<Set<string>>(new Set());
  const [joinedGroupIds, setJoinedGroupIds] = useState<Set<string>>(new Set());

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
    };
    console.log("[NotificationsProvider] Adding notification:", newNotif.title);
    setNotifications((prev) => [newNotif, ...prev]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

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
      clearAll,
      markRequestPrayed,
      hasBeenPrayed,
      joinGroup,
      hasJoinedGroup,
    }),
    [notifications, prayedRequestIds, joinedGroupIds, unreadCount, addNotification, removeNotification, clearAll, markRequestPrayed, hasBeenPrayed, joinGroup, hasJoinedGroup]
  );
});
