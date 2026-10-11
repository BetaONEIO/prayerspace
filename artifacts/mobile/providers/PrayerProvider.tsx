import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import createContextHook from "@nkzw/create-context-hook";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { createAccountLocalStorage, getLocalDataIdentity } from "@/lib/accountLocalData";
import { Alert } from "react-native";
import { currentAccountReminderIds } from "@/lib/accountReminderNotifications";
import { useJournalBackup } from "@/hooks/useJournalBackup";
import { saveJournalEdits, loadJournal, type JournalEntry } from "@/lib/journalSync";
export type { JournalEntry } from "@/lib/journalSync";

export interface PrayerEntry {
  id: string;
  contactId: string;
  contactName: string;
  message: string;
  timestamp: number;
  type: "sent" | "received";
}

interface AppSettings {
  pushNotifications: boolean;
  emailDigest: boolean;
  whatsappAlerts: boolean;
  dailyVerse: boolean;
  prayerStreak: boolean;
  publicProfile: boolean;
  showPrayerCount: boolean;
  privateJournal: boolean;
}

export interface ArchivedPost {
  id: string;
  originalPostId: string;
  authorName: string;
  authorAvatar: string;
  category: string;
  content: string;
  postedAt: string;
  prayerCount: number;
  commentCount: number;
  archivedAt: number;
}

export interface YourPerson {
  id: string;
  name: string;
  avatar?: string;
  prayerFocus?: string;
  lastPrayedDate?: string;
  lastPrayedAt?: number;
}

export interface PrayerReminder {
  entryId: string;
  hour: number;
  minute: number;
  frequency: 'everyday' | 'weekdays' | 'weekends' | 'once';
  enabled: boolean;
  notificationIds?: string[];
}

export interface PrayerStats {
  totalPrayers: number;
  currentStreak: number;
  longestStreak: number;
  lastPrayerDate: string | null;
  peoplePrayedFor: string[];
}

const STORAGE_KEYS = {
  PRAYERS: "prayerful_prayers",
  JOURNAL: "prayerful_journal",
  SETTINGS: "prayerful_settings",
  STATS: "prayerful_stats",
  REMINDERS: "prayerful_reminders",
  ARCHIVED_POSTS: "prayerful_archived_posts",
  YOUR_PEOPLE: "prayerful_your_people",
} as const;

const DEFAULT_SETTINGS: AppSettings = {
  pushNotifications: true,
  emailDigest: false,
  whatsappAlerts: true,
  dailyVerse: true,
  prayerStreak: true,
  publicProfile: true,
  showPrayerCount: true,
  privateJournal: true,
};

const DEFAULT_STATS: PrayerStats = {
  totalPrayers: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastPrayerDate: null,
  peoplePrayedFor: [],
};

export const [PrayerProvider, usePrayer] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { user, localDataEpoch } = useAuth();
  const userId = user?.id ?? null;
  const storage = useMemo(
    () => createAccountLocalStorage(AsyncStorage, getLocalDataIdentity()),
    [userId, localDataEpoch],
  );
  const enabled = !!userId;
  const onSaveError = () => {
    if (storage.isActive()) {
      Alert.alert("Could not save", "Your changes could not be saved on this device. Please retry before leaving this screen.");
    }
  };
  const [prayers, setPrayers] = useState<PrayerEntry[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<PrayerStats>(DEFAULT_STATS);
  const [reminders, setReminders] = useState<PrayerReminder[]>([]);
  const [archivedPosts, setArchivedPosts] = useState<ArchivedPost[]>([]);
  const [yourPeople, setYourPeople] = useState<YourPerson[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const journalEditVersion = useRef(0);
  const backup = useJournalBackup(storage, entries => {
    storage.assertActive();
    setJournal(entries);
    queryClient.setQueryData(["journal", userId], entries);
  }, () => journalEditVersion.current);

  const prayersQuery = useQuery({
    queryKey: ["prayers", userId],
    enabled,
    queryFn: async () => {
      const stored = await storage.getItem(STORAGE_KEYS.PRAYERS);
      return stored ? (JSON.parse(stored) as PrayerEntry[]) : [];
    },
  });

  const journalQuery = useQuery({
    queryKey: ["journal", userId],
    enabled,
    queryFn: async () => {
      return loadJournal(storage);
    },
  });

  const settingsQuery = useQuery({
    queryKey: ["settings", userId],
    enabled,
    queryFn: async () => {
      const stored = await storage.getItem(STORAGE_KEYS.SETTINGS);
      return stored ? (JSON.parse(stored) as AppSettings) : DEFAULT_SETTINGS;
    },
  });

  const yourPeopleQuery = useQuery({
    queryKey: ["yourPeople", userId],
    enabled,
    queryFn: async () => {
      const stored = await storage.getItem(STORAGE_KEYS.YOUR_PEOPLE);
      return stored ? (JSON.parse(stored) as YourPerson[]) : [];
    },
  });

  const archivedPostsQuery = useQuery({
    queryKey: ["archivedPosts", userId],
    enabled,
    queryFn: async () => {
      const stored = await storage.getItem(STORAGE_KEYS.ARCHIVED_POSTS);
      return stored ? (JSON.parse(stored) as ArchivedPost[]) : [];
    },
  });

  const remindersQuery = useQuery({
    queryKey: ["reminders", userId],
    enabled,
    queryFn: async () => {
      const stored = await storage.getItem(STORAGE_KEYS.REMINDERS);
      const saved = stored ? (JSON.parse(stored) as PrayerReminder[]) : [];
      const scheduled = await currentAccountReminderIds(storage.owner);
      if (!scheduled) return saved;
      return saved.map(reminder => {
        const notificationIds = (reminder.notificationIds ?? []).filter(id => scheduled.has(id));
        return {
          ...reminder,
          notificationIds,
          enabled: reminder.enabled && notificationIds.length > 0,
        };
      });
    },
  });

  const statsQuery = useQuery({
    queryKey: ["stats", userId],
    enabled,
    queryFn: async () => {
      storage.assertActive();
      if (userId) {
        console.log("[PrayerProvider] Loading account prayer stats");
        try {
          const { data, error } = await supabase
            .from("prayer_stats")
            .select("*")
            .eq("user_id", userId)
            .single();
          if (!error && data) {
            storage.assertActive();
            return {
              totalPrayers: data.total_prayers ?? 0,
              currentStreak: data.current_streak ?? 0,
              longestStreak: data.longest_streak ?? 0,
              lastPrayerDate: data.last_prayer_date ?? null,
              peoplePrayedFor: [],
            } as PrayerStats;
          }
          if (error && error.code !== "PGRST116") {
            console.error("[PrayerProvider] Supabase stats error:", error.message);
          }
        } catch (e) {
          console.error("[PrayerProvider] Failed to fetch Supabase stats:", e);
        }
      }
      const stored = await storage.getItem(STORAGE_KEYS.STATS);
      return stored ? (JSON.parse(stored) as PrayerStats) : DEFAULT_STATS;
    },
  });

  useEffect(() => {
    if (prayersQuery.data) setPrayers(prayersQuery.data);
  }, [prayersQuery.data]);

  useEffect(() => {
    if (journalQuery.data) setJournal(journalQuery.data);
  }, [journalQuery.data]);

  useEffect(() => {
    if (settingsQuery.data) setSettings(settingsQuery.data);
  }, [settingsQuery.data]);

  useEffect(() => {
    if (statsQuery.data) setStats(statsQuery.data);
  }, [statsQuery.data]);

  useEffect(() => {
    if (remindersQuery.data) setReminders(remindersQuery.data);
  }, [remindersQuery.data]);

  useEffect(() => {
    if (archivedPostsQuery.data) setArchivedPosts(archivedPostsQuery.data);
  }, [archivedPostsQuery.data]);

  useEffect(() => {
    if (yourPeopleQuery.data) setYourPeople(yourPeopleQuery.data);
  }, [yourPeopleQuery.data]);

  const loadError = prayersQuery.error || journalQuery.error || settingsQuery.error ||
    statsQuery.error || remindersQuery.error || archivedPostsQuery.error || yourPeopleQuery.error;
  const initialLoadPending = prayersQuery.isPending || journalQuery.isPending ||
    settingsQuery.isPending || statsQuery.isPending || remindersQuery.isPending ||
    archivedPostsQuery.isPending || yourPeopleQuery.isPending;
  useEffect(() => {
    setIsHydrated(enabled && !initialLoadPending && !loadError);
  }, [enabled, initialLoadPending, loadError]);
  const retryLocalData = useCallback(() => Promise.all([
    prayersQuery.refetch(), journalQuery.refetch(), settingsQuery.refetch(),
    statsQuery.refetch(), remindersQuery.refetch(), archivedPostsQuery.refetch(),
    yourPeopleQuery.refetch(),
  ]), [prayersQuery.refetch, journalQuery.refetch, settingsQuery.refetch,
    statsQuery.refetch, remindersQuery.refetch, archivedPostsQuery.refetch,
    yourPeopleQuery.refetch]);
  const assertCanEdit = () => {
    storage.assertActive();
    if (!isHydrated) throw new Error("Please wait until your saved records have loaded before editing.");
  };

  const savePrayersMutation = useMutation({
    mutationFn: async (updated: PrayerEntry[]) => {
      await storage.setItem(STORAGE_KEYS.PRAYERS, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prayers", userId] });
    },
    onError: onSaveError,
  });

  const saveJournalMutation = useMutation({
    mutationFn: async (edit: { before: JournalEntry[]; after: JournalEntry[]; version: number }) => {
      return saveJournalEdits(storage, edit.before, edit.after);
    },
    onSuccess: (entries, edit) => {
      if (!storage.isActive()) return;
      if (edit.version === journalEditVersion.current) {
        setJournal(entries);
        queryClient.setQueryData(["journal", userId], entries);
      }
      backup.onSaved();
    },
    onError: onSaveError,
  });
  const persistJournal = (updated: JournalEntry[]) => {
    saveJournalMutation.mutate({ before: journal, after: updated, version: ++journalEditVersion.current });
  };

  const saveSettingsMutation = useMutation({
    mutationFn: async (updated: AppSettings) => {
      await storage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings", userId] });
    },
    onError: onSaveError,
  });

  const saveStatsMutation = useMutation({
    mutationFn: async (updated: PrayerStats) => {
      await storage.setItem(STORAGE_KEYS.STATS, JSON.stringify(updated));
      storage.assertActive();
      if (userId) {
        try {
          const { error } = await supabase.from("prayer_stats").upsert({
            user_id: userId,
            total_prayers: updated.totalPrayers,
            current_streak: updated.currentStreak,
            longest_streak: updated.longestStreak,
            last_prayer_date: updated.lastPrayerDate,
            updated_at: new Date().toISOString(),
          });
          if (error) console.error("[PrayerProvider] Supabase stats save error:", error.message);
          else console.log("[PrayerProvider] Stats synced to Supabase");
        } catch (e) {
          console.error("[PrayerProvider] Failed to sync stats:", e);
        }
      }
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["stats", userId] });
    },
    onError: onSaveError,
  });

  const saveYourPeopleMutation = useMutation({
    mutationFn: async (updated: YourPerson[]) => {
      await storage.setItem(STORAGE_KEYS.YOUR_PEOPLE, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["yourPeople", userId] });
    },
    onError: onSaveError,
  });

  const saveArchivedPostsMutation = useMutation({
    mutationFn: async (updated: ArchivedPost[]) => {
      await storage.setItem(STORAGE_KEYS.ARCHIVED_POSTS, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["archivedPosts", userId] });
    },
    onError: onSaveError,
  });

  const saveRemindersMutation = useMutation({
    mutationFn: async (updated: PrayerReminder[]) => {
      await storage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reminders", userId] });
    },
    onError: onSaveError,
  });

  const setReminder = useCallback((reminder: PrayerReminder) => {
    assertCanEdit();
    const updated = reminders.filter((r) => r.entryId !== reminder.entryId);
    updated.push(reminder);
    setReminders(updated);
    saveRemindersMutation.mutate(updated);
    console.log("[PrayerProvider] Reminder saved");
  }, [reminders, saveRemindersMutation, isHydrated, storage]);

  const removeReminder = useCallback((entryId: string) => {
    assertCanEdit();
    const updated = reminders.filter((r) => r.entryId !== entryId);
    setReminders(updated);
    saveRemindersMutation.mutate(updated);
    console.log("[PrayerProvider] Reminder removed for entry:", entryId);
  }, [reminders, saveRemindersMutation, isHydrated, storage]);

  const getReminderForEntry = useCallback((entryId: string): PrayerReminder | undefined => {
    return reminders.find((r) => r.entryId === entryId);
  }, [reminders]);

  const addPrayer = useCallback((entry: Omit<PrayerEntry, "id" | "timestamp">) => {
    assertCanEdit();
    const newEntry: PrayerEntry = {
      ...entry,
      id: `prayer-${Date.now()}`,
      timestamp: Date.now(),
    };
    const updated = [newEntry, ...prayers];
    setPrayers(updated);
    savePrayersMutation.mutate(updated);

    const today = new Date().toISOString().split("T")[0];
    const newStats: PrayerStats = {
      ...stats,
      totalPrayers: stats.totalPrayers + 1,
      lastPrayerDate: today,
      currentStreak:
        stats.lastPrayerDate === today
          ? stats.currentStreak
          : stats.currentStreak + 1,
      peoplePrayedFor: stats.peoplePrayedFor.includes(entry.contactId)
        ? stats.peoplePrayedFor
        : [...stats.peoplePrayedFor, entry.contactId],
    };
    newStats.longestStreak = Math.max(newStats.longestStreak, newStats.currentStreak);
    setStats(newStats);
    saveStatsMutation.mutate(newStats);
  }, [prayers, stats, savePrayersMutation, saveStatsMutation, isHydrated, storage]);

  const addYourPerson = useCallback((person: Omit<YourPerson, "id">) => {
    assertCanEdit();
    if (yourPeople.find((p) => p.name.toLowerCase() === person.name.toLowerCase())) return;
    const newPerson: YourPerson = {
      ...person,
      id: `person-${Date.now()}`,
    };
    const updated = [...yourPeople, newPerson];
    setYourPeople(updated);
    saveYourPeopleMutation.mutate(updated);
    console.log("[PrayerProvider] Added a person");
  }, [yourPeople, saveYourPeopleMutation, isHydrated, storage]);

  const addManyYourPeople = useCallback((people: Array<Omit<YourPerson, "id">>) => {
    assertCanEdit();
    const existingNames = new Set(yourPeople.map((p) => p.name.toLowerCase()));
    const newPeople = people
      .filter((p) => !existingNames.has(p.name.toLowerCase()))
      .map((p, i) => ({ ...p, id: `person-${Date.now()}-${i}` } as YourPerson));
    if (newPeople.length === 0) return;
    const updated = [...yourPeople, ...newPeople];
    setYourPeople(updated);
    saveYourPeopleMutation.mutate(updated);
    console.log("[PrayerProvider] Added people:", newPeople.length);
  }, [yourPeople, saveYourPeopleMutation, isHydrated, storage]);

  const removeYourPerson = useCallback((id: string) => {
    assertCanEdit();
    const updated = yourPeople.filter((p) => p.id !== id);
    setYourPeople(updated);
    saveYourPeopleMutation.mutate(updated);
    console.log("[PrayerProvider] Removed from Your People:", id);
  }, [yourPeople, saveYourPeopleMutation, isHydrated, storage]);

  const markPersonPrayed = useCallback((id: string) => {
    assertCanEdit();
    const today = new Date().toISOString().split("T")[0];
    const now = Date.now();
    const updated = yourPeople.map((p) =>
      p.id === id ? { ...p, lastPrayedDate: today, lastPrayedAt: now } : p
    );
    setYourPeople(updated);
    saveYourPeopleMutation.mutate(updated);
    console.log("[PrayerProvider] Marked as prayed:", id, today);
  }, [yourPeople, saveYourPeopleMutation, isHydrated, storage]);

  const addArchivedPost = useCallback((post: Omit<ArchivedPost, "id" | "archivedAt">) => {
    assertCanEdit();
    const newEntry: ArchivedPost = {
      ...post,
      id: `archived-${Date.now()}`,
      archivedAt: Date.now(),
    };
    const updated = [newEntry, ...archivedPosts];
    setArchivedPosts(updated);
    saveArchivedPostsMutation.mutate(updated);
    console.log("[PrayerProvider] Post archived to My Requests:", newEntry.id);
  }, [archivedPosts, saveArchivedPostsMutation, isHydrated, storage]);

  const addJournalEntry = useCallback((
    entry: Omit<JournalEntry, "id" | "timestamp" | "isFavorite" | "isAnswered">
  ): string => {
    assertCanEdit();
    const entryId = `journal-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const newEntry: JournalEntry = {
      ...entry,
      id: entryId,
      timestamp: Date.now(),
      isFavorite: false,
      isAnswered: false,
    };
    const updated = [newEntry, ...journal];
    setJournal(updated);
    persistJournal(updated);
    return entryId;
  }, [journal, saveJournalMutation, isHydrated, storage]);

  const toggleJournalFavorite = useCallback((id: string) => {
    assertCanEdit();
    const updated = journal.map((e) =>
      e.id === id ? { ...e, isFavorite: !e.isFavorite } : e
    );
    setJournal(updated);
    persistJournal(updated);
  }, [journal, saveJournalMutation, isHydrated, storage]);

  const markJournalAnswered = useCallback((id: string) => {
    assertCanEdit();
    const updated = journal.map((e) =>
      e.id === id ? { ...e, isAnswered: true } : e
    );
    setJournal(updated);
    persistJournal(updated);
  }, [journal, saveJournalMutation, isHydrated, storage]);

  const deleteJournalEntry = useCallback((id: string) => {
    assertCanEdit();
    const updated = journal.filter((e) => e.id !== id);
    setJournal(updated);
    persistJournal(updated);
    console.log("[PrayerProvider] Journal entry deleted:", id);
  }, [journal, saveJournalMutation, isHydrated, storage]);

  const updateJournalEntry = useCallback((id: string, patch: Partial<Omit<JournalEntry, "id">>) => {
    assertCanEdit();
    const updated = journal.map((e) => e.id === id ? { ...e, ...patch } : e);
    setJournal(updated);
    persistJournal(updated);
    console.log("[PrayerProvider] Journal entry updated:", id);
  }, [journal, saveJournalMutation, isHydrated, storage]);

  const updateSetting = useCallback((key: keyof AppSettings, value: boolean) => {
    assertCanEdit();
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettingsMutation.mutate(updated);
  }, [settings, saveSettingsMutation, isHydrated, storage]);

  const isLoading = enabled && !loadError && (!isHydrated ||
    prayersQuery.isLoading ||
    journalQuery.isLoading ||
    settingsQuery.isLoading ||
    statsQuery.isLoading ||
    remindersQuery.isLoading ||
    archivedPostsQuery.isLoading ||
    yourPeopleQuery.isLoading);

  return useMemo(() => ({
    prayers,
    journal,
    settings,
    stats,
    reminders,
    archivedPosts,
    yourPeople,
    journalBackup: backup,
    isLoading,
    loadError,
    retryLocalData,
    addPrayer,
    addJournalEntry,
    addArchivedPost,
    addYourPerson,
    addManyYourPeople,
    removeYourPerson,
    markPersonPrayed,
    toggleJournalFavorite,
    markJournalAnswered,
    deleteJournalEntry,
    updateJournalEntry,
    updateSetting,
    setReminder,
    removeReminder,
    getReminderForEntry,
  }), [prayers, journal, settings, stats, reminders, archivedPosts, yourPeople, backup, isLoading, loadError, retryLocalData, addPrayer, addJournalEntry, addArchivedPost, addYourPerson, addManyYourPeople, removeYourPerson, markPersonPrayed, toggleJournalFavorite, markJournalAnswered, deleteJournalEntry, updateJournalEntry, updateSetting, setReminder, removeReminder, getReminderForEntry]);
});

export function useFilteredJournal(filter: string) {
  const { journal } = usePrayer();
  return useMemo(() => {
    switch (filter) {
      case "Favorites":
        return journal.filter((e) => e.isFavorite);
      case "Answered":
        return journal.filter((e) => e.isAnswered);
      case "Reflections":
        return journal.filter((e) => e.tag === "reflection");
      default:
        return journal;
    }
  }, [journal, filter]);
}
