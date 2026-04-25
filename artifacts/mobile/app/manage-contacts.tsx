import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, RefreshCw, Users, UserX, ChevronRight, ShieldCheck } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import ThemedSwitch from "@/components/ThemedSwitch";

export default function ManageContactsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [autoOutreach, setAutoOutreach] = useState(true);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}><ArrowLeft size={20} color={colors.secondaryForeground} /></Pressable>
        <Text style={styles.title}>Manage Contacts</Text>
        <View style={{ width: 40 }} />
      </View>

      <AutoScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.importCard}>
          <View style={styles.importBadge}><ShieldCheck size={18} color={colors.primary} /></View>
          <Text style={styles.importTitle}>Import your contacts</Text>
          <Text style={styles.importDescription}>Find friends already using the app and connect with them.</Text>
          <View style={styles.importActions}>
            <Pressable style={styles.importPrimaryBtn} onPress={() => router.push("/onboarding/contact-permissions" as never)}>
              <Text style={styles.importPrimaryBtnText}>Import Contacts</Text>
            </Pressable>
            <Pressable style={styles.importSecondaryBtn} onPress={() => Alert.alert("Later", "You can come back anytime to import contacts.")}>
              <Text style={styles.importSecondaryBtnText}>Maybe Later</Text>
            </Pressable>
          </View>
        </View>

        {[
          { icon: RefreshCw, title: "Sync Contacts", sub: "Last synced: 2 hours ago", action: () => router.push("/onboarding/contact-permissions" as never), actionLabel: "Sync Now" },
          { icon: Users, title: "Circle Visibility", sub: "Manage who can see you", route: "/select-contacts" },
          { icon: UserX, title: "Blocked Contacts", sub: "0 contacts blocked", danger: true },
        ].map(({ icon: Icon, title, sub, action, actionLabel, route, danger }) => (
          <Pressable key={title} style={[styles.contactCard, danger && { opacity: 0.6 }]} onPress={route ? () => router.push(route as any) : action}>
            <View style={[styles.iconWrap, danger && { backgroundColor: colors.destructive + "14" }]}>
              <Icon size={22} color={danger ? colors.destructive : colors.primary} />
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{title}</Text>
              <Text style={styles.cardSub}>{sub}</Text>
            </View>
            {actionLabel ? (
              <Pressable style={styles.syncBtn} onPress={action}><Text style={styles.syncBtnText}>{actionLabel}</Text></Pressable>
            ) : (
              <ChevronRight size={20} color={colors.mutedForeground} />
            )}
          </Pressable>
        ))}

        <View style={styles.automationCard}>
          <Text style={styles.automationTitle}>Automated Outreach</Text>
          <Text style={styles.automationDesc}>Automatically send a follow-up prayer notification if an invited contact joins within 7 days.</Text>
          <View style={styles.toggleRow}>
            <ThemedSwitch value={autoOutreach} onValueChange={setAutoOutreach} />
            <Text style={styles.activeLabel}>Active</Text>
          </View>
        </View>
      </AutoScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 19, fontWeight: "700" as const, color: colors.foreground },
    content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40, gap: 12 },
    importCard: { backgroundColor: colors.card, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 14 },
    importBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary + "14", alignItems: "center", justifyContent: "center" },
    importTitle: { fontSize: 18, fontWeight: "800" as const, color: colors.foreground },
    importDescription: { fontSize: 13, lineHeight: 20, color: colors.mutedForeground },
    importActions: { flexDirection: "row", alignItems: "center", gap: 10 },
    importPrimaryBtn: { flex: 1, backgroundColor: colors.primary, minHeight: 46, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
    importPrimaryBtnText: { fontSize: 13, fontWeight: "800" as const, color: colors.primaryForeground },
    importSecondaryBtn: { minHeight: 46, borderRadius: 999, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, backgroundColor: colors.secondary },
    importSecondaryBtnText: { fontSize: 13, fontWeight: "700" as const, color: colors.secondaryForeground },
    contactCard: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.card, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: colors.border + "50" },
    iconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary + "14", alignItems: "center", justifyContent: "center" },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 14, fontWeight: "700" as const, color: colors.foreground },
    cardSub: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
    syncBtn: { backgroundColor: colors.secondary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
    syncBtnText: { fontSize: 11, fontWeight: "700" as const, color: colors.secondaryForeground },
    automationCard: { marginTop: 12, backgroundColor: colors.accent, borderRadius: 28, padding: 24, alignItems: "center", gap: 12 },
    automationTitle: { fontSize: 15, fontWeight: "700" as const, color: colors.foreground },
    automationDesc: { fontSize: 13, color: colors.mutedForeground, textAlign: "center", lineHeight: 19 },
    toggleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
    activeLabel: { fontSize: 11, fontWeight: "800" as const, color: colors.primary, textTransform: "uppercase", letterSpacing: 1 },
  });
}
