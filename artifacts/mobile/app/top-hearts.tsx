import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  FlatList,
  TextInput,
} from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import {
  ArrowLeft,
  Search,
  Star,
  History,
  Heart,
  Plus,
  HandHeart,
  MessageCircle,
  X,
  Check,
  Users,
} from "lucide-react-native";
import { LightColors as Colors } from "@/constants/colors";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";
import { type Contact } from "@/mocks/data";
import { useFavourites } from "@/providers/FavouritesProvider";
import { ALL_RECIPIENTS, type Recipient } from "@/providers/SelectedRecipientsProvider";

const SOURCE_COLORS: Record<string, string> = {
  whatsapp: "#25D366",
  sim: "#3B82F6",
  app: Colors.primary,
};

export default function TopHeartsScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const {
    favourites,
    frequentlyPrayedFor,
    addFavourites,
    removeFavourite,
  } = useFavourites();
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [selected, setSelected] = useState<string[]>([]);

  const filteredContacts = useMemo(() => ALL_RECIPIENTS.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) &&
      !favourites.find((f) => f.id === r.id)
  ), [search, favourites]);

  const onAppContacts = filteredContacts.filter((r) => r.onApp);
  const otherContacts = filteredContacts.filter((r) => !r.onApp);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const handleAddFavourites = useCallback(() => {
    const toAdd: Contact[] = ALL_RECIPIENTS
      .filter((r) => selected.includes(r.id))
      .map((r) => ({ id: r.id, name: r.name, avatar: r.avatar ?? "" }));
    addFavourites(toAdd);
    setSelected([]);
    setSearch("");
    setShowAddModal(false);
  }, [selected, addFavourites]);

  const handleRemoveFavourite = useCallback((id: string) => {
    removeFavourite(id);
  }, [removeFavourite]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.secondaryForeground} />
        </Pressable>
        <Text style={styles.headerTitle}>Favourites</Text>
        <Pressable style={styles.searchBtn} onPress={() => setShowAddModal(true)}>
          <Search size={18} color={Colors.primary} />
        </Pressable>
      </View>

      <AutoScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLabelRow}>
              <Star size={15} color={Colors.primary} fill={Colors.primary} />
              <Text style={styles.sectionLabel}>FAVOURITES</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{favourites.length} People</Text>
            </View>
          </View>

          <View style={styles.favouritesGrid}>
            {favourites.map((contact) => (
              <Pressable
                key={contact.id}
                style={styles.favouriteItem}
                onLongPress={() => handleRemoveFavourite(contact.id)}
                onPress={() => router.push(`/contact/${contact.id}`)}
              >
                <View style={styles.favouriteAvatarWrap}>
                  <Image
                    source={{ uri: contact.avatar }}
                    style={styles.favouriteAvatar}
                  />
                  <View style={styles.heartBadge}>
                    <Heart size={8} color="#fff" fill="#fff" />
                  </View>
                </View>
                <Text style={styles.favouriteName} numberOfLines={1}>
                  {contact.name}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={styles.favouriteItem}
              onPress={() => setShowAddModal(true)}
            >
              <View style={styles.addCircle}>
                <Plus size={26} color={Colors.primary + "80"} />
              </View>
              <Text style={styles.addLabel}>Add</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <History size={15} color={Colors.primary} />
            <Text style={styles.sectionLabel}>FREQUENTLY PRAYED FOR</Text>
          </View>

          <View style={styles.listContainer}>
            {frequentlyPrayedFor.map((item) => (
              <Pressable
                key={item.id}
                style={styles.listCard}
                onPress={() => router.push(`/contact/${item.id}`)}
              >
                <View style={styles.listLeft}>
                  <Image
                    source={{ uri: item.avatar }}
                    style={styles.listAvatar}
                  />
                  <View style={styles.listInfo}>
                    <Text style={styles.listName}>{item.name}</Text>
                    <View style={styles.listMeta}>
                      <Text style={styles.prayerCount}>{item.prayerCount} Prayers</Text>
                      <View style={styles.dot} />
                      <Text style={styles.frequency}>{item.frequency}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.actionBtns}>
                  <Pressable
                    style={styles.msgBtn}
                    onPress={() => router.push("/(tabs)/messages")}
                  >
                    <MessageCircle size={17} color={Colors.primary} />
                  </Pressable>
                  <Pressable
                    style={styles.prayBtn}
                    onPress={() => router.push("/(tabs)/pray")}
                  >
                    <HandHeart size={18} color={Colors.primary} />
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ height: 32 }} />
      </AutoScrollView>

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={["top"]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add to Favourites</Text>
            <Pressable
              style={styles.modalClose}
              onPress={() => {
                setShowAddModal(false);
                setSelected([]);
                setSearch("");
              }}
            >
              <X size={20} color={Colors.secondaryForeground} />
            </Pressable>
          </View>

          <View style={styles.searchBar}>
            <Search size={16} color={Colors.mutedForeground} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              placeholderTextColor={Colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>

          {filteredContacts.length === 0 ? (
            <View style={styles.emptyState}>
              <Users size={40} color={Colors.border} />
              <Text style={styles.emptyText}>
                {search ? "No contacts found" : "All contacts added"}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.modalList}
              showsVerticalScrollIndicator={false}
            >
              {onAppContacts.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>On Prayer Space</Text>
                  <View style={styles.groupCard}>
                    {onAppContacts.map((item, index) => {
                      const isSelected = selected.includes(item.id);
                      return (
                        <View key={item.id}>
                          {index > 0 && <View style={styles.divider} />}
                          <Pressable
                            style={styles.contactRow}
                            onPress={() => toggleSelect(item.id)}
                          >
                            {item.avatar ? (
                              <Image source={{ uri: item.avatar }} style={styles.contactAvatar} />
                            ) : (
                              <View style={styles.initialsAvatar}>
                                <Text style={styles.initialsText}>{item.initials}</Text>
                              </View>
                            )}
                            <View style={styles.contactInfo}>
                              <View style={styles.nameRow}>
                                <Text style={styles.contactName}>{item.name}</Text>
                                <View style={styles.onAppBadge}>
                                  <Text style={styles.onAppBadgeText}>On App</Text>
                                </View>
                              </View>
                              <Text style={styles.contactSubtitle}>{item.subtitle}</Text>
                            </View>
                            <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                              {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                            </View>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}

              {otherContacts.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { marginTop: onAppContacts.length > 0 ? 20 : 0 }]}>Other Contacts</Text>
                  <View style={styles.otherList}>
                    {otherContacts.map((item) => {
                      const isSelected = selected.includes(item.id);
                      return (
                        <Pressable
                          key={item.id}
                          style={styles.otherCard}
                          onPress={() => toggleSelect(item.id)}
                        >
                          <View style={styles.contactRow}>
                            {item.avatar ? (
                              <Image source={{ uri: item.avatar }} style={styles.contactAvatar} />
                            ) : (
                              <View style={styles.initialsAvatar}>
                                <Text style={styles.initialsText}>{item.initials}</Text>
                              </View>
                            )}
                            <View style={styles.contactInfo}>
                              <View style={styles.nameRow}>
                                <Text style={styles.contactName}>{item.name}</Text>
                                <View style={styles.offAppBadge}>
                                  <Text style={styles.offAppBadgeText}>Not on app</Text>
                                </View>
                              </View>
                              <View style={styles.subtitleRow}>
                                <View style={[styles.sourceDot, { backgroundColor: SOURCE_COLORS[item.source] }]} />
                                <Text style={styles.contactSubtitle}>{item.subtitle}</Text>
                              </View>
                            </View>
                            <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                              {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}
              <View style={{ height: 120 }} />
            </ScrollView>
          )}

          {selected.length > 0 && (
            <View style={styles.modalFooter}>
              <Pressable style={styles.addBtn} onPress={handleAddFavourites}>
                <Heart size={16} color="#fff" fill="#fff" />
                <Text style={styles.addBtnText}>
                  Add {selected.length} to Favourites
                </Text>
              </Pressable>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.5,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: Colors.mutedForeground,
    letterSpacing: 1.8,
  },
  countBadge: {
    backgroundColor: Colors.primary + "18",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 16,
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  favouritesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  favouriteItem: {
    alignItems: "center",
    gap: 6,
    width: 72,
  },
  favouriteAvatarWrap: {
    position: "relative",
  },
  favouriteAvatar: {
    width: 64,
    height: 64,
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: Colors.primary,
  },
  heartBadge: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.background,
  },
  favouriteName: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.foreground,
    textAlign: "center",
  },
  addCircle: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: Colors.secondary,
    borderWidth: 2,
    borderColor: Colors.primary + "30",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  addLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: Colors.mutedForeground,
    textAlign: "center",
  },
  listContainer: {
    gap: 10,
  },
  listCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.border + "60",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  listLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  listAvatar: {
    width: 52,
    height: 52,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Colors.primary + "20",
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.foreground,
    marginBottom: 4,
  },
  listMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  prayerCount: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.mutedForeground + "60",
  },
  frequency: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: Colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actionBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  msgBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  prayBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSafe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: Colors.foreground,
    letterSpacing: -0.3,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.foreground,
    fontWeight: "500" as const,
  },
  modalList: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: Colors.mutedForeground,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  groupCard: {
    backgroundColor: Colors.primary + "0D",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary + "1A",
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: Colors.primary + "0D",
    marginHorizontal: 16,
  },
  otherList: {
    gap: 8,
  },
  otherCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border + "80",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
  },
  contactAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.card,
  },
  contactInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contactName: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.foreground,
  },
  onAppBadge: {
    backgroundColor: Colors.primary + "1A",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  onAppBadgeText: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: Colors.primary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  offAppBadge: {
    backgroundColor: Colors.muted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  offAppBadgeText: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: Colors.mutedForeground,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sourceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  initialsAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.secondaryForeground,
  },
  contactSubtitle: {
    fontSize: 12,
    color: Colors.mutedForeground,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.secondary,
  },
  checkCircleSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingBottom: 80,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.mutedForeground,
    fontWeight: "600" as const,
  },
  modalFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 36,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#fff",
  },
});
