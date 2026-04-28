import React, { useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  User,
  Lock,
  Bell,
  Shield,
  Globe,
  Cloud,
  HelpCircle,
  FileText,
  Star,
  LogOut,
  Sun,
  Moon,
} from "lucide-react-native";
import { useThemeColors, useTheme, ThemeMode } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import SmartRatingModal from "@/components/SmartRatingModal";
import ConfirmModal from "@/components/ConfirmModal";
import { useReviewPrompt } from "@/hooks/useReviewPrompt";

export default function SettingsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const { mode, setTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { signOut, user } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const { showReview, hasRated, openReview, closeReview, handleReviewed } = useReviewPrompt();

  const handleSignOut = useCallback(() => {
    setShowSignOutModal(true);
  }, []);

  const handleConfirmSignOut = useCallback(async () => {
    setShowSignOutModal(false);
    setIsSigningOut(true);
    try {
      await signOut();
      console.log("[Settings] Signed out successfully");
    } catch (error: unknown) {
      console.error("[Settings] Sign out error:", error);
      setIsSigningOut(false);
    }
  }, [signOut]);

  const renderRow = (
    icon: React.ReactNode,
    label: string,
    onPress?: () => void,
    trailing?: React.ReactNode
  ) => (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowLeft}>
        {icon}
        <Text style={styles.rowText}>{label}</Text>
      </View>
      {trailing ?? <ChevronRight size={16} color={colors.mutedForeground} />}
    </Pressable>
  );

  const appearanceTrailing = (
    <View style={styles.themeToggleRow}>
      <Pressable
        style={[styles.themeOption, mode === "light" && styles.themeOptionActive]}
        onPress={() => setTheme("light")}
      >
        <Sun size={14} color={mode === "light" ? colors.primaryForeground : colors.mutedForeground} />
        <Text style={[styles.themeOptionText, mode === "light" && styles.themeOptionTextActive]}>Light</Text>
      </Pressable>
      <Pressable
        style={[styles.themeOption, mode === "dark" && styles.themeOptionActive]}
        onPress={() => setTheme("dark")}
      >
        <Moon size={14} color={mode === "dark" ? colors.primaryForeground : colors.mutedForeground} />
        <Text style={[styles.themeOptionText, mode === "dark" && styles.themeOptionTextActive]}>Dark</Text>
      </Pressable>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={colors.secondaryForeground} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <AutoScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {user?.email && (
          <View style={styles.accountBadge}>
            <Text style={styles.accountBadgeLabel}>SIGNED IN AS</Text>
            <Text style={styles.accountBadgeEmail}>{user.email}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.card}>
            {renderRow(
              <User size={18} color={colors.primary + "90"} />,
              "Profile Information",
              () => router.push("/edit-profile")
            )}
            <View style={styles.divider} />
            {renderRow(
              <Lock size={18} color={colors.primary + "90"} />,
              "Change Password",
              () => router.push("/password-reset")
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APP SETTINGS</Text>
          <View style={styles.card}>
            {renderRow(
              <Bell size={18} color={colors.primary + "90"} />,
              "Notifications",
              () => router.push("/notification-settings")
            )}
            <View style={styles.divider} />
            {renderRow(
              <Shield size={18} color={colors.primary + "90"} />,
              "Privacy",
              () => router.push("/privacy-settings")
            )}
            <View style={styles.divider} />
            {renderRow(
              <Globe size={18} color={colors.primary + "90"} />,
              "Language",
              undefined,
              <Text style={styles.trailingText}>English</Text>
            )}
            <View style={styles.divider} />
            {renderRow(
              <Cloud size={18} color={colors.primary + "90"} />,
              "Data & Backup",
              () => router.push("/data-backup")
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APPEARANCE</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                {mode === "dark"
                  ? <Moon size={18} color={colors.primary + "90"} />
                  : <Sun size={18} color={colors.primary + "90"} />
                }
                <Text style={styles.rowText}>Theme</Text>
              </View>
              {appearanceTrailing}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SUPPORT</Text>
          <View style={styles.card}>
            {renderRow(
              <HelpCircle size={18} color={colors.primary + "90"} />,
              "Help Center",
              () => router.push("/help-centre")
            )}
            <View style={styles.divider} />
            {renderRow(
              <FileText size={18} color={colors.primary + "90"} />,
              "Terms of Service",
              () => router.push("/terms-of-service")
            )}
            <View style={styles.divider} />
            {renderRow(
              <Star size={18} color={hasRated ? "#F5A623" : colors.primary + "90"} fill={hasRated ? "#F5A623" : "none"} />,
              hasRated ? "Thanks for your support 🙏" : "Rate the App",
              hasRated ? undefined : openReview,
              hasRated ? <View style={{ width: 16 }} /> : undefined
            )}
          </View>
        </View>

        <Pressable
          style={[styles.signOutBtn, isSigningOut && styles.signOutBtnDisabled]}
          onPress={handleSignOut}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator size="small" color={colors.secondaryForeground} />
          ) : (
            <LogOut size={18} color={colors.secondaryForeground} />
          )}
          <Text style={styles.signOutText}>
            {isSigningOut ? "Signing Out..." : "Sign Out"}
          </Text>
        </Pressable>

        <Text style={styles.version}>VERSION 2.4.0 (BUILD 108)</Text>

      <SmartRatingModal
        visible={showReview}
        onClose={closeReview}
        onRated={handleReviewed}
      />

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

        <View style={{ height: 40 }} />
      </AutoScrollView>
    </SafeAreaView>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingVertical: 14,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.foreground,
    },
    accountBadge: {
      backgroundColor: colors.accent,
      borderRadius: 16,
      padding: 14,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.primary + "20",
    },
    accountBadgeLabel: {
      fontSize: 9,
      fontWeight: "800" as const,
      color: colors.accentForeground,
      letterSpacing: 1.5,
      marginBottom: 4,
    },
    accountBadgeEmail: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingBottom: 40,
    },
    section: {
      marginBottom: 28,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: "800" as const,
      color: colors.mutedForeground,
      letterSpacing: 1.5,
      marginBottom: 12,
      paddingHorizontal: 4,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 24,
      overflow: "hidden" as const,
      borderWidth: 1,
      borderColor: colors.border + "50",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 18,
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    rowText: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    trailingText: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontWeight: "500" as const,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border + "50",
      marginHorizontal: 18,
    },
    themeToggleRow: {
      flexDirection: "row" as const,
      gap: 6,
    },
    themeOption: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 5,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    themeOptionActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    themeOptionText: {
      fontSize: 12,
      fontWeight: "700" as const,
      color: colors.mutedForeground,
    },
    themeOptionTextActive: {
      color: colors.primaryForeground,
    },
    signOutBtn: {
      flexDirection: "row",
      alignItems: "center" as const,
      justifyContent: "center" as const,
      gap: 10,
      paddingVertical: 18,
      borderRadius: 24,
      backgroundColor: colors.secondary,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 20,
    },
    signOutBtnDisabled: {
      opacity: 0.6,
    },
    signOutText: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.secondaryForeground,
    },
    version: {
      fontSize: 10,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
      textAlign: "center" as const,
      letterSpacing: 1.5,
    },
  });
}
