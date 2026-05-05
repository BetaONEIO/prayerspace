import React, { useEffect, useRef, useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Dimensions,
  Modal,
  ScrollView,
  PanResponder,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import AvatarImage from "@/components/AvatarImage";
import { useRouter } from "expo-router";
import {
  Home,
  BookOpen,
  Users,
  Bell,
  HelpCircle,
  Shield,
  LogOut,
  Settings,
  Heart,
  UserSearch,
  MessageSquare,
  Sparkles,
  HandHeart,
  ChevronLeft,
} from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import ConfirmModal from "@/components/ConfirmModal";
import { useChurchEntitlements } from "@/hooks/useChurchEntitlements";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = SCREEN_WIDTH * 0.85;

interface NavigationDrawerProps {
  visible: boolean;
  onClose: () => void;
  activeRoute?: string;
}

interface NavItem {
  label: string;
  route: string;
  icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  badge?: number;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Explore",
    items: [
      { label: "Home", route: "/(tabs)/(home)", icon: Home },
      { label: "My Communities", route: "/(tabs)/community?tab=Community", icon: Users },
      { label: "Groups", route: "/(tabs)/community?tab=Groups", icon: MessageSquare },
    ],
  },
  {
    label: "Your Prayer",
    items: [
      { label: "Prayer Journal", route: "/journal", icon: BookOpen },
      { label: "My Prayer Requests", route: "/my-posts", icon: HandHeart },
    ],
  },
  {
    label: "Connect",
    items: [
      { label: "Find Friends", route: "/find-friend", icon: UserSearch },
      { label: "Notifications", route: "/notifications", icon: Bell, badge: 3 },
      { label: "Favourites", route: "/top-hearts", icon: Heart },
    ],
  },
];

const secondaryItems: NavItem[] = [
  { label: "Help & Support", route: "/help-centre", icon: HelpCircle },
  { label: "Settings", route: "/settings", icon: Shield },
];

export default function NavigationDrawer({ visible, onClose, activeRoute }: NavigationDrawerProps) {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, profile, signOut } = useAuth();
  const { isPremiumCommunity } = useChurchEntitlements();
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const swipeX = useRef(new Animated.Value(0)).current;

  // Interpolate backdrop opacity so it fades as the user swipes left
  const backdropOpacity = useMemo(
    () =>
      Animated.add(
        backdropAnim,
        swipeX.interpolate({
          inputRange: [-DRAWER_WIDTH, 0],
          outputRange: [-1, 0],
          extrapolate: "clamp",
        })
      ),
    [backdropAnim, swipeX]
  );

  const panResponder = useRef(
    PanResponder.create({
      // Only capture clearly leftward horizontal gestures — don't steal vertical scrolls
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        return dx < -10 && Math.abs(dx) > Math.abs(dy) * 2;
      },
      onPanResponderMove: (_, { dx }) => {
        if (dx < 0) {
          swipeX.setValue(dx);
        }
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx < -DRAWER_WIDTH * 0.3 || vx < -0.5) {
          if (Platform.OS !== "web") {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          Animated.parallel([
            Animated.timing(slideAnim, {
              toValue: -DRAWER_WIDTH,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(backdropAnim, {
              toValue: 0,
              duration: 220,
              useNativeDriver: true,
            }),
            Animated.timing(swipeX, {
              toValue: 0,
              duration: 220,
              useNativeDriver: true,
            }),
          ]).start(() => onClose());
        } else {
          Animated.spring(swipeX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 120,
            friction: 12,
          }).start();
        }
      },
    })
  ).current;

  const displayName = profile?.full_name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Prayerful";
  const displayEmail = user?.email ?? "";

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      swipeX.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim, swipeX]);

  // Animate the drawer out smoothly, then call onClose once off-screen
  const handleAnimatedClose = useCallback(() => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      swipeX.setValue(0);
      onClose();
    });
  }, [slideAnim, backdropAnim, swipeX, onClose]);

  const handleNavPress = useCallback(
    (route: string) => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 260,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        swipeX.setValue(0);
        onClose();
        router.push(route as any);
      });
    },
    [slideAnim, backdropAnim, swipeX, onClose, router]
  );

  const handleLogout = useCallback(() => {
    setShowSignOutModal(true);
  }, []);

  const handleConfirmSignOut = useCallback(async () => {
    setShowSignOutModal(false);
    handleAnimatedClose();
    try {
      await signOut();
    } catch (error) {
      console.error("[Drawer] Sign out error:", error);
    }
  }, [handleAnimatedClose, signOut]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleAnimatedClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {/* Tappable backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleAnimatedClose} />
        </Animated.View>

        {/* Drawer panel */}
        <Animated.View
          style={[
            styles.drawer,
            { transform: [{ translateX: Animated.add(slideAnim, swipeX) }] },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Profile header — safe area top */}
          <View style={[styles.profileSection, { paddingTop: insets.top + 12 }]}>
            {/* Top row: close button + settings */}
            <View style={styles.topRow}>
              <Pressable style={styles.closeBtn} onPress={handleAnimatedClose} hitSlop={8}>
                <ChevronLeft size={20} color={colors.mutedForeground} strokeWidth={2} />
              </Pressable>
              <Pressable
                style={styles.settingsBtn}
                onPress={() => handleNavPress("/settings")}
                hitSlop={8}
              >
                <Settings size={18} color={colors.mutedForeground} />
              </Pressable>
            </View>

            {/* Avatar + name */}
            <View style={styles.profileRow}>
              <Pressable onPress={() => handleNavPress("/profile")}>
                <AvatarImage
                  avatarPath={profile?.avatar_url}
                  fallbackSeed={displayName}
                  style={styles.profileAvatar}
                />
              </Pressable>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{displayName}</Text>
                <Text style={styles.profileEmail} numberOfLines={1}>{displayEmail}</Text>
              </View>
            </View>
          </View>

          {/* Scrollable nav links */}
          <ScrollView
            style={styles.navSection}
            contentContainerStyle={styles.navContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {navGroups.map((group, groupIndex) => (
              <View key={group.label}>
                {groupIndex > 0 && <View style={styles.groupDivider} />}
                <Text style={styles.groupLabel}>{group.label}</Text>
                {group.items.map((item) => {
                  const isActive = activeRoute === item.route;
                  const Icon = item.icon;
                  return (
                    <Pressable
                      key={item.label}
                      style={[styles.navItem, isActive && styles.navItemActive]}
                      onPress={() => handleNavPress(item.route)}
                    >
                      <Icon
                        size={22}
                        color={isActive ? colors.primary : colors.mutedForeground}
                        strokeWidth={isActive ? 2.5 : 1.5}
                      />
                      <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                        {item.label}
                      </Text>
                      {item.badge ? (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{item.badge}</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ))}

            <View style={styles.groupDivider} />

            {secondaryItems.map((item) => {
              const Icon = item.icon;
              return (
                <Pressable
                  key={item.label}
                  style={styles.navItem}
                  onPress={() => handleNavPress(item.route)}
                >
                  <Icon size={22} color={colors.mutedForeground} strokeWidth={1.5} />
                  <Text style={styles.navLabelSecondary}>{item.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Footer actions */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <Pressable style={styles.prayBtn} onPress={() => handleNavPress("/(tabs)/pray")}>
              <Text style={styles.prayBtnText}>Pray</Text>
            </Pressable>

            {!isPremiumCommunity && (
              <Pressable
                style={styles.proBtn}
                onPress={() => handleNavPress("/prayer-space-pro")}
                testID="drawer-pro-btn"
              >
                <View style={styles.proIconWrap}>
                  <Sparkles size={20} color={colors.primary} strokeWidth={1.8} />
                </View>
                <View style={styles.proTextWrap}>
                  <Text style={styles.proTitle}>Prayer Space Plus+</Text>
                  <Text style={styles.proSubtitle}>Deepen your time in prayer</Text>
                </View>
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              </Pressable>
            )}

            <Pressable style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut size={22} color={colors.destructive} strokeWidth={1.5} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>

      <ConfirmModal
        visible={showSignOutModal}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleConfirmSignOut}
        onCancel={() => setShowSignOutModal(false)}
      />
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      flexDirection: "row",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    drawer: {
      width: DRAWER_WIDTH,
      height: "100%",
      backgroundColor: colors.background,
      shadowColor: "#000",
      shadowOffset: { width: 4, height: 0 },
      shadowOpacity: 0.18,
      shadowRadius: 20,
      elevation: 20,
      flexDirection: "column",
    },

    // Header / profile
    profileSection: {
      paddingBottom: 20,
      paddingHorizontal: 20,
      backgroundColor: colors.primary + "12",
    },
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    settingsBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 1,
    },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    profileAvatar: {
      width: 56,
      height: 56,
      borderRadius: 9999,
      borderWidth: 2,
      borderColor: colors.card,
      overflow: "hidden" as const,
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: 17,
      fontWeight: "700" as const,
      color: colors.foreground,
    },
    profileEmail: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontWeight: "500" as const,
      marginTop: 2,
    },

    // Pray button
    prayBtn: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingVertical: 15,
      marginHorizontal: 20,
      marginTop: 18,
      marginBottom: 4,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 6,
    },
    prayBtnText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700" as const,
      letterSpacing: 0.2,
    },

    // Nav list
    navSection: {
      flex: 1,
      paddingHorizontal: 12,
      paddingTop: 10,
    },
    navContent: {
      paddingBottom: 12,
    },
    navItem: {
      flexDirection: "row",
      alignItems: "center" as const,
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderRadius: 16,
      marginBottom: 2,
    },
    navItemActive: {
      backgroundColor: colors.primary + "0D",
    },
    navLabel: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.foreground,
      flex: 1,
    },
    navLabelActive: {
      color: colors.primary,
      fontWeight: "700" as const,
    },
    navLabelSecondary: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.foreground + "B0",
      flex: 1,
    },
    badge: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingHorizontal: 6,
    },
    badgeText: {
      color: colors.primaryForeground,
      fontSize: 10,
      fontWeight: "800" as const,
    },
    groupDivider: {
      height: 1,
      backgroundColor: colors.border + "50",
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 4,
    },
    groupLabel: {
      fontSize: 9,
      fontWeight: "800" as const,
      color: colors.mutedForeground + "90",
      letterSpacing: 1.2,
      textTransform: "uppercase" as const,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },

    // Sticky footer
    footer: {
      marginTop: "auto",
      paddingHorizontal: 16,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: colors.border + "60",
      gap: 10,
    },
    logoutBtn: {
      flexDirection: "row",
      alignItems: "center" as const,
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 15,
      borderRadius: 16,
      backgroundColor: colors.destructive + "0D",
    },
    logoutText: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: colors.destructive,
    },
    proBtn: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: colors.primary + "0D",
      borderWidth: 1,
      borderColor: colors.primary + "30",
    },
    proIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.accent,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      flexShrink: 0,
    },
    proTextWrap: {
      flex: 1,
      gap: 2,
    },
    proTitle: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: colors.foreground,
    },
    proSubtitle: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontWeight: "500" as const,
    },
    proBadge: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    proBadgeText: {
      fontSize: 9,
      fontWeight: "800" as const,
      color: colors.primaryForeground,
      letterSpacing: 0.8,
    },
  });
}
