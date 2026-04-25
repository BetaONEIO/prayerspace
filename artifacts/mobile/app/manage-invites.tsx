import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Trash2 } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";

type Filter = "All (8)" | "SMS (5)" | "WhatsApp (3)";
interface PendingInvite { id: string; initials: string; name: string; sentInfo: string; channel: "SMS" | "WhatsApp"; }

const INVITES: PendingInvite[] = [
  { id: "1", initials: "JD", name: "John Doe", sentInfo: "Sent 2 days ago via SMS", channel: "SMS" },
  { id: "2", initials: "MM", name: "Maria Mendez", sentInfo: "Sent 1 week ago via WhatsApp", channel: "WhatsApp" },
  { id: "3", initials: "TR", name: "Tom Richards", sentInfo: "Sent 3 days ago via SMS", channel: "SMS" },
  { id: "4", initials: "KP", name: "Kim Parker", sentInfo: "Sent 5 days ago via WhatsApp", channel: "WhatsApp" },
];
const FILTERS: Filter[] = ["All (8)", "SMS (5)", "WhatsApp (3)"];

export default function ManageInvitesScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeFilter, setActiveFilter] = useState<Filter>("All (8)");
  const [invites, setInvites] = useState(INVITES);

  const filtered = invites.filter((i) => {
    if (activeFilter === "SMS (5)") return i.channel === "SMS";
    if (activeFilter === "WhatsApp (3)") return i.channel === "WhatsApp";
    return true;
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}><ArrowLeft size={20} color={colors.secondaryForeground} /></Pressable>
        <Text style={styles.title}>Pending Invites</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable key={f} style={[styles.filterChip, activeFilter === f && styles.filterActive]} onPress={() => setActiveFilter(f)}>
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <View style={[styles.inviteCard, index > 0 && { marginTop: 12 }]}>
            <View style={styles.contactLeft}>
              <View style={styles.initials}><Text style={styles.initialsText}>{item.initials}</Text></View>
              <View><Text style={styles.name}>{item.name}</Text><Text style={styles.sentInfo}>{item.sentInfo}</Text></View>
            </View>
            <View style={styles.actions}>
              <Pressable style={styles.deleteBtn} onPress={() => Alert.alert("Remove Invite", "Remove this pending invite?", [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => setInvites((prev) => prev.filter((i) => i.id !== item.id)) }])}>
                <Trash2 size={20} color={colors.destructive} />
              </Pressable>
              <Pressable style={styles.remindBtn} onPress={() => Alert.alert("Reminder Sent!", `Reminder sent to ${item.name}.`)}>
                <Text style={styles.remindBtnText}>Remind</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 19, fontWeight: "700" as const, color: colors.foreground },
    filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 24, paddingBottom: 16 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { fontSize: 12, fontWeight: "600" as const, color: colors.mutedForeground },
    filterTextActive: { color: colors.primaryForeground, fontWeight: "700" as const },
    list: { paddingHorizontal: 24, paddingBottom: 40 },
    inviteCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border + "50" },
    contactLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    initials: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" },
    initialsText: { fontSize: 14, fontWeight: "700" as const, color: colors.secondaryForeground },
    name: { fontSize: 14, fontWeight: "700" as const, color: colors.foreground },
    sentInfo: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
    actions: { flexDirection: "row", alignItems: "center", gap: 10 },
    deleteBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.destructive + "10", alignItems: "center", justifyContent: "center" },
    remindBtn: { backgroundColor: colors.primary + "18", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
    remindBtnText: { fontSize: 12, fontWeight: "700" as const, color: colors.primary },
  });
}
