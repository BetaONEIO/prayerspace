import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Platform, Alert } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import {
  ChevronLeft,
  User,
  Eye,
  Clock,
  Users,
  HandHeart,
  ChevronRight,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { usePrayer } from "@/providers/PrayerProvider";
import ThemedSwitch from "@/components/ThemedSwitch";

const INVITE_OPTIONS = ["Everyone", "Friends", "No one"] as const;
const PRAY_OPTIONS = ["Everyone", "Friends", "No one"] as const;

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { settings, updateSetting } = usePrayer();
  const [whoCanInvite, setWhoCanInvite] = useState<string>("Friends");
  const [whoCanPray, setWhoCanPray] = useState<string>("Everyone");

  const toggleSetting = useCallback((key: "publicProfile" | "showPrayerCount" | "privateJournal") => {
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync();
    }
    updateSetting(key, !settings[key]);
  }, [settings, updateSetting]);

  const showOptionPicker = useCallback((title: string, options: readonly string[], current: string, onSelect: (val: string) => void) => {
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync();
    }
    Alert.alert(
      title,
      undefined,
      options.map((opt) => ({
        text: opt + (opt === current ? " ✓" : ""),
        onPress: () => onSelect(opt),
        style: opt === current ? ("cancel" as const) : ("default" as const),
      }))
    );
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={colors.secondaryForeground} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <AutoScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VISIBILITY</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <User size={18} color={colors.primary + "90"} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Public Profile</Text>
                  <Text style={styles.rowDesc}>Allow others to find your profile</Text>
                </View>
              </View>
              <ThemedSwitch
                value={settings.publicProfile}
                onValueChange={() => toggleSetting("publicProfile")}
                testID="toggle-publicProfile"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Eye size={18} color={colors.primary + "90"} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Show Prayer Count</Text>
                  <Text style={styles.rowDesc}>Display your stats to others</Text>
                </View>
              </View>
              <ThemedSwitch
                value={settings.showPrayerCount}
                onValueChange={() => toggleSetting("showPrayerCount")}
                testID="toggle-showPrayerCount"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Clock size={18} color={colors.primary + "90"} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>Private Journal</Text>
                  <Text style={styles.rowDesc}>Only you can see your entries</Text>
                </View>
              </View>
              <ThemedSwitch
                value={settings.privateJournal}
                onValueChange={() => toggleSetting("privateJournal")}
                testID="toggle-privateJournal"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>INTERACTIONS</Text>
          <View style={styles.card}>
            <Pressable
              style={styles.row}
              onPress={() => showOptionPicker("Who can invite you to groups?", INVITE_OPTIONS, whoCanInvite, setWhoCanInvite)}
            >
              <View style={styles.rowLeft}>
                <Users size={18} color={colors.primary + "90"} />
                <Text style={styles.rowTitle}>Who can invite you to groups</Text>
              </View>
              <View style={styles.trailingRow}>
                <Text style={styles.trailingText}>{whoCanInvite}</Text>
                <ChevronRight size={16} color={colors.mutedForeground} />
              </View>
            </Pressable>
            <View style={styles.divider} />
            <Pressable
              style={styles.row}
              onPress={() => showOptionPicker("Who can pray for you?", PRAY_OPTIONS, whoCanPray, setWhoCanPray)}
            >
              <View style={styles.rowLeft}>
                <HandHeart size={18} color={colors.primary + "90"} />
                <Text style={styles.rowTitle}>Who can pray for you</Text>
              </View>
              <View style={styles.trailingRow}>
                <Text style={styles.trailingText}>{whoCanPray}</Text>
                <ChevronRight size={16} color={colors.mutedForeground} />
              </View>
            </Pressable>
          </View>
        </View>
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
    scrollContent: {
      paddingHorizontal: 24,
      paddingBottom: 40,
    },
    section: {
      marginBottom: 32,
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
      flex: 1,
      marginRight: 12,
    },
    rowTitle: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: colors.foreground,
    },
    rowDesc: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontWeight: "500" as const,
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border + "50",
      marginHorizontal: 18,
    },
    trailingRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
    },
    trailingText: {
      fontSize: 13,
      fontWeight: "700" as const,
      color: colors.primary,
    },
  });
}
