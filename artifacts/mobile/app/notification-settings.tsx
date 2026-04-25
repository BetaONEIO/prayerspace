import React, { useCallback, useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Platform, ActivityIndicator } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import ThemedSwitch from "@/components/ThemedSwitch";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface NotificationPrefs {
  push_notifications: boolean;
  email_digest: boolean;
  whatsapp_alerts: boolean;
  daily_verse: boolean;
  prayer_streak: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  push_notifications: true,
  email_digest: false,
  whatsapp_alerts: true,
  daily_verse: true,
  prayer_streak: true,
};

interface SettingItem {
  id: keyof NotificationPrefs;
  title: string;
  description: string;
}

const prayerSettings: SettingItem[] = [
  { id: "push_notifications", title: "Push Notifications", description: "Instantly know when someone prays" },
  { id: "email_digest", title: "Email Digest", description: "Weekly summary of spiritual support" },
  { id: "whatsapp_alerts", title: "WhatsApp Alerts", description: "Receive direct messages via WhatsApp" },
];

const reminderSettings: SettingItem[] = [
  { id: "daily_verse", title: "Daily Verse", description: "Morning inspiration" },
  { id: "prayer_streak", title: "Prayer Streak", description: "Don't lose your progress" },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [localPrefs, setLocalPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);

  const prefsQuery = useQuery({
    queryKey: ["notification_preferences", user?.id],
    queryFn: async () => {
      if (!user?.id) return DEFAULT_PREFS;
      console.log("[NotifSettings] Loading preferences for:", user.id);
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) {
        if (error.code !== "PGRST116") {
          console.error("[NotifSettings] Load error:", error.message);
        }
        return DEFAULT_PREFS;
      }
      return data as NotificationPrefs;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (prefsQuery.data) {
      setLocalPrefs(prefsQuery.data);
    }
  }, [prefsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (prefs: NotificationPrefs) => {
      if (!user?.id) return;
      console.log("[NotifSettings] Saving preferences...");
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({
          user_id: user.id,
          ...prefs,
          updated_at: new Date().toISOString(),
        });
      if (error) console.error("[NotifSettings] Save error:", error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notification_preferences"] });
    },
  });

  const toggleSetting = useCallback((id: keyof NotificationPrefs) => {
    if (Platform.OS !== "web") {
      void Haptics.selectionAsync();
    }
    setLocalPrefs((prev) => {
      const updated = { ...prev, [id]: !prev[id] };
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation]);

  const renderSection = (title: string, items: SettingItem[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>
        {items.map((item, index) => (
          <View
            key={item.id}
            style={[
              styles.settingRow,
              index < items.length - 1 && styles.settingRowBorder,
            ]}
          >
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>{item.title}</Text>
              <Text style={styles.settingDesc}>{item.description}</Text>
            </View>
            <ThemedSwitch
              value={localPrefs[item.id]}
              onValueChange={() => toggleSetting(item.id)}
              testID={`setting-${item.id}`}
            />
          </View>
        ))}
      </View>
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
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerRight}>
          {saveMutation.isPending && (
            <ActivityIndicator size="small" color={colors.primary} />
          )}
        </View>
      </View>

      {prefsQuery.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <AutoScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderSection("Prayers for you", prayerSettings)}
          {renderSection("Reminders", reminderSettings)}
        </AutoScrollView>
      )}
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
    headerRight: {
      width: 40,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
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
      textTransform: "uppercase" as const,
      marginBottom: 14,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 24,
      overflow: "hidden" as const,
      borderWidth: 1,
      borderColor: colors.border + "50",
    },
    settingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 18,
    },
    settingRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border + "30",
    },
    settingInfo: {
      flex: 1,
      marginRight: 16,
    },
    settingTitle: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.foreground,
    },
    settingDesc: {
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 3,
    },
  });
}
