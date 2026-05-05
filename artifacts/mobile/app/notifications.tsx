import React, { useCallback, useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Modal, Platform } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter, Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import { Bell, Heart, Users, Trophy, Flame, ChevronLeft, AlertTriangle, HandHeart, MessageSquare, CornerDownRight, UserPlus, Calendar, AtSign, SmilePlus } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useNotifications, type AppNotification } from "@/providers/NotificationsProvider";

type Notification = AppNotification;

function DeclineDialog({ visible, onConfirm, onCancel, groupName, colors }: { visible: boolean; onConfirm: () => void; onCancel: () => void; groupName: string; colors: ThemeColors }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        <View style={{ width: "100%", backgroundColor: colors.card, borderRadius: 24, padding: 28, alignItems: "center" }}>
          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primary + "18", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <AlertTriangle size={28} color={colors.primary} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: "700" as const, color: colors.foreground, marginBottom: 10, textAlign: "center" }}>Decline Invite?</Text>
          <Text style={{ fontSize: 14, color: colors.mutedForeground, textAlign: "center", lineHeight: 20, marginBottom: 24 }}>
            Are you sure you want to decline the invite to <Text style={{ fontWeight: "700" as const, color: colors.foreground }}>{groupName}</Text>?
          </Text>
          <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
            <Pressable style={{ flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: colors.secondary, alignItems: "center" }} onPress={onCancel}>
              <Text style={{ fontSize: 14, fontWeight: "700" as const, color: colors.secondaryForeground }}>Go Back</Text>
            </Pressable>
            <Pressable style={{ flex: 1, paddingVertical: 13, borderRadius: 14, backgroundColor: "#EF4444", alignItems: "center" }} onPress={onConfirm}>
              <Text style={{ fontSize: 14, fontWeight: "700" as const, color: "#fff" }}>Yes, Decline</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function NotificationIcon({ type, colors }: { type: Notification["type"]; colors: ThemeColors }) {
  const iconStyle = { width: 48, height: 48, borderRadius: 24, alignItems: "center" as const, justifyContent: "center" as const, flexShrink: 0 };
  switch (type) {
    case "group": return <View style={[iconStyle, { backgroundColor: colors.secondary }]}><Users size={22} color={colors.primary} /></View>;
    case "testimony": return <View style={[iconStyle, { backgroundColor: colors.accent }]}><Trophy size={22} color={colors.primary} /></View>;
    case "streak": return <View style={[iconStyle, { backgroundColor: colors.secondary }]}><Flame size={22} color={colors.mutedForeground} /></View>;
    case "request": return <View style={[iconStyle, { backgroundColor: colors.primary + "18" }]}><HandHeart size={22} color={colors.primary} /></View>;
    case "comment": return <View style={[iconStyle, { backgroundColor: "#2E7D3220" }]}><MessageSquare size={22} color="#2E7D32" /></View>;
    case "reaction": return <View style={[iconStyle, { backgroundColor: colors.accent }]}><SmilePlus size={22} color={colors.primary} /></View>;
    case "reply": return <View style={[iconStyle, { backgroundColor: "#1565C020" }]}><CornerDownRight size={22} color="#1565C0" /></View>;
    case "member_joined": return <View style={[iconStyle, { backgroundColor: "#00838F20" }]}><UserPlus size={22} color="#00838F" /></View>;
    case "event": return <View style={[iconStyle, { backgroundColor: colors.accent }]}><Calendar size={22} color={colors.primary} /></View>;
    case "mention": return <View style={[iconStyle, { backgroundColor: "#6A1B9A20" }]}><AtSign size={22} color="#6A1B9A" /></View>;
    default: return null;
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { notifications, removeNotification, clearAll, joinGroup } = useNotifications();
  const [declineDialogVisible, setDeclineDialogVisible] = useState(false);
  const [pendingDeclineId, setPendingDeclineId] = useState<string | null>(null);

  const handleActionPress = useCallback((notif: Notification, actionLabel: string) => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (actionLabel === "Dismiss") { removeNotification(notif.id); return; }
    if (actionLabel === "Decline") { setPendingDeclineId(notif.id); setDeclineDialogVisible(true); return; }
    if (actionLabel === "Accept" || actionLabel === "Join") {
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (notif.targetId) joinGroup(notif.targetId);
      removeNotification(notif.id);
      if (notif.targetRoute && notif.targetId) { router.back(); setTimeout(() => router.push(`${notif.targetRoute}/${notif.targetId}` as never), 100); }
      return;
    }
    removeNotification(notif.id);
    if (notif.targetRoute) { router.back(); setTimeout(() => router.push(notif.targetId ? `${notif.targetRoute}/${notif.targetId}` as never : notif.targetRoute as never), 100); }
  }, [removeNotification, joinGroup, router]);

  const handleDeclineConfirm = useCallback(() => {
    if (pendingDeclineId) removeNotification(pendingDeclineId);
    setDeclineDialogVisible(false);
    setPendingDeclineId(null);
  }, [pendingDeclineId, removeNotification]);

  const handleNotifRowPress = useCallback((notif: Notification) => {
    if (!notif.targetRoute) return;
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    router.back();
    if (notif.targetId) setTimeout(() => router.push(`${notif.targetRoute}/${notif.targetId}` as never), 100);
    else setTimeout(() => router.push(notif.targetRoute as never), 100);
  }, [router]);

  const pendingDeclineNotif = notifications.find((n) => n.id === pendingDeclineId);
  const groupName = pendingDeclineNotif?.body.match(/"([^"]+)"/)?.[1] ?? "this group";
  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}><ChevronLeft size={20} color={colors.secondaryForeground} /></Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>{unreadCount}</Text></View>}
        </View>
        {notifications.length > 0 ? (
          <Pressable style={styles.markReadBtn} onPress={() => { if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); clearAll(); }}>
            <Text style={styles.markReadText}>Clear all</Text>
          </Pressable>
        ) : <View style={{ width: 70 }} />}
      </View>

      <AutoScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}><Bell size={40} color={colors.mutedForeground + "66"} /></View>
            <Text style={styles.emptyText}>You're all caught up!</Text>
            <Text style={styles.emptySubtext}>No new notifications</Text>
          </View>
        ) : (
          <View style={styles.notifList}>
            {notifications.map((notif, index) => (
              <Pressable key={notif.id} onPress={() => handleNotifRowPress(notif)} style={[styles.notifRow, notif.unread && styles.notifRowUnread, index < notifications.length - 1 && styles.notifRowBorder]}>
                {notif.unread && <View style={styles.unreadBar} />}
                <View style={styles.notifContent}>
                  {notif.avatar ? (
                    <View style={styles.avatarWrap}>
                      <Image source={{ uri: notif.avatar }} style={styles.avatar} />
                      <View style={styles.avatarBadge}><Heart size={8} color="#fff" fill="#fff" /></View>
                    </View>
                  ) : <NotificationIcon type={notif.type} colors={colors} />}
                  <View style={styles.notifText}>
                    <View style={styles.notifMeta}>
                      <Text style={styles.notifTitle} numberOfLines={1}>{notif.title}</Text>
                      <Text style={[styles.notifTime, notif.unread && styles.notifTimeUnread]}>{notif.time}</Text>
                    </View>
                    <Text style={styles.notifBody} numberOfLines={2}>{notif.body}</Text>
                    {notif.actions && (
                      <View style={styles.notifActions}>
                        {notif.actions.map((action) => (
                          <Pressable key={action.label} onPress={() => handleActionPress(notif, action.label)} style={[styles.actionBtn, action.variant === "primary" ? styles.actionBtnPrimary : styles.actionBtnSecondary]}>
                            <Text style={[styles.actionBtnText, action.variant === "primary" ? styles.actionBtnTextPrimary : styles.actionBtnTextSecondary]}>{action.label}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </AutoScrollView>

      <DeclineDialog visible={declineDialogVisible} onConfirm={handleDeclineConfirm} onCancel={() => { setDeclineDialogVisible(false); setPendingDeclineId(null); }} groupName={groupName} colors={colors} />
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border + "50" },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" },
    headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
    headerTitle: { fontSize: 18, fontWeight: "700" as const, color: colors.foreground },
    unreadBadge: { backgroundColor: colors.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
    unreadBadgeText: { color: colors.primaryForeground, fontSize: 10, fontWeight: "800" as const },
    markReadBtn: { width: 70, alignItems: "flex-end" },
    markReadText: { fontSize: 12, fontWeight: "700" as const, color: colors.primary },
    list: { flex: 1 },
    listContent: { flexGrow: 1 },
    emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 100, gap: 8 },
    emptyIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center", marginBottom: 8 },
    emptyText: { fontSize: 18, fontWeight: "700" as const, color: colors.foreground, marginTop: 4 },
    emptySubtext: { fontSize: 13, color: colors.mutedForeground },
    notifList: { backgroundColor: colors.card, borderRadius: 24, margin: 16, overflow: "hidden", borderWidth: 1, borderColor: colors.border + "40" },
    notifRow: { paddingHorizontal: 20, paddingVertical: 18, position: "relative" },
    notifRowUnread: { backgroundColor: colors.accent },
    notifRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border + "33" },
    unreadBar: { position: "absolute", left: 6, top: "50%", width: 4, height: 40, marginTop: -20, backgroundColor: colors.primary, borderRadius: 2 },
    notifContent: { flexDirection: "row", gap: 14 },
    avatarWrap: { position: "relative", width: 48, height: 48 },
    avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.card },
    avatarBadge: { position: "absolute", bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.background },
    notifText: { flex: 1 },
    notifMeta: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 },
    notifTitle: { fontSize: 14, fontWeight: "700" as const, color: colors.foreground, flex: 1, lineHeight: 18 },
    notifTime: { fontSize: 10, fontWeight: "600" as const, color: colors.mutedForeground, textTransform: "uppercase", letterSpacing: 0.4, flexShrink: 0 },
    notifTimeUnread: { color: colors.primary, fontWeight: "700" as const },
    notifBody: { fontSize: 12, color: colors.mutedForeground, lineHeight: 18, fontStyle: "italic" },
    notifActions: { flexDirection: "row", gap: 8, marginTop: 10 },
    actionBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999 },
    actionBtnPrimary: { backgroundColor: colors.primary },
    actionBtnSecondary: { backgroundColor: colors.secondary },
    actionBtnText: { fontSize: 11, fontWeight: "700" as const, textTransform: "uppercase", letterSpacing: 0.4 },
    actionBtnTextPrimary: { color: colors.primaryForeground },
    actionBtnTextSecondary: { color: colors.secondaryForeground },
  });
}
