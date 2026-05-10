import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { AutoScrollView } from "@/components/AutoScrollView";
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
  BookUser,
} from "lucide-react-native";
import * as Contacts from "expo-contacts";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";
import { type Contact } from "@/mocks/data";
import { useFavourites } from "@/providers/FavouritesProvider";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

interface DeviceContact {
  id: string;
  name: string;
  initials: string;
  avatar?: string;
  subtitle: string;
  onApp: boolean;
  supabaseId?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

export default function TopHeartsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const { favourites, frequentlyPrayedFor, addFavourites, removeFavourite } = useFavourites();

  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const [contacts, setContacts] = useState<DeviceContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactsPermission, setContactsPermission] = useState<
    "granted" | "denied" | "undetermined" | null
  >(null);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const loadedOnce = useRef(false);

  useEffect(() => {
    if (Platform.OS === "web") { setContactsPermission("denied"); return; }
    Contacts.getPermissionsAsync()
      .then((r) => setContactsPermission(r.status as "granted" | "denied" | "undetermined"))
      .catch(() => setContactsPermission("denied"));
  }, []);

  const loadContacts = useCallback(async () => {
    if (Platform.OS === "web" || contactsPermission !== "granted") return;
    setLoadingContacts(true);
    try {
      const { data: rawContacts } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });

      const emailMap = new Map<string, string>();
      const emails: string[] = [];
      for (const c of rawContacts) {
        if (!c.name) continue;
        const email = c.emails?.[0]?.email?.toLowerCase();
        if (email && !emailMap.has(email)) {
          emailMap.set(email, c.id ?? email);
          emails.push(email);
        }
      }

      const emailToProfile = new Map<string, { id: string; avatar_url: string | null }>();
      if (emails.length > 0) {
        try {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, avatar_url, email")
            .in("email", emails)
            .neq("id", user?.id ?? "");
          if (profiles) {
            for (const p of profiles as { id: string; avatar_url: string | null; email: string }[]) {
              emailToProfile.set(p.email.toLowerCase(), { id: p.id, avatar_url: p.avatar_url });
            }
          }
        } catch { }
      }

      const list: DeviceContact[] = [];
      const seenKeys = new Set<string>();
      const seenPhones = new Set<string>();

      for (const c of rawContacts) {
        if (!c.name) continue;
        const email = c.emails?.[0]?.email?.toLowerCase();
        const phones = (c.phoneNumbers ?? [])
          .map((pn) => pn.number)
          .filter((n): n is string => !!n && n.trim().length > 0);
        const firstNormalized = phones[0] ? phones[0].replace(/\D/g, "") : null;
        const key = email ?? (firstNormalized ? `p:${firstNormalized}` : `n:${c.name}`);

        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        if (firstNormalized) {
          if (seenPhones.has(firstNormalized)) continue;
          seenPhones.add(firstNormalized);
        }

        const profile = email ? emailToProfile.get(email) : undefined;
        list.push({
          id: c.id ?? key,
          name: c.name,
          initials: getInitials(c.name),
          avatar: profile?.avatar_url ?? undefined,
          subtitle: profile ? "On Prayer Space" : "Phone Contact",
          onApp: !!profile,
          supabaseId: profile?.id,
        });

        if (list.length >= 200) break;
      }

      list.sort((a, b) => {
        if (a.onApp && !b.onApp) return -1;
        if (!a.onApp && b.onApp) return 1;
        return a.name.localeCompare(b.name);
      });

      setContacts(list);
    } catch (err) {
      console.error("[TopHearts] loadContacts:", err);
    } finally {
      setLoadingContacts(false);
    }
  }, [contactsPermission, user?.id]);

  useEffect(() => {
    if (contactsPermission === "granted" && showAddModal && !loadedOnce.current) {
      loadedOnce.current = true;
      void loadContacts();
    }
  }, [contactsPermission, showAddModal, loadContacts]);

  const handleRequestPermission = useCallback(async () => {
    setRequestingPermission(true);
    try {
      const result = await Contacts.requestPermissionsAsync();
      setContactsPermission(result.status as "granted" | "denied" | "undetermined");
      if (result.status === "granted") {
        loadedOnce.current = false;
        void loadContacts();
      }
    } catch { }
    setRequestingPermission(false);
  }, [loadContacts]);

  const favouriteIds = useMemo(() => new Set(favourites.map((f) => f.id)), [favourites]);

  const filteredContacts = useMemo(
    () =>
      contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) &&
          !favouriteIds.has(c.id)
      ),
    [contacts, search, favouriteIds]
  );

  const onAppContacts = filteredContacts.filter((c) => c.onApp);
  const otherContacts = filteredContacts.filter((c) => !c.onApp);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const handleAddFavourites = useCallback(() => {
    const toAdd: Contact[] = contacts
      .filter((c) => selected.includes(c.id))
      .map((c) => ({ id: c.id, name: c.name, avatar: c.avatar ?? "" }));
    addFavourites(toAdd);
    setSelected([]);
    setSearch("");
    setShowAddModal(false);
  }, [contacts, selected, addFavourites]);

  const handleCloseModal = useCallback(() => {
    setShowAddModal(false);
    setSelected([]);
    setSearch("");
  }, []);

  const handleRemoveFavourite = useCallback((id: string) => {
    removeFavourite(id);
  }, [removeFavourite]);

  const renderInitialsAvatar = (initials: string, size = 48) => (
    <View style={[styles.initialsAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.initialsText}>{initials}</Text>
    </View>
  );

  const renderContactAvatar = (c: DeviceContact, size = 48) =>
    c.avatar ? (
      <Image source={{ uri: c.avatar }} style={[styles.contactAvatar, { width: size, height: size, borderRadius: size / 2 }]} />
    ) : (
      renderInitialsAvatar(c.initials, size)
    );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={colors.secondaryForeground} />
          </Pressable>
          <Text style={styles.headerTitle}>Favourites</Text>
          <Pressable style={styles.searchBtn} onPress={() => setShowAddModal(true)}>
            <Search size={18} color={colors.primary} />
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
                <Star size={15} color={colors.primary} fill={colors.primary} />
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
                    {contact.avatar ? (
                      <Image source={{ uri: contact.avatar }} style={styles.favouriteAvatar} />
                    ) : (
                      <View style={[styles.favouriteAvatar, styles.favouriteInitialsBg]}>
                        <Text style={styles.favouriteInitialsText}>
                          {getInitials(contact.name)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.heartBadge}>
                      <Heart size={8} color="#fff" fill="#fff" />
                    </View>
                  </View>
                  <Text style={styles.favouriteName} numberOfLines={1}>
                    {contact.name}
                  </Text>
                </Pressable>
              ))}
              <Pressable style={styles.favouriteItem} onPress={() => setShowAddModal(true)}>
                <View style={styles.addCircle}>
                  <Plus size={26} color={colors.primary + "80"} />
                </View>
                <Text style={styles.addLabel}>Add</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionLabelRow}>
              <History size={15} color={colors.primary} />
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
                    <Image source={{ uri: item.avatar }} style={styles.listAvatar} />
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
                    <Pressable style={styles.msgBtn} onPress={() => router.push("/(tabs)/(home)")}>
                      <MessageCircle size={17} color={colors.primary} />
                    </Pressable>
                    <Pressable style={styles.prayBtn} onPress={() => router.push("/(tabs)/pray")}>
                      <HandHeart size={18} color={colors.primary} />
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
          onRequestClose={handleCloseModal}
        >
          <SafeAreaView style={styles.modalSafe} edges={["top"]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Favourites</Text>
              <Pressable style={styles.modalClose} onPress={handleCloseModal}>
                <X size={20} color={colors.secondaryForeground} />
              </Pressable>
            </View>

            {contactsPermission !== "granted" ? (
              <View style={styles.permissionState}>
                <View style={styles.permissionIconWrap}>
                  <BookUser size={36} color={colors.primary} />
                </View>
                <Text style={styles.permissionTitle}>Access your contacts</Text>
                <Text style={styles.permissionSubtitle}>
                  Allow Prayer Space to read your contacts so you can add friends and family as favourites — including those not yet on the app.
                </Text>
                <Pressable
                  style={[styles.grantBtn, requestingPermission && styles.grantBtnDisabled]}
                  onPress={handleRequestPermission}
                  disabled={requestingPermission}
                >
                  {requestingPermission ? (
                    <ActivityIndicator color={colors.primaryForeground} size="small" />
                  ) : (
                    <Text style={styles.grantBtnText}>Allow Access</Text>
                  )}
                </Pressable>
                {contactsPermission === "denied" && (
                  <Text style={styles.permissionHint}>
                    If access was denied, enable Contacts in your device Settings for Prayer Space.
                  </Text>
                )}
              </View>
            ) : (
              <>
                <View style={styles.searchBar}>
                  <Search size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search contacts..."
                    placeholderTextColor={colors.mutedForeground}
                    value={search}
                    onChangeText={setSearch}
                    autoFocus={false}
                  />
                  {search.length > 0 && (
                    <Pressable onPress={() => setSearch("")}>
                      <X size={16} color={colors.mutedForeground} />
                    </Pressable>
                  )}
                </View>

                {loadingContacts ? (
                  <View style={styles.loadingState}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading contacts…</Text>
                  </View>
                ) : filteredContacts.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Users size={40} color={colors.border} />
                    <Text style={styles.emptyText}>
                      {search ? "No contacts found" : contacts.length === 0 ? "No contacts available" : "All contacts already added"}
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.modalList}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    {onAppContacts.length > 0 && (
                      <>
                        <Text style={styles.groupLabel}>On Prayer Space</Text>
                        <View style={styles.groupCard}>
                          {onAppContacts.map((item, index) => {
                            const isSelected = selected.includes(item.id);
                            return (
                              <View key={item.id}>
                                {index > 0 && <View style={styles.divider} />}
                                <Pressable style={styles.contactRow} onPress={() => toggleSelect(item.id)}>
                                  {renderContactAvatar(item)}
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
                        <Text style={[styles.groupLabel, { marginTop: onAppContacts.length > 0 ? 20 : 0 }]}>
                          Other Contacts
                        </Text>
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
                                  {renderContactAvatar(item)}
                                  <View style={styles.contactInfo}>
                                    <View style={styles.nameRow}>
                                      <Text style={styles.contactName}>{item.name}</Text>
                                      <View style={styles.offAppBadge}>
                                        <Text style={styles.offAppBadgeText}>Not on app</Text>
                                      </View>
                                    </View>
                                    <Text style={styles.contactSubtitle}>{item.subtitle}</Text>
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
              </>
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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
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
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "800" as const,
      color: colors.foreground,
      letterSpacing: -0.5,
    },
    searchBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    container: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 4 },
    section: { marginBottom: 32 },
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
      color: colors.mutedForeground,
      letterSpacing: 1.8,
    },
    countBadge: {
      backgroundColor: colors.primary + "18",
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 999,
      marginBottom: 16,
    },
    countBadgeText: {
      fontSize: 10,
      fontWeight: "700" as const,
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    favouritesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
    favouriteItem: { alignItems: "center", gap: 6, width: 72 },
    favouriteAvatarWrap: { position: "relative" },
    favouriteAvatar: {
      width: 64,
      height: 64,
      borderRadius: 22,
      borderWidth: 2.5,
      borderColor: colors.primary,
    },
    favouriteInitialsBg: {
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    favouriteInitialsText: {
      fontSize: 22,
      fontWeight: "700" as const,
      color: colors.secondaryForeground,
    },
    heartBadge: {
      position: "absolute",
      bottom: -3,
      right: -3,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.background,
    },
    favouriteName: {
      fontSize: 12,
      fontWeight: "700" as const,
      color: colors.foreground,
      textAlign: "center",
    },
    addCircle: {
      width: 64,
      height: 64,
      borderRadius: 22,
      backgroundColor: colors.secondary,
      borderWidth: 2,
      borderColor: colors.primary + "30",
      borderStyle: "dashed",
      alignItems: "center",
      justifyContent: "center",
    },
    addLabel: {
      fontSize: 12,
      fontWeight: "700" as const,
      color: colors.mutedForeground,
      textAlign: "center",
    },
    listContainer: { gap: 10 },
    listCard: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: colors.border + "60",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 16,
      elevation: 2,
    },
    listLeft: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1 },
    listAvatar: {
      width: 52,
      height: 52,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: colors.primary + "20",
    },
    listInfo: { flex: 1 },
    listName: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: colors.foreground,
      marginBottom: 4,
    },
    listMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
    prayerCount: {
      fontSize: 10,
      fontWeight: "800" as const,
      color: colors.primary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    dot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: colors.mutedForeground + "60",
    },
    frequency: {
      fontSize: 10,
      fontWeight: "600" as const,
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    actionBtns: { flexDirection: "row", alignItems: "center", gap: 8 },
    msgBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    prayBtn: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    modalSafe: { flex: 1, backgroundColor: colors.background },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "800" as const,
      color: colors.foreground,
      letterSpacing: -0.3,
    },
    modalClose: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.card,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 12,
      margin: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.foreground,
      fontWeight: "500" as const,
    },
    permissionState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      paddingBottom: 60,
    },
    permissionIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 28,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    permissionTitle: {
      fontSize: 22,
      fontWeight: "800" as const,
      color: colors.foreground,
      letterSpacing: -0.4,
      marginBottom: 12,
      textAlign: "center",
    },
    permissionSubtitle: {
      fontSize: 14,
      color: colors.mutedForeground,
      lineHeight: 22,
      textAlign: "center",
      marginBottom: 28,
    },
    grantBtn: {
      height: 54,
      backgroundColor: colors.primary,
      borderRadius: 18,
      paddingHorizontal: 32,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
    grantBtnDisabled: { opacity: 0.65 },
    grantBtnText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.primaryForeground,
    },
    permissionHint: {
      fontSize: 12,
      color: colors.mutedForeground,
      textAlign: "center",
      marginTop: 16,
      lineHeight: 18,
    },
    loadingState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      paddingBottom: 60,
    },
    loadingText: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontWeight: "500" as const,
    },
    emptyState: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      paddingBottom: 60,
    },
    emptyText: {
      fontSize: 15,
      color: colors.mutedForeground,
      fontWeight: "500" as const,
    },
    modalList: { paddingHorizontal: 16, paddingBottom: 120, gap: 8 },
    groupLabel: {
      fontSize: 10,
      fontWeight: "800" as const,
      color: colors.mutedForeground,
      letterSpacing: 1.5,
      textTransform: "uppercase" as const,
      marginBottom: 10,
      paddingHorizontal: 4,
    },
    groupCard: {
      backgroundColor: colors.primary + "0D",
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary + "1A",
      overflow: "hidden",
    },
    divider: {
      height: 1,
      backgroundColor: colors.primary + "0D",
      marginHorizontal: 16,
    },
    otherList: { gap: 8 },
    otherCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border + "80",
    },
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 14,
    },
    contactAvatar: {
      borderWidth: 2,
      borderColor: colors.card,
    },
    initialsAvatar: {
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    initialsText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: colors.secondaryForeground,
    },
    contactInfo: { flex: 1, gap: 4 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    contactName: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: colors.foreground,
    },
    onAppBadge: {
      backgroundColor: colors.primary + "1A",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    onAppBadgeText: {
      fontSize: 9,
      fontWeight: "700" as const,
      color: colors.primary,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
    },
    offAppBadge: {
      backgroundColor: colors.muted,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    offAppBadgeText: {
      fontSize: 9,
      fontWeight: "700" as const,
      color: colors.mutedForeground,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
    },
    contactSubtitle: { fontSize: 12, color: colors.mutedForeground },
    checkCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    checkCircleSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    modalFooter: {
      padding: 16,
      paddingBottom: Platform.OS === "ios" ? 8 : 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    addBtn: {
      height: 56,
      backgroundColor: colors.primary,
      borderRadius: 18,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
    addBtnText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: "#fff",
    },
  });
