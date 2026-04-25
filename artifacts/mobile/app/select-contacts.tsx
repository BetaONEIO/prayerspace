import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, TextInput, ScrollView } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Search, X, CheckCircle2 } from "lucide-react-native";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import { allContacts, type Contact } from "@/mocks/data";

export default function SelectContactsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Contact[]>([allContacts[0], allContacts[1]]);

  const filtered = allContacts.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const toggleContact = useCallback((contact: Contact) => {
    setSelected((prev) => {
      const exists = prev.find((c) => c.id === contact.id);
      return exists ? prev.filter((c) => c.id !== contact.id) : [...prev, contact];
    });
  }, []);
  const isSelected = (id: string) => selected.some((c) => c.id === id);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.cancelBtn}>Cancel</Text></Pressable>
        <Text style={styles.title}>Select Contacts</Text>
        <Pressable onPress={() => router.back()}><Text style={styles.doneBtn}>Done</Text></Pressable>
      </View>

      {selected.length > 0 && (
        <View style={styles.selectedBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selected.map((c) => (
              <View key={c.id} style={styles.selectedItem}>
                <View style={styles.selectedAvatarWrap}>
                  <Image source={{ uri: c.avatar }} style={styles.selectedAvatar} />
                  <Pressable style={styles.removeBtn} onPress={() => toggleContact(c)}><X size={10} color={colors.primaryForeground} /></Pressable>
                </View>
                <Text style={styles.selectedName} numberOfLines={1}>{c.name.split(" ")[0]}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Search size={16} color={colors.mutedForeground} />
          <TextInput style={styles.searchInput} placeholder="Search..." placeholderTextColor={colors.mutedForeground + "80"} value={search} onChangeText={setSearch} />
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const sel = isSelected(item.id);
          return (
            <Pressable style={styles.contactRow} onPress={() => toggleContact(item)}>
              <View style={styles.contactLeft}>
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
                <View><Text style={styles.contactName}>{item.name}</Text><Text style={styles.contactSub}>{item.email ?? item.phone ?? ""}</Text></View>
              </View>
              <View style={[styles.checkCircle, sel && styles.checkCircleSelected]}>
                {sel && <CheckCircle2 size={14} color={colors.primaryForeground} />}
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border + "50" },
    cancelBtn: { fontSize: 15, fontWeight: "700" as const, color: colors.primary },
    doneBtn: { fontSize: 15, fontWeight: "700" as const, color: colors.primary },
    title: { fontSize: 17, fontWeight: "700" as const, color: colors.foreground },
    selectedBar: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border + "50" },
    selectedItem: { alignItems: "center", marginHorizontal: 6, width: 52 },
    selectedAvatarWrap: { position: "relative" },
    selectedAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.primary },
    removeBtn: { position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: colors.foreground, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.card },
    selectedName: { fontSize: 10, fontWeight: "700" as const, color: colors.foreground, marginTop: 4 },
    searchWrap: { backgroundColor: colors.secondary, paddingHorizontal: 16, paddingVertical: 12 },
    searchBar: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: colors.border },
    searchInput: { flex: 1, fontSize: 14, color: colors.foreground, padding: 0 },
    list: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
    contactRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
    contactLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    contactName: { fontSize: 14, fontWeight: "700" as const, color: colors.foreground },
    contactSub: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
    checkCircleSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  });
}
