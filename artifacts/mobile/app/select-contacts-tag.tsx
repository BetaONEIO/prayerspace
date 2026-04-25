import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, TextInput } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Search, CheckCircle2, X } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { type Contact } from "@/mocks/data";

const SUGGESTIONS: Contact[] = [
  { id: "c1", name: "Michael Scott", avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
  { id: "c2", name: "Pam Beesly", avatar: "https://randomuser.me/api/portraits/women/45.jpg", lastPrayedFor: "1 week ago" },
];

export default function SelectContactsTagScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [search, setSearch] = useState("");
  const [tagged, setTagged] = useState<Contact[]>([SUGGESTIONS[0], { id: "c3", name: "Jim Halpert", avatar: "https://randomuser.me/api/portraits/men/45.jpg" }]);

  const toggle = useCallback((contact: Contact) => {
    setTagged((prev) => {
      const exists = prev.find((c) => c.id === contact.id);
      return exists ? prev.filter((c) => c.id !== contact.id) : [...prev, contact];
    });
  }, []);

  const isTagged = (id: string) => tagged.some((c) => c.id === id);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}><ArrowLeft size={20} color={colors.secondaryForeground} /></Pressable>
        <Text style={styles.title}>Who did you pray for?</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Search size={18} color={colors.mutedForeground} />
          <TextInput style={styles.searchInput} placeholder="Search to tag..." placeholderTextColor={colors.mutedForeground + "80"} value={search} onChangeText={setSearch} />
        </View>
      </View>

      <FlatList
        data={SUGGESTIONS.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {tagged.length > 0 && (
              <View style={styles.tagsWrap}>
                {tagged.map((c) => (
                  <View key={c.id} style={styles.tag}>
                    <Text style={styles.tagText}>{c.name}</Text>
                    <Pressable onPress={() => toggle(c)}><X size={12} color={colors.primary} /></Pressable>
                  </View>
                ))}
              </View>
            )}
            <Text style={styles.sectionLabel}>Suggestions from Prayer</Text>
          </>
        }
        renderItem={({ item }) => {
          const sel = isTagged(item.id);
          return (
            <Pressable style={[styles.contactCard, sel && styles.contactCardSelected]} onPress={() => toggle(item)}>
              <View style={styles.contactLeft}>
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
                <View>
                  <Text style={styles.contactName}>{item.name}</Text>
                  <Text style={[styles.contactSub, sel && { color: colors.primary }]}>{sel ? "Detected in voice" : "Frequent contact"}</Text>
                </View>
              </View>
              {sel ? <CheckCircle2 size={24} color={colors.primary} fill={colors.primary + "20"} /> : <View style={styles.emptyCircle} />}
            </Pressable>
          );
        }}
      />

      <View style={styles.footer}>
        <Pressable style={styles.confirmBtn} onPress={() => router.back()}>
          <Text style={styles.confirmBtnText}>Confirm Tags ({tagged.length})</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 17, fontWeight: "700" as const, color: colors.foreground, textAlign: "center", flex: 1, marginHorizontal: 8 },
    searchWrap: { paddingHorizontal: 24, paddingBottom: 16 },
    searchBar: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderColor: colors.border + "50" },
    searchInput: { flex: 1, fontSize: 14, color: colors.foreground, padding: 0 },
    list: { paddingHorizontal: 24, paddingBottom: 24 },
    tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
    tag: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.primary + "18", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
    tagText: { fontSize: 12, fontWeight: "700" as const, color: colors.primary },
    sectionLabel: { fontSize: 11, fontWeight: "800" as const, color: colors.mutedForeground, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 14 },
    contactCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.card, borderRadius: 24, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: colors.border + "50" },
    contactCardSelected: { borderColor: colors.primary + "60", backgroundColor: colors.primary + "06" },
    contactLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    contactName: { fontSize: 14, fontWeight: "700" as const, color: colors.foreground },
    contactSub: { fontSize: 11, color: colors.mutedForeground, marginTop: 2, fontWeight: "600" as const },
    emptyCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border },
    footer: { paddingHorizontal: 24, paddingBottom: 24, paddingTop: 8 },
    confirmBtn: { backgroundColor: colors.primary, paddingVertical: 18, borderRadius: 999, alignItems: "center", shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
    confirmBtnText: { fontSize: 15, fontWeight: "700" as const, color: colors.primaryForeground },
  });
}
