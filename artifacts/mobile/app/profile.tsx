import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import AvatarImage from "@/components/AvatarImage";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { ChevronLeft, Settings, Camera, User, Mail, Bell, Shield, Palette, ChevronRight } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { usePrayer } from "@/providers/PrayerProvider";

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, profile } = useAuth();
  const { stats } = usePrayer();

  const displayName = profile?.full_name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Prayerful";
  const displayEmail = user?.email ?? "";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={20} color={colors.secondaryForeground} />
          </Pressable>
          <Text style={styles.headerTitle}>Account Details</Text>
          <Pressable style={styles.settingsBtn} onPress={() => router.push("/settings")}>
            <Settings size={20} color={colors.secondaryForeground} />
          </Pressable>
        </View>

        <AutoScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrap}>
              <AvatarImage avatarPath={profile?.avatar_url} fallbackSeed={displayName} style={styles.avatar} />
              <Pressable style={styles.cameraBtn} onPress={() => router.push("/edit-profile")}>
                <Camera size={14} color={colors.primaryForeground} />
              </Pressable>
            </View>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email}>{displayEmail}</Text>

            <View style={styles.statsRow}>
              {[
                { num: stats.totalPrayers, label: "PRAYERS SENT" },
                { num: stats.currentStreak, label: "STREAK" },
                { num: stats.longestStreak, label: "BEST STREAK" },
              ].map(({ num, label }) => (
                <View key={label} style={styles.statCard}>
                  <Text style={styles.statNumber}>{num}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PERSONAL INFORMATION</Text>
            <View style={styles.card}>
              <Pressable style={styles.infoRow} onPress={() => router.push("/edit-profile")}>
                <View style={styles.infoLeft}>
                  <User size={18} color={colors.primary + "90"} />
                  <View><Text style={styles.infoLabel}>DISPLAY NAME</Text><Text style={styles.infoValue}>{displayName}</Text></View>
                </View>
                <ChevronRight size={16} color={colors.mutedForeground} />
              </Pressable>
              <View style={styles.divider} />
              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Mail size={18} color={colors.primary + "90"} />
                  <View><Text style={styles.infoLabel}>EMAIL ADDRESS</Text><Text style={styles.infoValue}>{displayEmail}</Text></View>
                </View>
              </View>
              {profile?.bio && (
                <><View style={styles.divider} /><View style={styles.infoRow}><View style={styles.infoLeft}><View style={styles.infoIconPlaceholder} /><View><Text style={styles.infoLabel}>BIO</Text><Text style={styles.infoValue} numberOfLines={2}>{profile.bio}</Text></View></View></View></>
              )}
              {profile?.favorite_verse && (
                <><View style={styles.divider} /><View style={styles.infoRow}><View style={styles.infoLeft}><View style={styles.infoIconPlaceholder} /><View><Text style={styles.infoLabel}>FAVORITE VERSE</Text><Text style={styles.infoValue}>{profile.favorite_verse}</Text></View></View></View></>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PREFERENCES</Text>
            <View style={styles.card}>
              {[
                { icon: Bell, label: "Notifications", route: "/notification-settings" },
                { icon: Shield, label: "Privacy & Security", route: "/privacy-settings" },
                { icon: Palette, label: "Appearance", route: "/settings" },
              ].map(({ icon: Icon, label, route }, i, arr) => (
                <React.Fragment key={label}>
                  <Pressable style={styles.prefRow} onPress={() => router.push(route as any)}>
                    <View style={styles.prefLeft}>
                      <Icon size={18} color={colors.primary + "90"} />
                      <Text style={styles.prefText}>{label}</Text>
                    </View>
                    <ChevronRight size={16} color={colors.mutedForeground} />
                  </Pressable>
                  {i < arr.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </AutoScrollView>
      </SafeAreaView>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 14 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: "center" as const, justifyContent: "center" as const },
    headerTitle: { fontSize: 18, fontWeight: "700" as const, color: colors.foreground },
    settingsBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: "center" as const, justifyContent: "center" as const },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
    avatarSection: { alignItems: "center" as const, marginBottom: 28 },
    avatarWrap: { position: "relative" as const, marginBottom: 14 },
    avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: colors.card },
    cameraBtn: { position: "absolute" as const, bottom: 2, right: 2, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center" as const, justifyContent: "center" as const, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 },
    name: { fontSize: 24, fontWeight: "800" as const, color: colors.foreground, marginBottom: 4 },
    email: { fontSize: 14, color: colors.mutedForeground, fontWeight: "500" as const, marginBottom: 20 },
    statsRow: { flexDirection: "row", gap: 12, width: "100%" },
    statCard: { flex: 1, backgroundColor: colors.card, padding: 16, borderRadius: 24, alignItems: "center" as const, borderWidth: 1, borderColor: colors.border + "80" },
    statNumber: { fontSize: 24, fontWeight: "800" as const, color: colors.primary, marginBottom: 4 },
    statLabel: { fontSize: 9, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 1 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 11, fontWeight: "800" as const, color: colors.mutedForeground, letterSpacing: 1.5, marginBottom: 12, paddingHorizontal: 4 },
    card: { backgroundColor: colors.card, borderRadius: 24, overflow: "hidden" as const, borderWidth: 1, borderColor: colors.border + "50" },
    infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18 },
    infoLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
    infoIconPlaceholder: { width: 18 },
    infoLabel: { fontSize: 9, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 0.5, marginBottom: 2 },
    infoValue: { fontSize: 14, fontWeight: "600" as const, color: colors.foreground, maxWidth: 240 },
    divider: { height: 1, backgroundColor: colors.border + "50", marginHorizontal: 18 },
    prefRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 18 },
    prefLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
    prefText: { fontSize: 14, fontWeight: "600" as const, color: colors.foreground },
  });
}
