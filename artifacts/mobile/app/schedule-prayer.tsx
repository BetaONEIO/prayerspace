import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Platform, Alert, KeyboardAvoidingView } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { ChevronLeft, Calendar, Clock, Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import ThemedSwitch from "@/components/ThemedSwitch";

const PRAY_WITH = [
  { id: "p1", name: "Michael", avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
  { id: "p2", name: "Chloe", avatar: "https://randomuser.me/api/portraits/women/24.jpg" },
];

export default function SchedulePrayerScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [topic, setTopic] = useState("");
  const [reminder, setReminder] = useState(true);
  const [recurring, setRecurring] = useState(false);

  const handleSchedule = useCallback(() => {
    if (!topic.trim()) { Alert.alert("Topic Required", "Please describe what you're praying for."); return; }
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Scheduled!", "Your prayer has been scheduled.", [{ text: "OK", onPress: () => router.back() }]);
  }, [topic, router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}><ChevronLeft size={20} color={colors.secondaryForeground} /></Pressable>
            <Text style={styles.headerTitle}>Schedule Prayer</Text>
            <View style={{ width: 40 }} />
          </View>

          <AutoScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <View style={styles.field}>
                <Text style={styles.label}>PRAYER TOPIC</Text>
                <TextInput style={styles.input} placeholder="What are you praying for?" placeholderTextColor={colors.mutedForeground + "80"} value={topic} onChangeText={setTopic} />
              </View>

              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.label}>DATE</Text>
                  <Pressable style={styles.dateBtn}><Text style={styles.dateBtnText}>Oct 25, 2024</Text><Calendar size={18} color={colors.primary} /></Pressable>
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.label}>TIME</Text>
                  <Pressable style={styles.dateBtn}><Text style={styles.dateBtnText}>08:00 AM</Text><Clock size={18} color={colors.primary} /></Pressable>
                </View>
              </View>

              <View style={styles.toggleRow}><Text style={styles.toggleLabel}>Set Reminder</Text><ThemedSwitch value={reminder} onValueChange={setReminder} /></View>
              <View style={[styles.toggleRow, !recurring && { opacity: 0.6 }]}><Text style={styles.toggleLabel}>Recurring</Text><ThemedSwitch value={recurring} onValueChange={setRecurring} /></View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>PRAYING WITH</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.prayWithRow}>
                {PRAY_WITH.map((p) => (
                  <View key={p.id} style={styles.prayWithItem}>
                    <View style={styles.prayWithAvatarWrap}><Image source={{ uri: p.avatar }} style={styles.prayWithAvatar} /></View>
                    <Text style={styles.prayWithName}>{p.name}</Text>
                  </View>
                ))}
                <Pressable style={styles.prayWithItem}>
                  <View style={styles.inviteCircle}><Plus size={22} color={colors.mutedForeground} /></View>
                  <Text style={styles.prayWithNameMuted}>Invite</Text>
                </Pressable>
              </ScrollView>
            </View>
          </AutoScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.scheduleBtn} onPress={handleSchedule}><Text style={styles.scheduleBtnText}>Schedule This Prayer</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
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
    scrollContent: { paddingHorizontal: 24, paddingBottom: 24 },
    card: { backgroundColor: colors.card, borderRadius: 28, padding: 22, borderWidth: 1, borderColor: colors.border + "50", marginBottom: 28, gap: 20 },
    field: { gap: 10 },
    label: { fontSize: 10, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 1.5, paddingHorizontal: 4 },
    input: { backgroundColor: colors.secondary, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 16, fontSize: 15, color: colors.foreground },
    dateRow: { flexDirection: "row", gap: 14 },
    dateField: { flex: 1, gap: 10 },
    dateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.secondary, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 16 },
    dateBtnText: { fontSize: 14, color: colors.foreground, fontWeight: "500" as const },
    toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 },
    toggleLabel: { fontSize: 14, fontWeight: "700" as const, color: colors.foreground },
    section: { gap: 14 },
    prayWithRow: { gap: 16, paddingVertical: 8 },
    prayWithItem: { alignItems: "center" as const, gap: 8 },
    prayWithAvatarWrap: { width: 56, height: 56, borderRadius: 28, padding: 3, borderWidth: 2, borderColor: colors.primary + "30" },
    prayWithAvatar: { width: "100%", height: "100%", borderRadius: 26 },
    prayWithName: { fontSize: 12, fontWeight: "700" as const, color: colors.foreground },
    prayWithNameMuted: { fontSize: 12, fontWeight: "700" as const, color: colors.mutedForeground },
    inviteCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.secondary, borderWidth: 2, borderStyle: "dashed" as const, borderColor: colors.border, alignItems: "center" as const, justifyContent: "center" as const },
    footer: { padding: 24 },
    scheduleBtn: { backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 999, alignItems: "center" as const, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
    scheduleBtnText: { fontSize: 16, fontWeight: "700" as const, color: colors.primaryForeground },
  });
}
