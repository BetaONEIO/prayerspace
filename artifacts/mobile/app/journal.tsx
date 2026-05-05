import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Animated,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { AutoScrollView } from '@/components/AutoScrollView';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import {
  PenSquare,
  Heart,
  CheckCircle,
  ArrowLeft,
  Menu,
  HandHeart,
  Plus,
  Minus,
  X,
  Search,
  Check,
  UserPlus,
  Users,
  Sparkles,
  ChevronRight,
  ArrowRight,
  CalendarDays,
} from "lucide-react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useThemeColors } from "@/providers/ThemeProvider";
import { ThemeColors } from "@/constants/colors";
import NavigationDrawer from "@/components/NavigationDrawer";
import { usePrayer } from "@/providers/PrayerProvider";
import type { JournalEntry, YourPerson } from "@/providers/PrayerProvider";
import { stripMarkdown } from "@/components/FormattedText";
import { formatPrayerDateFeed, daysUntil } from "@/lib/prayerDateUtils";
import { shouldShowReminderBadge } from "@/lib/prayerReminders";
import { ALL_RECIPIENTS } from "@/providers/SelectedRecipientsProvider";

const FILTERS = ["My Prayers", "Your People", "Prayer Requests"] as const;

type JournalFilter = (typeof FILTERS)[number];

function getTagConfig(colors: ThemeColors): Record<string, { label: string; color: string; bg: string }> {
  return {
    gratitude: { label: "GRATITUDE", color: colors.primary, bg: colors.primary + "18" },
    petition: { label: "PETITION", color: colors.accentForeground, bg: colors.accent },
    reflection: { label: "REFLECTIONS", color: colors.primary, bg: colors.primary + "18" },
    praying_for: { label: "PRAYING FOR", color: "#D4782F", bg: "#D4782F18" },
  };
}

function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const MOCK_ENTRIES: JournalEntry[] = [];

function formatDateGroup(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const formatted = date.toLocaleDateString("en-US", options);
  if (diffDays === 0) return `Today, ${formatted}`;
  if (diffDays === 1) return `Yesterday, ${formatted}`;
  return formatted;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface AddPersonModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (people: Array<Omit<YourPerson, "id">>) => void;
  existingPeople: YourPerson[];
}

function AddPersonModal({ visible, onClose, onAdd, existingPeople }: AddPersonModalProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const addStyles = useMemo(() => createAddStyles(colors), [colors]);
  const [search, setSearch] = useState<string>("");
  const [customName, setCustomName] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"search" | "custom">("search");
  const [prayerFocuses, setPrayerFocuses] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"select" | "focus">("select");

  const filteredRecipients = useMemo(() =>
    ALL_RECIPIENTS.filter(
      (r) =>
        r.name.toLowerCase().includes(search.toLowerCase()) &&
        !existingPeople.find((p) => p.name.toLowerCase() === r.name.toLowerCase())
    ),
    [search, existingPeople]
  );

  const selectedContacts = useMemo(() =>
    ALL_RECIPIENTS.filter((r) => selectedIds.has(r.id)),
    [selectedIds]
  );

  const handleClose = useCallback(() => {
    setSearch("");
    setCustomName("");
    setSelectedIds(new Set());
    setMode("search");
    setPrayerFocuses({});
    setStep("select");
    onClose();
  }, [onClose]);

  const canNext = mode === "custom" ? customName.trim().length > 0 : selectedIds.size > 0;

  const handleNext = useCallback(() => {
    if (!canNext) return;
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("focus");
  }, [canNext]);

  const handleConfirm = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (mode === "custom") {
      if (!customName.trim()) return;
      onAdd([{ name: customName.trim(), avatar: undefined, prayerFocus: prayerFocuses["__custom__"]?.trim() || undefined }]);
      handleClose();
      return;
    }
    if (step === "select") {
      if (selectedIds.size === 0) return;
      setStep("focus");
      return;
    }
    const people = selectedContacts.map((r) => ({
      name: r.name,
      avatar: r.avatar,
      prayerFocus: prayerFocuses[r.id]?.trim() || undefined,
    }));
    onAdd(people);
    handleClose();
  }, [mode, customName, selectedContacts, prayerFocuses, onAdd, handleClose, step, selectedIds.size]);

  const toggleSelect = useCallback((id: string) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selCount = mode === "search" ? selectedIds.size : (customName.trim() ? 1 : 0);
  const btnLabel = step === "focus" ? "Add to Your People" : selCount > 1 ? `Next (${selCount} selected)` : "Next";

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={addStyles.safe} edges={["top"]}>
        <View style={addStyles.header}>
          {step === "focus" ? (
            <Pressable style={addStyles.backBtn} onPress={() => setStep("select")}>
              <ArrowRight size={18} color={colors.secondaryForeground} style={{ transform: [{ rotate: "180deg" }] }} />
            </Pressable>
          ) : (
            <View style={{ width: 34 }} />
          )}
          <Text style={addStyles.title}>
            {step === "focus" ? "Prayer Focus" : "Add to Your People"}
          </Text>
          <Pressable style={addStyles.closeBtn} onPress={handleClose}>
            <X size={18} color={colors.secondaryForeground} />
          </Pressable>
        </View>

        {step === "select" ? (
          <>
            <View style={addStyles.modeTabs}>
              <Pressable
                style={[addStyles.modeTab, mode === "search" && addStyles.modeTabActive]}
                onPress={() => setMode("search")}
              >
                <Text style={[addStyles.modeTabText, mode === "search" && addStyles.modeTabTextActive]}>From Contacts</Text>
              </Pressable>
              <Pressable
                style={[addStyles.modeTab, mode === "custom" && addStyles.modeTabActive]}
                onPress={() => setMode("custom")}
              >
                <Text style={[addStyles.modeTabText, mode === "custom" && addStyles.modeTabTextActive]}>Add by Name</Text>
              </Pressable>
            </View>

            {mode === "search" ? (
              <>
                <View style={addStyles.searchBar}>
                  <Search size={16} color={colors.mutedForeground} />
                  <TextInput
                    style={addStyles.searchInput}
                    placeholder="Search contacts..."
                    placeholderTextColor={colors.mutedForeground}
                    value={search}
                    onChangeText={setSearch}
                    autoFocus
                  />
                </View>
                {filteredRecipients.length === 0 ? (
                  <View style={addStyles.emptyState}>
                    <Users size={36} color={colors.border} />
                    <Text style={addStyles.emptyText}>{search ? "No contacts found" : "All contacts already added"}</Text>
                  </View>
                ) : (
                  <ScrollView contentContainerStyle={addStyles.list} showsVerticalScrollIndicator={false}>
                    {filteredRecipients.map((item) => {
                      const isSelected = selectedIds.has(item.id);
                      return (
                        <Pressable
                          key={item.id}
                          style={[addStyles.contactRow, isSelected && addStyles.contactRowSelected]}
                          onPress={() => toggleSelect(item.id)}
                        >
                          {item.avatar ? (
                            <Image source={{ uri: item.avatar }} style={addStyles.contactAvatar} />
                          ) : (
                            <View style={addStyles.initialsAvatar}>
                              <Text style={addStyles.initialsText}>{item.initials ?? item.name.charAt(0)}</Text>
                            </View>
                          )}
                          <View style={addStyles.contactInfo}>
                            <Text style={addStyles.contactName}>{item.name}</Text>
                            <Text style={addStyles.contactSub}>{item.subtitle}</Text>
                          </View>
                          <View
                            style={[
                              addStyles.checkCircle,
                              isSelected && addStyles.checkCircleActive,
                              isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                            ]}
                          >
                            {isSelected && <Check size={12} color={colors.primaryForeground} strokeWidth={3} />}
                          </View>
                        </Pressable>
                      );
                    })}
                    <View style={{ height: 100 }} />
                  </ScrollView>
                )}
              </>
            ) : (
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ flex: 1 }}
              >
                <View style={addStyles.customWrap}>
                  <Text style={addStyles.customLabel}>Enter a name</Text>
                  <TextInput
                    style={addStyles.customInput}
                    placeholder="e.g. Grandma, Pastor Mike..."
                    placeholderTextColor={colors.mutedForeground}
                    value={customName}
                    onChangeText={setCustomName}
                    autoFocus
                    returnKeyType="next"
                    onSubmitEditing={canNext ? handleNext : undefined}
                  />
                  <Text style={addStyles.customHint}>
                    You can add anyone — family, friends, or people you've committed to pray for.
                  </Text>
                </View>
              </KeyboardAvoidingView>
            )}

            <View style={[addStyles.footer, { paddingBottom: insets.bottom + 16 }]}>
              <Pressable
                style={[addStyles.addBtn, !canNext && addStyles.addBtnDisabled]}
                onPress={handleNext}
                disabled={!canNext}
              >
                <Text style={addStyles.addBtnText}>{btnLabel}</Text>
                <ArrowRight size={18} color="#fff" />
              </Pressable>
            </View>
          </>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={addStyles.focusStep}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={addStyles.focusQuestion}>
                {mode === "custom" || selectedContacts.length === 1
                  ? `Anything specific to pray\nfor ${(mode === "custom" ? customName : selectedContacts[0]?.name ?? "").split(" ")[0]}?`
                  : "Anything specific to pray\nfor each person?"}
              </Text>
              <Text style={addStyles.focusHint}>
                Optional — helps you pray with intention. Only visible to you.
              </Text>

              {mode === "custom" ? (
                <View style={addStyles.focusCard}>
                  <View style={addStyles.focusPersonRow}>
                    <View style={addStyles.focusAvatarFallback}>
                      <Text style={addStyles.focusAvatarInitial}>{customName.trim().charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={addStyles.focusPersonName}>{customName.trim()}</Text>
                  </View>
                  <TextInput
                    style={addStyles.focusTextArea}
                    placeholder="What would you like to pray for?"
                    placeholderTextColor={colors.mutedForeground + "80"}
                    value={prayerFocuses["__custom__"] ?? ""}
                    onChangeText={(t) => setPrayerFocuses((prev) => ({ ...prev, __custom__: t }))}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              ) : (
                selectedContacts.map((r) => (
                  <View key={r.id} style={addStyles.focusCard}>
                    <View style={addStyles.focusPersonRow}>
                      {r.avatar ? (
                        <Image source={{ uri: r.avatar }} style={addStyles.focusAvatar} />
                      ) : (
                        <View style={addStyles.focusAvatarFallback}>
                          <Text style={addStyles.focusAvatarInitial}>{r.initials ?? r.name.charAt(0)}</Text>
                        </View>
                      )}
                      <Text style={addStyles.focusPersonName}>{r.name}</Text>
                    </View>
                    <TextInput
                      style={addStyles.focusTextArea}
                      placeholder="What would you like to pray for?"
                      placeholderTextColor={colors.mutedForeground + "80"}
                      value={prayerFocuses[r.id] ?? ""}
                      onChangeText={(t) => setPrayerFocuses((prev) => ({ ...prev, [r.id]: t }))}
                      multiline
                      textAlignVertical="top"
                    />
                  </View>
                ))
              )}
              <View style={{ height: 120 }} />
            </ScrollView>

            <View style={[addStyles.footer, { paddingBottom: insets.bottom + 16 }]}>
              <Pressable style={addStyles.addBtn} onPress={handleConfirm}>
                <UserPlus size={18} color="#fff" />
                <Text style={addStyles.addBtnText}>Add to Your People</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

interface PrayerSelectionModalProps {
  visible: boolean;
  people: YourPerson[];
  onClose: () => void;
  onBegin: (selectedIds: string[]) => void;
}

function PrayerSelectionModal({ visible, people, onClose, onBegin }: PrayerSelectionModalProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const selStyles = useMemo(() => createSelStyles(colors), [colors]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const slideAnim = useRef(new Animated.Value(500)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setSelectedIds(people.map((p) => p.id));
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 14 }),
      ]).start();
    } else {
      slideAnim.setValue(500);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  const allSelected = selectedIds.length === people.length && people.length > 0;

  const toggleAll = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setSelectedIds(allSelected ? [] : people.map((p) => p.id));
  }, [allSelected, people]);

  const togglePerson = useCallback((id: string) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }, []);

  const handleBegin = useCallback(() => {
    if (selectedIds.length === 0) return;
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onBegin(selectedIds);
  }, [selectedIds, onBegin]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[selStyles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <Animated.View
          style={[
            selStyles.sheet,
            { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom + 20 },
          ]}
        >
          <View style={selStyles.handle} />

          <View style={selStyles.headerRow}>
            <View style={selStyles.headerText}>
              <Text style={selStyles.title}>Who would you like{"\n"}to pray for?</Text>
              <Text style={selStyles.subtitle}>Choose people for your prayer time</Text>
            </View>
            <Pressable style={selStyles.closeBtn} onPress={onClose}>
              <X size={16} color={colors.secondaryForeground} />
            </Pressable>
          </View>

          <Pressable style={selStyles.selectAllRow} onPress={toggleAll}>
            <View style={[selStyles.selectAllCheck, allSelected && selStyles.selectAllCheckActive]}>
              {allSelected && <Check size={10} color="#fff" strokeWidth={3} />}
            </View>
            <Text style={selStyles.selectAllText}>
              {allSelected ? "Deselect all" : `Select all · ${people.length} people`}
            </Text>
          </Pressable>

          <ScrollView
            style={selStyles.personsList}
            contentContainerStyle={{ gap: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {people.map((person) => {
              const isSelected = selectedIds.includes(person.id);
              return (
                <Pressable
                  key={person.id}
                  style={[selStyles.personRow, isSelected && selStyles.personRowSelected]}
                  onPress={() => togglePerson(person.id)}
                >
                  {person.avatar ? (
                    <Image source={{ uri: person.avatar }} style={selStyles.selAvatar} />
                  ) : (
                    <View style={selStyles.selAvatarFallback}>
                      <Text style={selStyles.selAvatarInitial}>{person.name.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={selStyles.personInfo}>
                    <Text style={selStyles.personName}>{person.name}</Text>
                    {person.prayerFocus ? (
                      <Text style={selStyles.personFocus} numberOfLines={1}>{person.prayerFocus}</Text>
                    ) : null}
                  </View>
                  <View style={[selStyles.checkbox, isSelected && selStyles.checkboxActive]}>
                    {isSelected && <Check size={11} color="#fff" strokeWidth={3} />}
                  </View>
                </Pressable>
              );
            })}
            <View style={{ height: 8 }} />
          </ScrollView>

          <Pressable
            style={[selStyles.beginBtn, selectedIds.length === 0 && selStyles.beginBtnDisabled]}
            onPress={handleBegin}
          >
            <Text style={selStyles.beginBtnText}>Begin Prayer Time</Text>
            {selectedIds.length > 0 && (
              <View style={selStyles.countPill}>
                <Text style={selStyles.countPillText}>{selectedIds.length}</Text>
              </View>
            )}
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const createSelStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(28,25,20,0.52)",
    justifyContent: "flex-end" as const,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 12,
    maxHeight: "82%" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 20,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center" as const,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    justifyContent: "space-between" as const,
    marginBottom: 20,
  },
  headerText: { flex: 1 },
  title: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: colors.foreground,
    letterSpacing: -0.5,
    marginBottom: 6,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    fontWeight: "500" as const,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.secondary,
    alignItems: "center" as const, justifyContent: "center" as const,
    marginTop: 4,
  },
  selectAllRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingVertical: 10,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "60",
  },
  selectAllCheck: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: "center" as const, justifyContent: "center" as const,
    backgroundColor: colors.secondary,
  },
  selectAllCheckActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.secondaryForeground,
  },
  personsList: {
    flex: 1,
    marginBottom: 16,
  },
  personRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border + "60",
  },
  personRowSelected: {
    borderColor: colors.primary + "50",
    backgroundColor: colors.primary + "07",
  },
  selAvatar: { width: 46, height: 46, borderRadius: 14 },
  selAvatarFallback: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: colors.primary + "18",
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  selAvatarInitial: { fontSize: 18, fontWeight: "700" as const, color: colors.primary },
  personInfo: { flex: 1, gap: 3 },
  personName: { fontSize: 15, fontWeight: "700" as const, color: colors.foreground },
  personFocus: { fontSize: 12, color: colors.mutedForeground, fontStyle: "italic" as const },
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: "center" as const, justifyContent: "center" as const,
    backgroundColor: colors.secondary,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  beginBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 18,
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  beginBtnDisabled: {
    backgroundColor: colors.muted,
    shadowOpacity: 0,
    elevation: 0,
  },
  beginBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#fff",
    letterSpacing: 0.2,
  },
  countPill: {
    backgroundColor: "rgba(255,255,255,0.25)",
    width: 26, height: 26, borderRadius: 13,
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  countPillText: { fontSize: 13, fontWeight: "700" as const, color: "#fff" },
});

interface ActivePrayerModalProps {
  visible: boolean;
  people: YourPerson[];
  selectedIds: string[];
  onEnd: () => void;
}

function ActivePrayerModal({ visible, people, selectedIds, onEnd }: ActivePrayerModalProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const activeStyles = useMemo(() => createActiveStyles(colors), [colors]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const breatheLoop = useRef<Animated.CompositeAnimation | null>(null);

  const selectedPeople = useMemo(
    () => people.filter((p) => selectedIds.includes(p.id)),
    [people, selectedIds]
  );

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }).start();
      breatheLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(breatheAnim, { toValue: 1.2, duration: 3500, useNativeDriver: true }),
          Animated.timing(breatheAnim, { toValue: 0.85, duration: 3500, useNativeDriver: true }),
        ])
      );
      breatheLoop.current.start();
    } else {
      breatheLoop.current?.stop();
      fadeAnim.setValue(0);
      breatheAnim.setValue(1);
    }
    return () => {
      breatheLoop.current?.stop();
    };
  }, [visible]);

  const handleEnd = useCallback(() => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    breatheLoop.current?.stop();
    Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => onEnd());
  }, [onEnd, fadeAnim]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleEnd} statusBarTranslucent>
      <Animated.View style={[activeStyles.container, { opacity: fadeAnim }]}>
        <View style={activeStyles.warmBg} />
        <View style={activeStyles.topGlow} />

        <View style={[activeStyles.safeTop, { paddingTop: insets.top + 10 }]}>
          <View style={activeStyles.headerRow}>
            <Text style={activeStyles.inPrayerLabel}>IN PRAYER</Text>
            <Pressable style={activeStyles.endHeaderBtn} onPress={handleEnd}>
              <X size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        <View style={activeStyles.orbSection}>
          <Animated.View style={[activeStyles.orb, { transform: [{ scale: breatheAnim }] }]} />
          <Text style={activeStyles.inviteText}>Take a quiet moment</Text>
          <Text style={activeStyles.inviteSub}>
            Bring each person before God{"\n"}in your own words
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={activeStyles.peopleList}
          showsVerticalScrollIndicator={false}
          style={activeStyles.scroll}
        >
          {selectedPeople.map((person) => (
            <View key={person.id} style={activeStyles.personRow}>
              {person.avatar ? (
                <Image source={{ uri: person.avatar }} style={activeStyles.personAvatar} />
              ) : (
                <View style={activeStyles.personAvatarFallback}>
                  <Text style={activeStyles.personInitial}>{person.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={activeStyles.personInfo}>
                <Text style={activeStyles.personName}>{person.name}</Text>
                {person.prayerFocus ? (
                  <Text style={activeStyles.personFocus}>{person.prayerFocus}</Text>
                ) : null}
              </View>
            </View>
          ))}
          <View style={{ height: 20 }} />
        </ScrollView>

        <View style={[activeStyles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <Pressable style={activeStyles.endBtn} onPress={handleEnd}>
            <Text style={activeStyles.endBtnText}>End Prayer Time</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const createActiveStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
  },
  warmBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
  },
  topGlow: {
    position: "absolute" as const,
    top: -100,
    alignSelf: "center" as const,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: colors.primary + "16",
  },
  safeTop: {
    paddingHorizontal: 24,
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  inPrayerLabel: {
    fontSize: 11,
    fontWeight: "800" as const,
    color: colors.primary,
    letterSpacing: 2.8,
  },
  endHeaderBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.muted,
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  orbSection: {
    alignItems: "center" as const,
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 32,
    gap: 10,
  },
  orb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + "1E",
    borderWidth: 1.5,
    borderColor: colors.primary + "35",
    marginBottom: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 5,
  },
  inviteText: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.foreground,
    textAlign: "center" as const,
    letterSpacing: -0.3,
  },
  inviteSub: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center" as const,
    lineHeight: 22,
    fontWeight: "500" as const,
  },
  scroll: { flex: 1 },
  peopleList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  personRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border + "50",
  },
  personAvatar: { width: 46, height: 46, borderRadius: 14 },
  personAvatarFallback: {
    width: 46, height: 46, borderRadius: 14,
    backgroundColor: colors.primary + "15",
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  personInitial: { fontSize: 18, fontWeight: "700" as const, color: colors.primary },
  personInfo: { flex: 1, gap: 4 },
  personName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.foreground,
  },
  personFocus: {
    fontSize: 12,
    color: colors.mutedForeground,
    fontStyle: "italic" as const,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border + "40",
    backgroundColor: "rgba(250,246,238,0.96)",
  },
  endBtn: {
    backgroundColor: colors.foreground,
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  endBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.primaryForeground,
    letterSpacing: 0.2,
  },
});

interface PostPrayerPromptProps {
  visible: boolean;
  count: number;
  onReflect: () => void;
  onDismiss: () => void;
}

function PostPrayerPrompt({ visible, count, onReflect, onDismiss }: PostPrayerPromptProps) {
  const colors = useThemeColors();
  const postStyles = useMemo(() => createPostStyles(colors), [colors]);
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 12 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.88);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <View style={postStyles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onDismiss} />
        <Animated.View
          style={[postStyles.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
        >
          <View style={postStyles.iconRing}>
            <Text style={postStyles.emoji}>🙏</Text>
          </View>
          <Text style={postStyles.title}>Prayer time complete</Text>
          <Text style={postStyles.body}>
            You prayed for{" "}
            <Text style={postStyles.bodyEmphasis}>
              {count} {count === 1 ? "person" : "people"}
            </Text>{" "}
            today.{"\n"}Would you like to reflect or write a prayer?
          </Text>
          <Pressable style={postStyles.reflectBtn} onPress={onReflect}>
            <Text style={postStyles.reflectBtnText}>Write a reflection</Text>
          </Pressable>
          <Pressable style={postStyles.dismissBtn} onPress={onDismiss}>
            <Text style={postStyles.dismissBtnText}>Not now</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const createPostStyles = (colors: ThemeColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(28,25,20,0.52)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 32,
    padding: 32,
    width: "100%" as const,
    alignItems: "center" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 40,
    elevation: 20,
  },
  iconRing: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: colors.primary + "15",
    alignItems: "center" as const, justifyContent: "center" as const,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: colors.primary + "30",
  },
  emoji: { fontSize: 34 },
  title: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: colors.foreground,
    textAlign: "center" as const,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  body: {
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: "center" as const,
    lineHeight: 22,
    fontWeight: "500" as const,
    marginBottom: 28,
  },
  bodyEmphasis: {
    fontWeight: "700" as const,
    color: colors.foreground,
  },
  reflectBtn: {
    width: "100%" as const,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center" as const,
    marginBottom: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  reflectBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: "#fff",
  },
  dismissBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  dismissBtnText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.mutedForeground,
  },
});

const createAddStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: "800" as const, color: colors.foreground, letterSpacing: -0.3, flex: 1, textAlign: "center" as const },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.secondary,
    alignItems: "center", justifyContent: "center",
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.secondary,
    alignItems: "center", justifyContent: "center",
  },
  focusStep: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },
  focusCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border + "80",
  },
  focusPersonRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  focusAvatar: {
    width: 48, height: 48, borderRadius: 14,
  },
  focusAvatarFallback: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: colors.primary + "18",
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  focusAvatarInitial: {
    fontSize: 20, fontWeight: "700" as const, color: colors.primary,
  },
  focusPersonName: {
    fontSize: 17, fontWeight: "700" as const, color: colors.foreground, flex: 1,
  },
  focusQuestion: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: colors.foreground,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  focusTextArea: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    fontSize: 16,
    color: colors.foreground,
    lineHeight: 24,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 120,
    fontWeight: "400" as const,
    textAlignVertical: "top" as const,
  },
  focusHint: {
    fontSize: 12,
    color: colors.mutedForeground,
    lineHeight: 18,
    fontWeight: "400" as const,
  },
  modeTabs: {
    flexDirection: "row",
    margin: 16,
    backgroundColor: colors.secondary + "80",
    borderRadius: 14,
    padding: 3,
  },
  modeTab: {
    flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 12,
  },
  modeTabActive: {
    backgroundColor: colors.card,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  modeTabText: { fontSize: 14, fontWeight: "600" as const, color: colors.mutedForeground },
  modeTabTextActive: { color: colors.foreground, fontWeight: "700" as const },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.card, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 12,
    marginHorizontal: 16, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.foreground, fontWeight: "500" as const },
  list: { paddingHorizontal: 16, gap: 8 },
  contactRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: colors.card, borderRadius: 18,
    padding: 14, borderWidth: 1, borderColor: colors.border + "80",
  },
  contactRowSelected: {
    borderColor: colors.primary + "60",
    backgroundColor: colors.primary + "08",
  },
  contactAvatar: { width: 46, height: 46, borderRadius: 23 },
  initialsAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: colors.secondary,
    alignItems: "center", justifyContent: "center",
  },
  initialsText: { fontSize: 16, fontWeight: "700" as const, color: colors.secondaryForeground },
  contactInfo: { flex: 1, gap: 3 },
  contactName: { fontSize: 15, fontWeight: "700" as const, color: colors.foreground },
  contactSub: { fontSize: 12, color: colors.mutedForeground },
  checkCircle: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.secondary,
  },
  checkCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  emptyState: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingBottom: 80,
  },
  emptyText: { fontSize: 15, color: colors.mutedForeground, fontWeight: "600" as const },
  customWrap: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  customLabel: { fontSize: 15, fontWeight: "700" as const, color: colors.foreground },
  customInput: {
    backgroundColor: colors.card, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 17, color: colors.foreground,
    borderWidth: 1.5, borderColor: colors.border,
    fontWeight: "500" as const,
  },
  customHint: { fontSize: 13, color: colors.mutedForeground, lineHeight: 20 },
  footer: {
    paddingHorizontal: 20, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: colors.primary, borderRadius: 999,
    paddingVertical: 16,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  addBtnDisabled: { opacity: 0.45, shadowOpacity: 0 },
  addBtnText: { fontSize: 16, fontWeight: "700" as const, color: "#fff" },
  focusInput: {
    backgroundColor: colors.secondary + "80",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
    fontWeight: "500" as const,
    marginBottom: 10,
  },
});

export default function JournalScreen() {
  const router = useRouter();
  const themeColors = useThemeColors();
  const colors = themeColors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tagConfig = useMemo(() => getTagConfig(colors), [colors]);
  const { tab, highlightId } = useLocalSearchParams<{ tab?: string; highlightId?: string }>();
  const [activeFilter, setActiveFilter] = useState<JournalFilter>("My Prayers");
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [dismissedLatestId, setDismissedLatestId] = useState<string | null>(null);
  const [addPersonVisible, setAddPersonVisible] = useState<boolean>(false);
  const [addFromRequest, setAddFromRequest] = useState<{ name: string; avatar?: string } | null>(null);
  const [addedToast, setAddedToast] = useState<string | null>(null);
  const addedToastAnim = useRef(new Animated.Value(0)).current;
  const [selectionVisible, setSelectionVisible] = useState<boolean>(false);
  const [prayerActive, setPrayerActive] = useState<boolean>(false);
  const [prayerSelectedIds, setPrayerSelectedIds] = useState<string[]>([]);
  const [postPrayerVisible, setPostPrayerVisible] = useState<boolean>(false);
  const [recentlyPrayedId, setRecentlyPrayedId] = useState<string | null>(null);
  const repeatPulse = useRef(new Animated.Value(1)).current;

  const { journal, yourPeople, addYourPerson, addManyYourPeople, removeYourPerson, markPersonPrayed, toggleJournalFavorite, deleteJournalEntry } = usePrayer();

  const today = new Date().toISOString().split("T")[0];
  const prayedCount = yourPeople.filter((p) => p.lastPrayedDate === today).length;
  const highlightAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 1600, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    );
    float.start();
    return () => float.stop();
  }, [floatAnim]);

  useEffect(() => {
    if (tab === "praying_for") {
      setActiveFilter("Prayer Requests");
      console.log("[Journal] Auto-selected Prayer Requests tab");
    }
    if (highlightId) {
      setHighlightedId(highlightId);
      highlightAnim.setValue(1);
      console.log("[Journal] Highlighting entry:", highlightId);
    }
  }, [tab, highlightId, highlightAnim]);

  const dismissHighlight = useCallback((entryId: string) => {
    if (entryId !== highlightedId) return;
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    Animated.timing(highlightAnim, {
      toValue: 0, duration: 400, useNativeDriver: false,
    }).start(() => {
      setHighlightedId(null);
      console.log("[Journal] Dismissed highlight for:", entryId);
    });
  }, [highlightedId, highlightAnim]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback((id: string) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleFilterPress = useCallback((f: JournalFilter) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    setActiveFilter(f);
  }, []);

  const allEntries = [...journal, ...MOCK_ENTRIES].sort((a, b) => b.timestamp - a.timestamp);

  const myPrayerEntries = allEntries.filter((e) => e.tag !== "praying_for");
  const prayingForEntries = allEntries.filter((e) => e.tag === "praying_for");

  const grouped = myPrayerEntries.reduce<Record<string, JournalEntry[]>>((acc, e) => {
    const group = formatDateGroup(e.timestamp);
    if (!acc[group]) acc[group] = [];
    acc[group].push(e);
    return acc;
  }, {});

  const latestPrayingForId = prayingForEntries.length > 0 ? prayingForEntries[0].id : null;

  const handleAddYourPerson = useCallback((people: Array<Omit<YourPerson, "id">>) => {
    addManyYourPeople(people);
    setAddFromRequest(null);
    setAddPersonVisible(false);
    const msg = people.length === 1 ? `Added ${people[0].name.split(" ")[0]} to Your People` : `Added ${people.length} people to Your People`;
    setAddedToast(msg);
    addedToastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(addedToastAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(addedToastAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => setAddedToast(null));
  }, [addManyYourPeople, addedToastAnim]);

  const handleAddFromRequest = useCallback((entry: JournalEntry) => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
    const name = entry.contactName ?? entry.title.replace(/^Praying for\s*/i, "").trim();
    const avatar = entry.contactAvatar;
    if (yourPeople.find((p) => p.name.toLowerCase() === name.toLowerCase())) {
      if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      console.log("[Journal] Person already in Your People:", name);
      return;
    }
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addYourPerson({ name, avatar });
    console.log("[Journal] Added to Your People from request:", name);
  }, [yourPeople, addYourPerson]);

  const handleBeginPrayerTime = useCallback((ids: string[]) => {
    console.log("[Journal] Beginning prayer time for:", ids.length, "people");
    setPrayerSelectedIds(ids);
    setSelectionVisible(false);
    setPrayerActive(true);
  }, []);

  const handleEndPrayerTime = useCallback(() => {
    console.log("[Journal] Ending prayer time, marking prayed:", prayerSelectedIds.length, "people");
    prayerSelectedIds.forEach((id) => markPersonPrayed(id));
    setPrayerActive(false);
    setPostPrayerVisible(true);
  }, [prayerSelectedIds, markPersonPrayed]);

  const handlePostPrayerReflect = useCallback(() => {
    setPostPrayerVisible(false);
    router.push("/journal-entry");
  }, [router]);

  const isInYourPeople = useCallback((entry: JournalEntry) => {
    const name = entry.contactName ?? entry.title.replace(/^Praying for\s*/i, "").trim();
    return yourPeople.some((p) => p.name.toLowerCase() === name.toLowerCase());
  }, [yourPeople]);

  const renderYourPersonItem = useCallback(({ item }: { item: YourPerson }) => {
    const prayedToday = item.lastPrayedDate === today;
    const isRecentlyPrayed = recentlyPrayedId === item.id;

    const handlePress = () => {
      if (prayedToday) {
        if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRecentlyPrayedId(item.id);
        Animated.sequence([
          Animated.spring(repeatPulse, { toValue: 1.18, useNativeDriver: true, tension: 200, friction: 8 }),
          Animated.spring(repeatPulse, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
        ]).start(() => setRecentlyPrayedId(null));
        markPersonPrayed(item.id);
        console.log("[Journal] Re-prayed for:", item.name);
        return;
      }
      if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      markPersonPrayed(item.id);
      console.log("[Journal] Prayed for:", item.name);
    };

    return (
      <Pressable
        style={styles.personItem}
        onPress={handlePress}
        onLongPress={() => {
          if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          removeYourPerson(item.id);
          console.log("[Journal] Removed from Your People:", item.name);
        }}
      >
        <Animated.View
          style={[
            styles.personAvatarWrap,
            isRecentlyPrayed && { transform: [{ scale: repeatPulse }] },
          ]}
        >
          {item.avatar ? (
            <Image
              source={{ uri: item.avatar }}
              style={[
                styles.personAvatar,
                prayedToday && styles.personAvatarPrayed,
                isRecentlyPrayed && styles.personAvatarRepeat,
              ]}
            />
          ) : (
            <View style={[
              styles.personAvatarFallback,
              prayedToday && styles.personAvatarFallbackPrayed,
              isRecentlyPrayed && styles.personAvatarFallbackRepeat,
            ]}>
              <Text style={styles.personInitial}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={[
            styles.personHeartBadge,
            prayedToday && styles.personHeartBadgePrayed,
            isRecentlyPrayed && styles.personPrayedBadgeRepeat,
          ]}>
            <Heart size={7} color="#fff" fill="#fff" />
          </View>
        </Animated.View>
        <Text
          style={[styles.personName, prayedToday && styles.personNamePrayed]}
          numberOfLines={1}
        >
          {item.name.split(" ")[0]}
        </Text>
      </Pressable>
    );
  }, [removeYourPerson, markPersonPrayed, today, recentlyPrayedId, repeatPulse]);

  const addPersonButton = (
    <Pressable
      style={styles.personItem}
      onPress={() => {
        setAddFromRequest(null);
        setAddPersonVisible(true);
      }}
    >
      <View style={styles.personAddCircle}>
        <Plus size={22} color={colors.primary} strokeWidth={2} />
      </View>
      <Text style={styles.personNameMuted}>Add</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <NavigationDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        activeRoute="/journal"
      />

      <AddPersonModal
        visible={addPersonVisible}
        onClose={() => { setAddPersonVisible(false); setAddFromRequest(null); }}
        onAdd={handleAddYourPerson}
        existingPeople={yourPeople}
      />

      <PrayerSelectionModal
        visible={selectionVisible}
        people={yourPeople}
        onClose={() => setSelectionVisible(false)}
        onBegin={handleBeginPrayerTime}
      />

      <ActivePrayerModal
        visible={prayerActive}
        people={yourPeople}
        selectedIds={prayerSelectedIds}
        onEnd={handleEndPrayerTime}
      />

      <PostPrayerPrompt
        visible={postPrayerVisible}
        count={prayerSelectedIds.length}
        onReflect={handlePostPrayerReflect}
        onDismiss={() => setPostPrayerVisible(false)}
      />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable style={styles.iconBtn} onPress={() => router.push("/(tabs)/(home)")}>
            <ArrowLeft size={20} color={colors.secondaryForeground} />
          </Pressable>
          <Text style={styles.headerTitle}>Prayer Journal</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.newBtn} onPress={() => router.push("/journal-entry")}>
            <PenSquare size={20} color={colors.primaryForeground} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => setDrawerVisible(true)}>
            <Menu size={20} color={colors.secondaryForeground} />
          </Pressable>
        </View>
      </View>

      <View style={styles.filterRow}>
        <View style={styles.filterTrack}>
          {FILTERS.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <Pressable
                key={filter}
                style={[styles.filterButton, isActive && styles.filterButtonActive]}
                onPress={() => handleFilterPress(filter)}
                testID={`journal-filter-${filter.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>{filter}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {activeFilter === "Your People" ? (
        <AutoScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.yourPeopleTabHeader}>
            <Text style={styles.yourPeopleTabTitle}>Your People</Text>
            <Text style={styles.yourPeopleTabSub}>
              {yourPeople.length === 0
                ? "Add people you carry in prayer"
                : prayedCount > 0 && prayedCount === yourPeople.length
                ? "You've held everyone in prayer today ✦"
                : "Spend time with these today"}
            </Text>
          </View>

          {yourPeople.length > 0 && (
            <Pressable
              style={styles.startPrayerBtn}
              onPress={() => {
                if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectionVisible(true);
              }}
            >
              <Sparkles size={14} color={colors.primary} />
              <Text style={styles.startPrayerBtnText}>Begin prayer time</Text>
              <ChevronRight size={14} color={colors.primary} />
            </Pressable>
          )}

          {yourPeople.length === 0 ? (
            <View style={styles.yourPeopleTabEmpty}>
              <View style={styles.peopleGridEmptyRow}>
                {[0, 1, 2, 3].map((i) => (
                  <Pressable key={i} style={styles.personGridEmptyCard} onPress={() => setAddPersonVisible(true)}>
                    <View style={styles.personGridEmptyCircle}>
                      <Plus size={20} color={colors.primary} strokeWidth={1.8} />
                    </View>
                    <Text style={styles.personGridEmptyLabel}>{i === 0 ? "Add" : ""}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={styles.addPeoplePrompt} onPress={() => setAddPersonVisible(true)}>
                <UserPlus size={15} color={colors.primary} />
                <Text style={styles.addPeoplePromptText}>Add people you're praying for</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.yourPeopleListWrap}>
              {yourPeople.map((item) => {
                const prayedToday = item.lastPrayedDate === today;
                const isRecentlyPrayed = recentlyPrayedId === item.id;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.personListRow, prayedToday && styles.personListRowPrayed]}
                    onPress={() => {
                      if (Platform.OS !== "web") {
                        void Haptics.impactAsync(
                          prayedToday ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
                        );
                      }
                      markPersonPrayed(item.id);
                      setRecentlyPrayedId(item.id);
                      Animated.sequence([
                        Animated.spring(repeatPulse, { toValue: 1.08, useNativeDriver: true, tension: 180, friction: 8 }),
                        Animated.spring(repeatPulse, { toValue: 1, useNativeDriver: true, tension: 180, friction: 8 }),
                      ]).start(() => setTimeout(() => setRecentlyPrayedId(null), 600));
                    }}
                    onLongPress={() => {
                      if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      removeYourPerson(item.id);
                    }}
                  >
                    <Animated.View
                      style={[
                        styles.personListAvatarWrap,
                        isRecentlyPrayed && { transform: [{ scale: repeatPulse }] },
                      ]}
                    >
                      {item.avatar ? (
                        <Image
                          source={{ uri: item.avatar }}
                          style={[styles.personListAvatar, prayedToday && styles.personListAvatarPrayed]}
                        />
                      ) : (
                        <View style={[styles.personListAvatarFallback, prayedToday && styles.personListAvatarFallbackPrayed]}>
                          <Text style={styles.personListInitial}>{item.name.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      <View style={[styles.personListHeartBadge, prayedToday && styles.personListHeartBadgePrayed]}>
                        <Heart size={7} color="#fff" fill="#fff" />
                      </View>
                    </Animated.View>
                    <View style={styles.personListInfo}>
                      <Text
                        style={[styles.personListName, prayedToday && styles.personListNamePrayed]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {item.prayerFocus ? (
                        <Text style={styles.personListFocus} numberOfLines={2}>
                          {item.prayerFocus}
                        </Text>
                      ) : (
                        <Text style={styles.personListFocusEmpty}>Add a prayer focus</Text>
                      )}
                    </View>
                    <View style={styles.personListHeartAction}>
                      <Heart
                        size={18}
                        color={prayedToday ? "#27A06E" : colors.border}
                        fill={prayedToday ? "#27A06E22" : "transparent"}
                        strokeWidth={1.5}
                      />
                    </View>
                  </Pressable>
                );
              })}
              <Pressable
                style={styles.personListAddRow}
                onPress={() => { setAddFromRequest(null); setAddPersonVisible(true); }}
              >
                <View style={styles.personListAddCircle}>
                  <Plus size={16} color={colors.primary} strokeWidth={2} />
                </View>
                <Text style={styles.personListAddLabel}>Add person</Text>
              </Pressable>
            </View>
          )}
          <View style={{ height: 40 }} />
        </AutoScrollView>
      ) : activeFilter === "Prayer Requests" ? (
        <AutoScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionBlock}>
            <View style={styles.sectionTopRow}>
              <View style={styles.sectionLabelRow}>
                <HandHeart size={13} color="#D4782F" />
                <Text style={[styles.sectionLabel, { color: "#D4782F" }]}>PRAYER REQUESTS</Text>
              </View>
              {prayingForEntries.length > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{prayingForEntries.length}</Text>
                </View>
              )}
            </View>
            <Text style={styles.sectionSub}>From your feed and community</Text>

            {prayingForEntries.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No prayer requests yet</Text>
                <Text style={styles.emptySub}>
                  Tap "Pray" on a community post and it will appear here.
                </Text>
              </View>
            ) : (
              prayingForEntries.map((entry) => {
                const isLatest = entry.id === latestPrayingForId && entry.id !== dismissedLatestId;
                const CardWrapper = isLatest ? Animated.View : View;
                const alreadyAdded = isInYourPeople(entry);
                return (
                  <CardWrapper
                    key={entry.id}
                    style={[isLatest && { transform: [{ translateY: floatAnim }] }]}
                  >
                    <Pressable
                      style={[styles.requestCard, isLatest && styles.requestCardLatest]}
                      onPress={() => {
                        if (entry.id === highlightedId) dismissHighlight(entry.id);
                        if (isLatest) {
                          setDismissedLatestId(entry.id);
                          if (Platform.OS !== "web") void Haptics.selectionAsync();
                        }
                        router.push(`/journal-detail/${entry.id}`);
                      }}
                    >
                      {entry.id === highlightedId && (
                        <Animated.View
                          style={[styles.highlightOverlay, { opacity: highlightAnim }]}
                          pointerEvents="none"
                        />
                      )}
                      {isLatest && (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>NEW</Text>
                        </View>
                      )}

                      {entry.contactAvatar ? (
                        <View style={styles.requestAuthorRow}>
                          <Image source={{ uri: entry.contactAvatar }} style={styles.requestAvatar} />
                          {entry.contactName && (
                            <Text style={[styles.requestAuthorName, isLatest && { color: "#fff" }]}>
                              {entry.contactName}
                            </Text>
                          )}
                        </View>
                      ) : null}

                      <Text style={[styles.requestTitle, isLatest && styles.requestTitleLatest]}>
                        {entry.title}
                      </Text>
                      <Text
                        style={[styles.requestExcerpt, isLatest && styles.requestExcerptLatest]}
                        numberOfLines={3}
                      >
                        {stripMarkdown(entry.prayerRequest ?? entry.body)}
                      </Text>

                      <View style={styles.requestFooter}>
                        <Text style={[styles.requestTime, isLatest && { color: "rgba(255,255,255,0.65)" }]}>
                          {formatTime(entry.timestamp)}
                        </Text>

                        <Pressable
                          style={[
                            styles.addToPeopleBtn,
                            alreadyAdded && styles.addToPeopleBtnAdded,
                            isLatest && styles.addToPeopleBtnLatest,
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            if (!alreadyAdded) handleAddFromRequest(entry);
                          }}
                          disabled={alreadyAdded}
                        >
                          {alreadyAdded ? (
                            <>
                              <Check size={11} color={isLatest ? "#fff" : colors.primary} strokeWidth={2.5} />
                              <Text style={[styles.addToPeopleBtnText, alreadyAdded && styles.addToPeopleBtnTextAdded, isLatest && { color: "#fff" }]}>
                                In Your People
                              </Text>
                            </>
                          ) : (
                            <>
                              <UserPlus size={11} color={isLatest ? "#fff" : colors.primary} />
                              <Text style={[styles.addToPeopleBtnText, isLatest && { color: "#fff" }]}>
                                Add to Your People
                              </Text>
                            </>
                          )}
                        </Pressable>
                      </View>
                    </Pressable>
                  </CardWrapper>
                );
              })
            )}
          </View>
          <View style={{ height: 40 }} />
        </AutoScrollView>
      ) : (
        <AutoScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {myPrayerEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No entries</Text>
              <Text style={styles.emptySub}>Your journal entries will show up here.</Text>
            </View>
          ) : (
            <View style={styles.accordionContainer}>
              {myPrayerEntries.map((entry, index) => {
                const tagCfg = tagConfig[entry.tag] ?? tagConfig.reflection;
                const isExpanded = expandedIds.has(entry.id);
                const isLast = index === myPrayerEntries.length - 1;
                return (
                  <View key={entry.id} style={!isLast && styles.accordionDivider}>
                    {entry.id === highlightedId && (
                      <Animated.View
                        style={[styles.accordionHighlight, { opacity: highlightAnim }]}
                        pointerEvents="none"
                      />
                    )}
                    <Pressable
                      style={styles.accordionRow}
                      onPress={() => {
                        if (entry.id === highlightedId) dismissHighlight(entry.id);
                        router.push(`/journal-detail/${entry.id}`);
                      }}
                      onLongPress={() => {
                        if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        Alert.alert(
                          entry.title,
                          undefined,
                          [
                            {
                              text: "Edit Entry",
                              onPress: () => router.push(`/journal-entry?editId=${entry.id}` as never),
                            },
                            {
                              text: "Delete Entry",
                              style: "destructive",
                              onPress: () => {
                                Alert.alert(
                                  "Delete Entry",
                                  "This will permanently delete this prayer entry.",
                                  [
                                    { text: "Cancel", style: "cancel" },
                                    {
                                      text: "Delete",
                                      style: "destructive",
                                      onPress: () => {
                                        if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                        deleteJournalEntry(entry.id);
                                      },
                                    },
                                  ]
                                );
                              },
                            },
                            { text: "Cancel", style: "cancel" },
                          ]
                        );
                      }}
                    >
                      <View style={styles.accordionRowLeft}>
                        <Text style={styles.accordionTitle} numberOfLines={isExpanded ? undefined : 1}>
                          {entry.title}
                        </Text>
                        <View style={[styles.tagBadge, { backgroundColor: tagCfg.bg }]}>
                          <Text style={[styles.tagText, { color: tagCfg.color }]}>{tagCfg.label}</Text>
                        </View>
                      </View>
                      <Pressable
                        style={styles.expandBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleExpand(entry.id);
                        }}
                        hitSlop={10}
                      >
                        {isExpanded
                          ? <Minus size={15} color={colors.mutedForeground} />
                          : <Plus size={15} color={colors.primary} />
                        }
                      </Pressable>
                    </Pressable>

                    {isExpanded && (
                      <View style={styles.accordionBody}>
                        <Text style={styles.accordionExcerpt}>
                          {stripMarkdown(entry.body)}
                        </Text>
                        {entry.eventDate && !isNaN(daysUntil(entry.eventDate)) && daysUntil(entry.eventDate) >= 0 && (
                          <View style={[styles.entryDateChip, shouldShowReminderBadge(entry.eventDate) && styles.entryDateChipUrgent]}>
                            <CalendarDays size={12} color={shouldShowReminderBadge(entry.eventDate) ? colors.destructive : colors.primary} />
                            <Text style={[styles.entryDateChipText, shouldShowReminderBadge(entry.eventDate) && styles.entryDateChipTextUrgent]}>
                              {formatPrayerDateFeed(entry.eventDate)}
                            </Text>
                          </View>
                        )}
                        <View style={styles.accordionFooter}>
                          <Text style={styles.entryTime}>{formatTime(entry.timestamp)}</Text>
                          <View style={styles.accordionFooterTags}>
                            <Pressable
                              style={styles.footerTag}
                              onPress={(e) => {
                                e.stopPropagation();
                                if (Platform.OS !== "web") void Haptics.selectionAsync();
                                toggleJournalFavorite(entry.id);
                              }}
                              hitSlop={8}
                            >
                              <Heart
                                size={11}
                                color={entry.isFavorite ? colors.primary : colors.mutedForeground}
                                fill={entry.isFavorite ? colors.primary : "transparent"}
                              />
                              <Text style={[styles.footerTagText, !entry.isFavorite && { color: colors.mutedForeground }]}>
                                {entry.isFavorite ? "Saved" : "Save"}
                              </Text>
                            </Pressable>
                            {entry.isAnswered && (
                              <View style={styles.footerTag}>
                                <CheckCircle size={11} color="#D4782F" />
                                <Text style={[styles.footerTagText, { color: "#D4782F" }]}>Answered</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
          <View style={{ height: 40 }} />
        </AutoScrollView>
      )}

      {addedToast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.addedToast,
            {
              opacity: addedToastAnim,
              transform: [{ translateY: addedToastAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            },
          ]}
        >
          <UserPlus size={15} color="#fff" />
          <Text style={styles.addedToastText}>{addedToast}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerLeft: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10 },
  headerRight: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
  headerTitle: { fontSize: 24, fontWeight: "800" as const, color: colors.foreground },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.secondary,
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  newBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center" as const, justifyContent: "center" as const,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  filterRow: { paddingHorizontal: 20, paddingBottom: 16, marginBottom: 4 },
  filterTrack: {
    backgroundColor: colors.secondary + "80",
    borderRadius: 16,
    flexDirection: "row" as const,
    padding: 4,
  },
  filterButton: {
    flex: 1, alignItems: "center" as const, justifyContent: "center" as const,
    paddingVertical: 14, borderRadius: 12,
  },
  filterButtonActive: {
    backgroundColor: colors.card,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  filterLabel: { fontSize: 14, fontWeight: "700" as const, color: colors.mutedForeground },
  filterLabelActive: { color: colors.primary },
  scrollContent: { paddingHorizontal: 20 },

  sectionBlock: { marginBottom: 8 },
  sectionTopRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 4,
  },
  sectionLabelRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6 },
  sectionLabel: {
    fontSize: 10, fontWeight: "800" as const, color: colors.mutedForeground,
    letterSpacing: 1.6, textTransform: "uppercase" as const,
  },
  sectionSub: {
    fontSize: 12, color: colors.mutedForeground,
    fontWeight: "500" as const, marginBottom: 16,
  },
  manageLinkText: { fontSize: 13, color: colors.primary, fontWeight: "600" as const },
  countBadge: {
    backgroundColor: "#D4782F18", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  countBadgeText: {
    fontSize: 11, fontWeight: "700" as const, color: "#D4782F",
  },
  dividerLine: {
    height: 1, backgroundColor: colors.border + "60",
    marginVertical: 20, marginHorizontal: 0,
  },
  personList: { gap: 12, paddingHorizontal: 20 },
  personListOuter: { marginHorizontal: -20 },
  personItem: { alignItems: "center" as const, gap: 7, width: 68 },
  personAvatarWrap: { position: "relative" as const },
  personAvatar: {
    width: 60, height: 60, borderRadius: 20,
    borderWidth: 2.5, borderColor: colors.primary + "50",
  },
  personAvatarFallback: {
    width: 60, height: 60, borderRadius: 20,
    backgroundColor: colors.primary + "18",
    borderWidth: 2, borderColor: colors.primary + "30",
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  personInitial: { fontSize: 22, fontWeight: "700" as const, color: colors.primary },
  personHeartBadge: {
    position: "absolute" as const, bottom: -3, right: -3,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center" as const, justifyContent: "center" as const,
    borderWidth: 2, borderColor: colors.background,
  },
  personHeartBadgePrayed: {
    backgroundColor: "#27A06E",
  },
  personPrayedBadge: {
    position: "absolute" as const, bottom: -3, right: -3,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#27A06E",
    alignItems: "center" as const, justifyContent: "center" as const,
    borderWidth: 2, borderColor: colors.background,
  },
  personPrayedBadgeRepeat: {
    backgroundColor: colors.primary,
  },
  personAvatarPrayed: {
    borderColor: "#27A06E55",
  },
  personAvatarRepeat: {
    borderColor: colors.primary + "80",
    opacity: 1,
  },
  personAvatarFallbackPrayed: {
    backgroundColor: "#27A06E15",
    borderColor: "#27A06E40",
  },
  personAvatarFallbackRepeat: {
    backgroundColor: colors.primary + "20",
    borderColor: colors.primary + "60",
  },
  personNamePrayed: {
    color: colors.mutedForeground,
  },
  prayerProgressRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    marginBottom: 16,
  },
  prayerProgressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: "hidden" as const,
  },
  prayerProgressFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#27A06E",
  },
  prayerProgressText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.mutedForeground,
    minWidth: 120,
    textAlign: "right" as const,
  },
  startPrayerBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.primary + "10",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary + "25",
    alignSelf: "center" as const,
  },
  startPrayerBtnText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  personName: { fontSize: 12, fontWeight: "700" as const, color: colors.foreground, textAlign: "center" as const },
  personNameMuted: { fontSize: 12, fontWeight: "600" as const, color: colors.mutedForeground, textAlign: "center" as const },
  personAddCircle: {
    width: 60, height: 60, borderRadius: 20,
    backgroundColor: colors.secondary,
    borderWidth: 1.5, borderColor: colors.primary + "40",
    borderStyle: "dashed" as const,
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  yourPeopleEmpty: { gap: 14 },
  yourPeopleEmptyRow: { flexDirection: "row" as const, gap: 12 },
  addPeoplePrompt: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 8,
    alignSelf: "center" as const,
    backgroundColor: colors.primary + "12",
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1, borderColor: colors.primary + "25",
  },
  addPeoplePromptText: { fontSize: 13, fontWeight: "700" as const, color: colors.primary },

  requestCard: {
    backgroundColor: colors.card, borderRadius: 22, padding: 18,
    marginBottom: 12, borderWidth: 1, borderColor: colors.border + "60",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    overflow: "hidden" as const, position: "relative" as const,
  },
  requestCardLatest: {
    backgroundColor: "#E8702A",
    borderColor: "#C95D20",
    shadowColor: "#E8702A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  requestAuthorRow: {
    flexDirection: "row" as const, alignItems: "center" as const,
    gap: 8, marginBottom: 10,
  },
  requestAvatar: { width: 28, height: 28, borderRadius: 14 },
  requestAuthorName: { fontSize: 13, fontWeight: "700" as const, color: colors.mutedForeground },
  requestTitle: { fontSize: 16, fontWeight: "700" as const, color: colors.foreground, marginBottom: 6 },
  requestTitleLatest: { color: "#fff" },
  requestExcerpt: { fontSize: 14, color: colors.secondaryForeground, lineHeight: 21, marginBottom: 14 },
  requestExcerptLatest: { color: "rgba(255,255,255,0.85)" },
  requestFooter: {
    flexDirection: "row" as const, alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border + "50",
  },
  requestTime: { fontSize: 10, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 0.8 },
  addToPeopleBtn: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 5,
    backgroundColor: colors.primary + "12",
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1, borderColor: colors.primary + "25",
  },
  addToPeopleBtnAdded: {
    backgroundColor: colors.primary + "08",
    borderColor: colors.primary + "20",
  },
  addToPeopleBtnLatest: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderColor: "rgba(255,255,255,0.3)",
  },
  addToPeopleBtnText: { fontSize: 11, fontWeight: "700" as const, color: colors.primary },
  addToPeopleBtnTextAdded: { color: colors.primary },
  newBadge: {
    position: "absolute" as const, top: 14, right: 14,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3,
  },
  newBadgeText: { fontSize: 9, fontWeight: "800" as const, color: "#fff", letterSpacing: 1.2 },
  highlightOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#E8913A22",
    borderRadius: 22,
    borderWidth: 2, borderColor: "#E8913A",
    zIndex: 1,
  },

  accordionContainer: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border + "60",
    overflow: "hidden" as const,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  accordionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border + "50",
  },
  accordionHighlight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary + "10",
    borderRadius: 24,
    zIndex: 0,
  },
  accordionRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 10,
  },
  accordionRowLeft: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    flexWrap: "nowrap" as const,
    overflow: "hidden" as const,
  },
  accordionTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.foreground,
    flex: 1,
    flexShrink: 1,
  },
  expandBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexShrink: 0,
  },
  accordionBody: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 0,
    gap: 10,
  },
  accordionExcerpt: {
    fontSize: 14,
    color: colors.secondaryForeground,
    lineHeight: 22,
  },
  accordionFooter: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginTop: 4,
  },
  accordionFooterTags: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  dateSection: { marginBottom: 20 },
  dateLabel: {
    fontSize: 11, fontWeight: "800" as const, color: colors.mutedForeground,
    letterSpacing: 1.5, textTransform: "uppercase" as const, marginBottom: 12,
  },
  entryDateChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    alignSelf: "flex-start" as const,
    backgroundColor: colors.primary + "12",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
    marginBottom: 2,
  },
  entryDateChipUrgent: {
    backgroundColor: colors.destructive + "12",
  },
  entryDateChipText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  entryDateChipTextUrgent: {
    color: colors.destructive,
  },
  entryCard: {
    backgroundColor: colors.card, borderRadius: 24, padding: 22,
    borderWidth: 1, borderColor: colors.border + "50",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    marginBottom: 12, overflow: "hidden" as const, position: "relative" as const,
  },
  entryHeader: {
    flexDirection: "row", alignItems: "flex-start",
    justifyContent: "space-between", marginBottom: 10, gap: 8,
  },
  entryTitle: { fontSize: 17, fontWeight: "700" as const, color: colors.foreground, flex: 1 },
  tagBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  tagText: { fontSize: 9, fontWeight: "700" as const, letterSpacing: 0.5 },
  entryExcerpt: { fontSize: 14, color: colors.secondaryForeground, lineHeight: 22, marginBottom: 14 },
  entryFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  entryTime: { fontSize: 10, fontWeight: "700" as const, color: colors.mutedForeground, letterSpacing: 1 },
  footerTag: { flexDirection: "row", alignItems: "center", gap: 4 },
  footerTagText: { fontSize: 10, fontWeight: "700" as const, color: colors.primary },
  emptyState: {
    alignItems: "center" as const, paddingTop: 40, paddingHorizontal: 32, gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700" as const, color: colors.foreground, textAlign: "center" as const },
  emptySub: { fontSize: 14, color: colors.mutedForeground, textAlign: "center" as const, lineHeight: 21 },

  yourPeopleTabHeader: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  yourPeopleTabTitle: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: colors.foreground,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  yourPeopleTabSub: {
    fontSize: 14,
    color: colors.mutedForeground,
    fontWeight: "500" as const,
    lineHeight: 20,
  },
  yourPeopleTabEmpty: { gap: 20 },
  peopleGridEmptyRow: {
    flexDirection: "row" as const,
    gap: 12,
  },
  personGridEmptyCard: {
    flex: 1,
    alignItems: "center" as const,
    gap: 8,
  },
  personGridEmptyCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.primary + "40",
    borderStyle: "dashed" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: colors.primary + "06",
  },
  personGridEmptyLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.mutedForeground,
  },
  yourPeopleListWrap: {
    gap: 10,
    marginTop: 8,
  },
  personListRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border + "60",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  personListRowPrayed: {
    borderColor: "#27A06E40",
    backgroundColor: colors.card,
    shadowColor: "#27A06E",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  personListAvatarWrap: {
    position: "relative" as const,
    flexShrink: 0,
  },
  personListAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primary + "40",
  },
  personListAvatarPrayed: {
    borderColor: "#27A06E50",
  },
  personListAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary + "18",
    borderWidth: 2,
    borderColor: colors.primary + "30",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  personListAvatarFallbackPrayed: {
    backgroundColor: "#27A06E15",
    borderColor: "#27A06E30",
  },
  personListInitial: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  personListPrayedBadge: {
    position: "absolute" as const,
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#27A06E",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 2,
    borderColor: colors.card,
  },
  personListHeartBadge: {
    position: "absolute" as const,
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 2,
    borderColor: colors.card,
  },
  personListHeartBadgePrayed: {
    backgroundColor: "#27A06E",
  },
  personListHeartAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexShrink: 0,
  },
  personListInfo: {
    flex: 1,
    gap: 3,
  },
  personListName: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.foreground,
    letterSpacing: -0.1,
  },
  personListNamePrayed: {
    color: "#27A06E",
  },
  personListFocus: {
    fontSize: 13,
    color: colors.mutedForeground,
    lineHeight: 18,
    fontWeight: "400" as const,
  },
  personListFocusEmpty: {
    fontSize: 12,
    color: colors.border,
    fontStyle: "italic" as const,
    fontWeight: "400" as const,
  },
  personListPrayedIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#27A06E12",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1.5,
    borderColor: "#27A06E30",
    flexShrink: 0,
  },
  personListPrayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.primary + "12",
    borderWidth: 1,
    borderColor: colors.primary + "25",
    flexShrink: 0,
  },
  personListPrayBtnText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  personListAddRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.primary + "25",
    borderStyle: "dashed" as const,
    backgroundColor: colors.primary + "04",
  },
  personListAddCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primary + "14",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  personListAddLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  addedToast: {
    position: "absolute" as const,
    bottom: 24,
    alignSelf: "center" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  addedToastText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: "#fff",
  },
});
