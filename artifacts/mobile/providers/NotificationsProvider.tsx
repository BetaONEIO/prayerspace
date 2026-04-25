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

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "1",
    type: "prayer",
    title: "Michael Scott prayed for you",
    body: '"Praying for your strength and peace today. You\'ve got this!"',
    time: "Just now",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    unread: true,
    targetId: "c10",
    targetRoute: "/contact",
    actions: [
      { label: "Reply", variant: "primary" },
      { label: "Dismiss", variant: "secondary" },
    ],
  },
  {
    id: "2",
    type: "comment",
    title: "Sarah left a comment",
    body: '"Holding you in prayer — God is faithful and He hears every word."',
    time: "4m ago",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    unread: true,
    targetId: "c14",
    targetRoute: "/contact",
    actions: [
      { label: "Reply", variant: "primary" },
      { label: "Dismiss", variant: "secondary" },
    ],
  },
  {
    id: "3",
    type: "reaction",
    title: "3 people reacted to your request",
    body: "James, Priya and 1 other responded with a 🙏 to your prayer request.",
    time: "18m ago",
    unread: true,
    targetId: "pr1",
    targetRoute: "/prayer-detail",
  },
  {
    id: "4",
    type: "group",
    title: "New Group Invite",
    body: 'Sarah invited you to join "Morning Grace Circle"',
    time: "2h ago",
    unread: true,
    targetId: "g1",
    targetRoute: "/group",
    groupName: "Morning Grace Circle",
    actions: [
      { label: "Accept", variant: "primary" },
      { label: "Decline", variant: "secondary" },
    ],
  },
  {
    id: "5",
    type: "reply",
    title: "James replied to your comment",
    body: '"Amen! Standing in agreement with you on this. Stay strong in faith."',
    time: "3h ago",
    avatar: "https://randomuser.me/api/portraits/men/55.jpg",
    targetId: "pr1",
    targetRoute: "/prayer-detail",
    actions: [
      { label: "View Thread", variant: "primary" },
      { label: "Dismiss", variant: "secondary" },
    ],
  },
  {
    id: "6",
    type: "request",
    title: "New Prayer Request",
    body: "Priya sent you a prayer request: \"Please pray for my mother's health recovery.\"",
    time: "4h ago",
    avatar: "https://randomuser.me/api/portraits/women/68.jpg",
    targetId: "rpr1",
    targetRoute: "/received-prayer",
    actions: [
      { label: "Pray Now", variant: "primary" },
      { label: "Dismiss", variant: "secondary" },
    ],
  },
  {
    id: "7",
    type: "member_joined",
    title: "New member in your group",
    body: 'Daniel joined "Morning Grace Circle". Welcome them with a prayer!',
    time: "5h ago",
    avatar: "https://randomuser.me/api/portraits/men/77.jpg",
    targetId: "g1",
    targetRoute: "/group",
  },
  {
    id: "8",
    type: "mention",
    title: "You were mentioned",
    body: 'Emma mentioned you: "Thank you @you for praying — it truly made a difference."',
    time: "6h ago",
    avatar: "https://randomuser.me/api/portraits/women/33.jpg",
    targetRoute: "/(tabs)/community",
    actions: [
      { label: "View", variant: "primary" },
      { label: "Dismiss", variant: "secondary" },
    ],
  },
  {
    id: "9",
    type: "event",
    title: "Group Prayer Tonight",
    body: '"Morning Grace Circle" has a group prayer session scheduled at 8:00 PM.',
    time: "8h ago",
    targetId: "g1",
    targetRoute: "/group",
    groupName: "Morning Grace Circle",
    actions: [
      { label: "Join", variant: "primary" },
      { label: "Dismiss", variant: "secondary" },
    ],
  },
  {
    id: "10",
    type: "testimony",
    title: "Answered Prayer!",
    body: 'Emma shared a testimony: "The surgery was successful — God is so good!"',
    time: "Yesterday",
    targetRoute: "/(tabs)/community",
  },
  {
    id: "11",
    type: "streak",
    title: "7 Day Streak!",
    body: "You've reached a 7-day prayer streak. Keep growing your faith!",
    time: "Yesterday",
  },
];

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
