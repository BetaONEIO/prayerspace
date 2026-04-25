import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, TextInput, Platform, Alert } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { ChevronLeft, Search, Check, Mail } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { allContacts, type Contact } from "@/mocks/data";

export default function BulkNotifyScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [searchText, setSearchText] = useState("");
  const [selected, setSelected] = useState<string[]>(["c10", "c13"]);

  const filteredContacts = useMemo(() => {
    if (!searchText.trim()) return allContacts;
    return allContacts.filter((c) => c.name.toLowerCase().includes(searchText.toLowerCase()));
  }, [searchText]);

  const toggleSelect = useCallback((id: string) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setSelected((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  }, []);

  const handleSend = useCallback(() => {
    if (selected.length === 0) { Alert.alert("No Recipients", "Please select at least one recipient."); return; }
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Sent!", `Notification sent to ${selected.length} people.`, [{ text: "OK", onPress: () => router.back() }]);
  }, [selected, router]);

  const renderContact = useCallback(({ item }: { item: Contact }) => {
    const isSelected = selected.includes(item.id);
    return (
      <Pressable style={styles.contactCard} onPress={() => toggleSelect(item.id)}>
        <View style={styles.contactLeft}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
          <View>
            <Text style={styles.contactName}>{item.name}</Text>
            <Text style={styles.contactEmail}>{item.email ?? ""}</Text>
          </View>
        </View>
        <View style={[styles.selectCircle, isSelected && styles.selectCircleActive]}>
          {isSelected && <Check size={12} color={colors.primaryForeground} strokeWidth={3} />}
        </View>
      </Pressable>
    );
  }, [selected, toggleSelect, styles, colors]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}><ChevronLeft size={20} color={colors.secondaryForeground} /></Pressable>
          <Text style={styles.headerTitle}>Send Notifications</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchBar}>
          <Search size={18} color={colors.mutedForeground} />
          <TextInput style={styles.searchInput} placeholder="Search contacts..." placeholderTextColor={colors.mutedForeground + "80"} value={searchText} onChangeText={setSearchText} />
        </View>

        <View style={styles.selectHeader}>
          <Text style={styles.selectLabel}>SELECT RECIPIENTS</Text>
          <Pressable onPress={() => setSelected(allContacts.map((c) => c.id))}><Text style={styles.selectAllText}>Select All</Text></Pressable>
        </View>

        <FlatList data={filteredContacts} keyExtractor={(item) => item.id} renderItem={renderContact} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} />

        <View style={styles.footer}>
          <Pressable style={styles.sendBtn} onPress={handleSend}>
            <Mail size={20} color={colors.primaryForeground} />
            <Text style={styles.sendBtnText}>Send Mass Notification ({selected.length})</Text>
          </Pressable>
          <Text style={styles.footerNote}>Recipients will receive an in-app notification, email, or SMS depending on their preferences.</Text>
        </View>
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
    searchBar: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12, marginHorizontal: 24, marginBottom: 16, borderWidth: 1, borderColor: colors.border + "50" },
    searchInput: { flex: 1, fontSize: 14, color: colors.foreground, padding: 0 },
    selectHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, marginBottom: 12 },
    selectLabel: { fontSize: 11, fontWeight: "800" as const, color: colors.mutedForeground, letterSpacing: 1.5 },
    selectAllText: { fontSize: 12, fontWeight: "700" as const, color: colors.primary },
    listContent: { paddingHorizontal: 24, paddingBottom: 12, gap: 10 },
    contactCard: { backgroundColor: colors.card, padding: 16, borderRadius: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: colors.border + "50" },
    contactLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    contactName: { fontSize: 14, fontWeight: "700" as const, color: colors.foreground },
    contactEmail: { fontSize: 10, color: colors.mutedForeground, marginTop: 2 },
    selectCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: "center" as const, justifyContent: "center" as const },
    selectCircleActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    footer: { padding: 24, backgroundColor: colors.background },
    sendBtn: { flexDirection: "row", alignItems: "center" as const, justifyContent: "center" as const, gap: 10, backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 999, shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
    sendBtnText: { fontSize: 16, fontWeight: "700" as const, color: colors.primaryForeground },
    footerNote: { fontSize: 10, color: colors.mutedForeground, textAlign: "center" as const, marginTop: 14, lineHeight: 16, paddingHorizontal: 24 },
  });
}
