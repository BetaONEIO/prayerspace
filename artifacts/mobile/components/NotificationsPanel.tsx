import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { Bell, Heart, Users, Trophy, Flame, ChevronRight, X, AlertTriangle, HandHeart, MessageSquare, CornerDownRight, UserPlus, Calendar, AtSign, SmilePlus } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useNotifications, type AppNotification } from "@/providers/NotificationsProvider";

type Notification = AppNotification;

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface DeclineDialogProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  groupName: string;
  colors: ThemeColors;
}

function DeclineDialog({ visible, onConfirm, onCancel, groupName, colors }: DeclineDialogProps) {
  const styles = useMemo(() => createDialogStyles(colors), [colors]);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.box}>
          <View style={styles.iconWrap}>
            <AlertTriangle size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>Decline Invite?</Text>
          <Text style={styles.body}>
            Are you sure you want to decline the invite to{" "}
            <Text style={styles.groupName}>{groupName}</Text>? You won't be able to join unless you're invited again.
          </Text>
          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Go Back</Text>
            </Pressable>
            <Pressable style={styles.confirmBtn} onPress={onConfirm}>
              <Text style={styles.confirmText}>Yes, Decline</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function NotificationIcon({ type, colors }: { type: Notification["type"]; colors: ThemeColors }) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (type === "group") {
    return (
      <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
        <Users size={22} color={colors.primary} />
      </View>
    );
  }
  if (type === "testimony") {
    return (
      <View style={[styles.iconCircle, { backgroundColor: colors.accent }]}>
        <Trophy size={22} color={colors.primary} />
      </View>
    );
  }
  if (type === "streak") {
    return (
      <View style={[styles.iconCircle, { backgroundColor: colors.secondary }]}>
        <Flame size={22} color={colors.mutedForeground} />
      </View>
    );
  }
  if (type === "request") {
    return (
      <View style={[styles.iconCircle, { backgroundColor: colors.primary + "18" }]}>
        <HandHeart size={22} color={colors.primary} />
      </View>
    );
  }
  if (type === "comment") {
    return (
      <View style={[styles.iconCircle, { backgroundColor: "#E8F5E9" }]}>
        <MessageSquare size={22} color="#2E7D32" />
      </View>
    );
  }
  if (type === "reaction") {
    return (
      <View style={[styles.iconCircle, { backgroundColor: colors.accent }]}>
        <SmilePlus size={22} color={colors.primary} />
      </View>
    );
  }
  if (type === "reply") {
    return (
      <View style={[styles.iconCircle, { backgroundColor: "#E3F2FD" }]}>
        <CornerDownRight size={22} color="#1565C0" />
      </View>
    );
  }
  if (type === "member_joined") {
    return (
      <View style={[styles.iconCircle, { backgroundColor: "#E0F7FA" }]}>
        <UserPlus size={22} color="#00838F" />
      </View>
    );
  }
  if (type === "event") {
    return (
      <View style={[styles.iconCircle, { backgroundColor: "#FFF3E0" }]}>
        <Calendar size={22} color="#E65100" />
      </View>
    );
  }
  if (type === "mention") {
    return (
      <View style={[styles.iconCircle, { backgroundColor: "#F3E5F5" }]}>
        <AtSign size={22} color="#6A1B9A" />
      </View>
    );
  }
  return null;
}

export default function NotificationsPanel({ visible, onClose }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { notifications, removeNotification, clearAll } = useNotifications();
  const [declineDialogVisible, setDeclineDialogVisible] = useState(false);
  const [pendingDeclineId, setPendingDeclineId] = useState<string | null>(null);

  const handleActionPress = useCallback((notif: Notification, actionLabel: string) => {
    if (actionLabel === "Dismiss") {
      removeNotification(notif.id);
    } else if (actionLabel === "Decline") {
      setPendingDeclineId(notif.id);
      setDeclineDialogVisible(true);
    } else {
      console.log(`Action "${actionLabel}" pressed for notification ${notif.id}`);
    }
  }, [removeNotification]);

  const handleDeclineConfirm = useCallback(() => {
    if (pendingDeclineId) {
      removeNotification(pendingDeclineId);
    }
    setDeclineDialogVisible(false);
    setPendingDeclineId(null);
  }, [pendingDeclineId, removeNotification]);

  const handleDeclineCancel = useCallback(() => {
    setDeclineDialogVisible(false);
    setPendingDeclineId(null);
  }, []);

  const handleMarkAllRead = useCallback(() => {
    clearAll();
    console.log("Mark all notifications read — cleared");
  }, [clearAll]);

  const pendingDeclineNotif = notifications.find((n) => n.id === pendingDeclineId);
  const groupNameMatch = pendingDeclineNotif?.body.match(/"([^"]+)"/);
  const groupName = groupNameMatch ? groupNameMatch[1] : "this group";

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={onClose} />
          <View style={styles.panel}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconWrap}>
                  <Bell size={20} color={colors.primary} />
                </View>
                <Text style={styles.headerTitle}>Notifications</Text>
              </View>
              <View style={styles.headerRight}>
                {notifications.length > 0 && (
                  <Pressable onPress={handleMarkAllRead} style={styles.markReadBtn}>
                    <Text style={styles.markReadText}>Mark all read</Text>
                  </Pressable>
                )}
                <Pressable onPress={onClose} style={styles.closeBtn}>
                  <X size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              style={styles.list}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {notifications.length === 0 ? (
                <View style={styles.emptyState}>
                  <Bell size={36} color={colors.mutedForeground + "66"} />
                  <Text style={styles.emptyText}>You're all caught up!</Text>
                  <Text style={styles.emptySubtext}>No new notifications</Text>
                </View>
              ) : (
                notifications.map((notif, index) => (
                  <View
                    key={notif.id}
                    style={[
                      styles.notifRow,
                      notif.unread && styles.notifRowUnread,
                      index < notifications.length - 1 && styles.notifRowBorder,
                    ]}
                  >
                    {notif.unread && <View style={styles.unreadBar} />}
                    <View style={styles.notifContent}>
                      {notif.avatar ? (
                        <View style={styles.avatarWrap}>
                          <Image
                            source={{ uri: notif.avatar }}
                            style={styles.avatar}
                          />
                          <View style={styles.avatarBadge}>
                            <Heart size={8} color="#fff" fill="#fff" />
                          </View>
                        </View>
                      ) : (
                        <NotificationIcon type={notif.type} colors={colors} />
                      )}
                      <View style={styles.notifText}>
                        <View style={styles.notifMeta}>
                          <Text style={styles.notifTitle} numberOfLines={1}>
                            {notif.title}
                          </Text>
                          <Text
                            style={[
                              styles.notifTime,
                              notif.unread && styles.notifTimeUnread,
                            ]}
                          >
                            {notif.time}
                          </Text>
                        </View>
                        <Text style={styles.notifBody} numberOfLines={2}>
                          {notif.body}
                        </Text>
                        {notif.actions && (
                          <View style={styles.notifActions}>
                            {notif.actions.map((action) => (
                              <Pressable
                                key={action.label}
                                onPress={() => handleActionPress(notif, action.label)}
                                style={[
                                  styles.actionBtn,
                                  action.variant === "primary"
                                    ? styles.actionBtnPrimary
                                    : styles.actionBtnSecondary,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.actionBtnText,
                                    action.variant === "primary"
                                      ? styles.actionBtnTextPrimary
                                      : styles.actionBtnTextSecondary,
                                  ]}
                                >
                                  {action.label}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <Pressable style={styles.footer}>
              <Text style={styles.footerText}>See all activity</Text>
              <ChevronRight size={14} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>
      </Modal>

      <DeclineDialog
        visible={declineDialogVisible}
        onConfirm={handleDeclineConfirm}
        onCancel={handleDeclineCancel}
        groupName={groupName}
        colors={colors}
      />
    </>
  );
}

function createDialogStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    box: {
      width: "100%",
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 28,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 16,
    },
    iconWrap: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary + "18",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.foreground,
      marginBottom: 10,
      textAlign: "center",
    },
    body: {
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 24,
    },
    groupName: {
      fontWeight: "700" as const,
      color: colors.foreground,
    },
    actions: {
      flexDirection: "row",
      gap: 12,
      width: "100%",
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 14,
      backgroundColor: colors.secondary,
      alignItems: "center",
    },
    cancelText: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: colors.secondaryForeground,
    },
    confirmBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 14,
      backgroundColor: "#EF4444",
      alignItems: "center",
      shadowColor: "#EF4444",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    confirmText: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: "#fff",
    },
  });
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-start",
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    panel: {
      width: "100%",
      maxWidth: 480,
      backgroundColor: colors.background,
      borderBottomLeftRadius: 36,
      borderBottomRightRadius: 36,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 12,
      maxHeight: "75%",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border + "66",
    },
    headerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    headerIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + "18",
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700" as const,
      color: colors.foreground,
    },
    headerRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    markReadBtn: {
      paddingHorizontal: 4,
    },
    markReadText: {
      fontSize: 11,
      fontWeight: "700" as const,
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    list: {
      maxHeight: 480,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 56,
      gap: 8,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.foreground,
      marginTop: 8,
    },
    emptySubtext: {
      fontSize: 13,
      color: colors.mutedForeground,
    },
    notifRow: {
      paddingHorizontal: 20,
      paddingVertical: 18,
      position: "relative",
    },
    notifRowUnread: {
      backgroundColor: colors.accent,
    },
    notifRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border + "33",
    },
    unreadBar: {
      position: "absolute",
      left: 6,
      top: "50%",
      width: 4,
      height: 40,
      marginTop: -20,
      backgroundColor: colors.primary,
      borderRadius: 2,
    },
    notifContent: {
      flexDirection: "row",
      gap: 14,
    },
    avatarWrap: {
      position: "relative",
      width: 48,
      height: 48,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: colors.card,
    },
    avatarBadge: {
      position: "absolute",
      bottom: -2,
      right: -2,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.background,
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    notifText: {
      flex: 1,
    },
    notifMeta: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 8,
      marginBottom: 4,
    },
    notifTitle: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: colors.foreground,
      flex: 1,
      lineHeight: 18,
    },
    notifTime: {
      fontSize: 10,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      flexShrink: 0,
    },
    notifTimeUnread: {
      color: colors.primary,
      fontWeight: "700" as const,
    },
    notifBody: {
      fontSize: 12,
      color: colors.mutedForeground,
      lineHeight: 18,
      fontStyle: "italic",
    },
    notifActions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 10,
    },
    actionBtn: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 999,
    },
    actionBtnPrimary: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 3,
    },
    actionBtnSecondary: {
      backgroundColor: colors.secondary,
    },
    actionBtnText: {
      fontSize: 11,
      fontWeight: "700" as const,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    actionBtnTextPrimary: {
      color: colors.primaryForeground,
    },
    actionBtnTextSecondary: {
      color: colors.secondaryForeground,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      padding: 16,
      backgroundColor: colors.secondary + "33",
    },
    footerText: {
      fontSize: 11,
      fontWeight: "700" as const,
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
  });
}
