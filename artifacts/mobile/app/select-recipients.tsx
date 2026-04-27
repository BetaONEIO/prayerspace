import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  ScrollView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import {
  ArrowLeft,
  Search,
  Check,
  ArrowRight,
  X,
  Users,
  Star,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { ThemeColors } from "@/constants/colors";
import { useThemeColors } from "@/providers/ThemeProvider";
import {
  useSelectedRecipients,
  ALL_RECIPIENTS,
  type Recipient,
} from "@/providers/SelectedRecipientsProvider";

type MainTab = "contacts" | "communities";
type FilterTab = "all" | "on_app" | "not_on_app" | "whatsapp" | "sim";

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "on_app", label: "On Prayer Space" },
  { key: "not_on_app", label: "Not on App" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "sim", label: "SIM" },
];

const COMMUNITIES = [
  {
    id: "c1",
    name: "Morning Prayer Circle",
    members: 24,
    avatar: "https://randomuser.me/api/portraits/men/45.jpg",
  },
  {
    id: "c2",
    name: "Family Group",
    members: 8,
    avatar: "https://randomuser.me/api/portraits/women/68.jpg",
  },
  {
    id: "c3",
    name: "Church Friends",
    members: 47,
    avatar: "https://randomuser.me/api/portraits/men/15.jpg",
  },
  {
    id: "c4",
    name: "Bible Study",
    members: 12,
    avatar: "https://randomuser.me/api/portraits/women/29.jpg",
  },
];

const FREQUENTLY_USED_IDS = ["r1", "r2", "r3"];

const getSourceColors = (colors: ThemeColors): Record<string, string> => ({
  whatsapp: "#25D366",
  sim: "#3B82F6",
  app: colors.primary,
});

export default function SelectRecipientsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const SOURCE_COLORS = getSourceColors(colors);
  const router = useRouter();
  const { selectedIds, toggleRecipient, clearAll } = useSelectedRecipients();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [mainTab, setMainTab] = useState<MainTab>("contacts");
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);

  const frequentlyUsed = useMemo(
    () => ALL_RECIPIENTS.filter((r) => FREQUENTLY_USED_IDS.includes(r.id)),
    []
  );

  const filtered = useMemo(() => {
    return ALL_RECIPIENTS.filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "on_app" && r.onApp) ||
        (activeFilter === "not_on_app" && !r.onApp) ||
        (activeFilter === "whatsapp" && r.source === "whatsapp") ||
        (activeFilter === "sim" && r.source === "sim");
      return matchesSearch && matchesFilter;
    });
  }, [search, activeFilter]);

  const onAppContacts = filtered.filter((r) => r.onApp);
  const otherContacts = filtered.filter((r) => !r.onApp);

  const totalSelected = selectedIds.length + selectedCommunities.length;

  const handleContinue = useCallback(() => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.back();
  }, [router]);

  const handleToggle = useCallback(
    (id: string) => {
      if (Platform.OS !== "web") void Haptics.selectionAsync();
      toggleRecipient(id);
    },
    [toggleRecipient]
  );

  const handleCommunityToggle = useCallback((id: string) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setSelectedCommunities((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }, []);

  const handleClearAll = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    clearAll();
    setSelectedCommunities([]);
  }, [clearAll]);

  const renderRecipient = (item: Recipient, inGroup?: boolean) => {
    const isSelected = selectedIds.includes(item.id);
    return (
      <Pressable
        key={item.id}
        style={[styles.contactRow, inGroup && styles.contactRowInGroup]}
        onPress={() => handleToggle(item.id)}
      >
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.initialsAvatar}>
            <Text style={styles.initialsText}>{item.initials}</Text>
          </View>
        )}
        <View style={styles.contactInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.contactName}>{item.name}</Text>
            {item.onApp ? (
              <View style={styles.onAppBadge}>
                <Text style={styles.onAppBadgeText}>On App</Text>
              </View>
            ) : (
              <View style={styles.offAppBadge}>
                <Text style={styles.offAppBadgeText}>Not on app</Text>
              </View>
            )}
          </View>
          <View style={styles.subtitleRow}>
            {!item.onApp && (
              <View
                style={[
                  styles.sourceDot,
                  { backgroundColor: SOURCE_COLORS[item.source] },
                ]}
              />
            )}
            <Text style={styles.contactSubtitle}>{item.subtitle}</Text>
          </View>
        </View>
        <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
          {isSelected && <Check size={12} color={colors.primaryForeground} strokeWidth={3} />}
        </View>
      </Pressable>
    );
  };

  const renderContactsTab = () => (
    <View style={styles.listContent}>
      {frequentlyUsed.length > 0 && (
        <>
          <View style={styles.sectionLabelRow}>
            <Star size={12} color={colors.primary} fill={colors.primary} />
            <Text style={styles.sectionLabel}>Frequently Used</Text>
          </View>
          <View style={styles.groupCard}>
            {frequentlyUsed.map((item, index) => (
              <View key={item.id}>
                {index > 0 && <View style={styles.divider} />}
                {renderRecipient(item, true)}
              </View>
            ))}
          </View>
        </>
      )}

      {onAppContacts.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>On Prayer Space</Text>
          <View style={styles.groupCard}>
            {onAppContacts.map((item, index) => (
              <View key={item.id}>
                {index > 0 && <View style={styles.divider} />}
                {renderRecipient(item, true)}
              </View>
            ))}
          </View>
        </>
      )}

      {otherContacts.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Other Contacts</Text>
          <View style={styles.otherList}>
            {otherContacts.map((item) => (
              <View key={item.id} style={styles.otherCard}>
                {renderRecipient(item)}
              </View>
            ))}
          </View>
        </>
      )}

      {filtered.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No contacts found</Text>
        </View>
      )}
    </View>
  );

  const renderCommunitiesTab = () => (
    <View style={styles.listContent}>
      <Text style={styles.sectionLabel}>Your Communities</Text>
      <View style={styles.groupCard}>
        {COMMUNITIES.map((community, index) => {
          const isSelected = selectedCommunities.includes(community.id);
          return (
            <View key={community.id}>
              {index > 0 && <View style={styles.divider} />}
              <Pressable
                style={styles.contactRow}
                onPress={() => handleCommunityToggle(community.id)}
              >
                <Image source={{ uri: community.avatar }} style={styles.avatar} />
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{community.name}</Text>
                  <View style={styles.subtitleRow}>
                    <Users size={11} color={colors.mutedForeground} />
                    <Text style={styles.contactSubtitle}>
                      {community.members} members
                    </Text>
                  </View>
                </View>
                <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                  {isSelected && <Check size={12} color={colors.primaryForeground} strokeWidth={3} />}
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={colors.secondaryForeground} />
        </Pressable>
        <Text style={styles.headerTitle}>Send to</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.mainTabRow}>
        <Pressable
          style={[styles.mainTabBtn, mainTab === "contacts" && styles.mainTabBtnActive]}
          onPress={() => setMainTab("contacts")}
        >
          <Text style={[styles.mainTabLabel, mainTab === "contacts" && styles.mainTabLabelActive]}>
            Contacts
          </Text>
        </Pressable>
        <Pressable
          style={[styles.mainTabBtn, mainTab === "communities" && styles.mainTabBtnActive]}
          onPress={() => setMainTab("communities")}
        >
          <Text style={[styles.mainTabLabel, mainTab === "communities" && styles.mainTabLabelActive]}>
            Communities
          </Text>
        </Pressable>
      </View>

      {mainTab === "contacts" && (
        <View style={styles.subheader}>
          <View style={styles.searchWrap}>
            <Search size={18} color={colors.mutedForeground} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or number..."
              placeholderTextColor={colors.mutedForeground + "99"}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <X size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTER_TABS.map((tab) => (
              <Pressable
                key={tab.key}
                style={[styles.filterChip, activeFilter === tab.key && styles.filterChipActive]}
                onPress={() => {
                  if (Platform.OS !== "web") void Haptics.selectionAsync();
                  setActiveFilter(tab.key);
                }}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === tab.key && styles.filterChipTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          mainTab === "contacts" ? renderContactsTab() : renderCommunitiesTab()
        }
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footer}>
        <View style={styles.footerTop}>
          <Text style={styles.selectedCount}>
            {totalSelected} {totalSelected === 1 ? "selected" : "selected"}
          </Text>
          {totalSelected > 0 && (
            <Pressable onPress={handleClearAll}>
              <Text style={styles.clearAll}>Clear all</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          style={[styles.continueBtn, totalSelected === 0 && styles.continueBtnDisabled]}
          onPress={handleContinue}
          disabled={totalSelected === 0}
        >
          <Text style={styles.continueBtnText}>Continue</Text>
          <ArrowRight size={20} color={colors.primaryForeground} />
        </Pressable>
      </View>
    </SafeAreaView>
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: {
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
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: colors.foreground,
  },
  mainTabRow: {
    flexDirection: "row",
    marginHorizontal: 24,
    marginBottom: 4,
    backgroundColor: colors.secondary + "80",
    borderRadius: 16,
    padding: 4,
  },
  mainTabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  mainTabBtnActive: {
    backgroundColor: colors.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  mainTabLabel: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.mutedForeground,
  },
  mainTabLabelActive: {
    color: colors.primary,
  },
  subheader: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
    backgroundColor: colors.background,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.secondary + "80",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
    padding: 0,
  },
  filterRow: {
    gap: 8,
    paddingRight: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: "transparent",
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.secondaryForeground,
  },
  filterChipTextActive: {
    color: colors.primaryForeground,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "800" as const,
    color: colors.mutedForeground,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  groupCard: {
    backgroundColor: colors.primary + "0D",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.primary + "1A",
    overflow: "hidden",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  contactRowInGroup: {
    paddingHorizontal: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.primary + "0D",
    marginHorizontal: 16,
  },
  otherList: { gap: 8 },
  otherCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border + "80",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.card,
  },
  initialsAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
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
  contactSubtitle: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: colors.mutedForeground,
  },
  footer: {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 16,
    backgroundColor: colors.background + "F5",
    borderTopWidth: 1,
    borderTopColor: colors.border + "80",
    gap: 12,
  },
  footerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedCount: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.foreground,
  },
  clearAll: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  continueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.primary,
    paddingVertical: 18,
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  continueBtnDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.primaryForeground,
  },
});
