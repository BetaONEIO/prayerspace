import { useEffect, useMemo, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import createContextHook from "@nkzw/create-context-hook";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

export interface PrayerEntry {
  id: string;
  contactId: string;
  contactName: string;
  message: string;
  timestamp: number;
  type: "sent" | "received";
}

export interface JournalEntry {
  id: string;
  title: string;
  body: string;
  tag: "gratitude" | "petition" | "reflection" | "praying_for";
  timestamp: number;
  isFavorite: boolean;
  isAnswered: boolean;
  contactName?: string;
  contactAvatar?: string;
  prayerRequest?: string;
  eventDate?: string | null;
  imageUrl?: string | null;
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
  const { user } = useAuth();
  const [prayers, setPrayers] = useState<PrayerEntry[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [stats, setStats] = useState<PrayerStats>(DEFAULT_STATS);
  const [reminders, setReminders] = useState<PrayerReminder[]>([]);
  const [archivedPosts, setArchivedPosts] = useState<ArchivedPost[]>([]);
  const [yourPeople, setYourPeople] = useState<YourPerson[]>([]);

  const prayersQuery = useQuery({
    queryKey: ["prayers"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PRAYERS);
      return stored ? (JSON.parse(stored) as PrayerEntry[]) : [];
    },
  });

  const journalQuery = useQuery({
    queryKey: ["journal"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.JOURNAL);
      return stored ? (JSON.parse(stored) as JournalEntry[]) : [];
    },
  });

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      return stored ? (JSON.parse(stored) as AppSettings) : DEFAULT_SETTINGS;
    },
  });

  const yourPeopleQuery = useQuery({
    queryKey: ["yourPeople"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.YOUR_PEOPLE);
      return stored ? (JSON.parse(stored) as YourPerson[]) : [];
    },
  });

  const archivedPostsQuery = useQuery({
    queryKey: ["archivedPosts"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.ARCHIVED_POSTS);
      return stored ? (JSON.parse(stored) as ArchivedPost[]) : [];
    },
  });

  const remindersQuery = useQuery({
    queryKey: ["reminders"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.REMINDERS);
      return stored ? (JSON.parse(stored) as PrayerReminder[]) : [];
    },
  });

  const statsQuery = useQuery({
    queryKey: ["stats", user?.id],
    queryFn: async () => {
      if (user?.id) {
        console.log("[PrayerProvider] Loading stats from Supabase for user:", user.id);
        try {
          const { data, error } = await supabase
            .from("prayer_stats")
            .select("*")
            .eq("user_id", user.id)
            .single();
          if (!error && data) {
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
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.STATS);
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

  const savePrayersMutation = useMutation({
    mutationFn: async (updated: PrayerEntry[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.PRAYERS, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prayers"] });
    },
  });

  const saveJournalMutation = useMutation({
    mutationFn: async (updated: JournalEntry[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.JOURNAL, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["journal"] });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (updated: AppSettings) => {
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const saveStatsMutation = useMutation({
    mutationFn: async (updated: PrayerStats) => {
      await AsyncStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(updated));
      if (user?.id) {
        try {
          const { error } = await supabase.from("prayer_stats").upsert({
            user_id: user.id,
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
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });

  const saveYourPeopleMutation = useMutation({
    mutationFn: async (updated: YourPerson[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.YOUR_PEOPLE, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["yourPeople"] });
    },
  });

  const saveArchivedPostsMutation = useMutation({
    mutationFn: async (updated: ArchivedPost[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.ARCHIVED_POSTS, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["archivedPosts"] });
    },
  });

  const saveRemindersMutation = useMutation({
    mutationFn: async (updated: PrayerReminder[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(updated));
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
  });

  const setReminder = useCallback((reminder: PrayerReminder) => {
    const updated = reminders.filter((r) => r.entryId !== reminder.entryId);
    updated.push(reminder);
    setReminders(updated);
    saveRemindersMutation.mutate(updated);
    console.log("[PrayerProvider] Reminder set for entry:", reminder.entryId, reminder);
  }, [reminders, saveRemindersMutation]);

  const removeReminder = useCallback((entryId: string) => {
    const updated = reminders.filter((r) => r.entryId !== entryId);
    setReminders(updated);
    saveRemindersMutation.mutate(updated);
    console.log("[PrayerProvider] Reminder removed for entry:", entryId);
  }, [reminders, saveRemindersMutation]);

  const getReminderForEntry = useCallback((entryId: string): PrayerReminder | undefined => {
    return reminders.find((r) => r.entryId === entryId);
  }, [reminders]);

  const addPrayer = useCallback((entry: Omit<PrayerEntry, "id" | "timestamp">) => {
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
  }, [prayers, stats, savePrayersMutation, saveStatsMutation]);

  const addYourPerson = useCallback((person: Omit<YourPerson, "id">) => {
    if (yourPeople.find((p) => p.name.toLowerCase() === person.name.toLowerCase())) return;
    const newPerson: YourPerson = {
      ...person,
      id: `person-${Date.now()}`,
    };
    const updated = [...yourPeople, newPerson];
    setYourPeople(updated);
    saveYourPeopleMutation.mutate(updated);
    console.log("[PrayerProvider] Added to Your People:", newPerson.name);
  }, [yourPeople, saveYourPeopleMutation]);

  const addManyYourPeople = useCallback((people: Array<Omit<YourPerson, "id">>) => {
    const existingNames = new Set(yourPeople.map((p) => p.name.toLowerCase()));
    const newPeople = people
      .filter((p) => !existingNames.has(p.name.toLowerCase()))
      .map((p, i) => ({ ...p, id: `person-${Date.now()}-${i}` } as YourPerson));
    if (newPeople.length === 0) return;
    const updated = [...yourPeople, ...newPeople];
    setYourPeople(updated);
    saveYourPeopleMutation.mutate(updated);
    console.log("[PrayerProvider] Batch added to Your People:", newPeople.map((p) => p.name));
  }, [yourPeople, saveYourPeopleMutation]);

  const removeYourPerson = useCallback((id: string) => {
    const updated = yourPeople.filter((p) => p.id !== id);
    setYourPeople(updated);
    saveYourPeopleMutation.mutate(updated);
    console.log("[PrayerProvider] Removed from Your People:", id);
  }, [yourPeople, saveYourPeopleMutation]);

  const markPersonPrayed = useCallback((id: string) => {
    const today = new Date().toISOString().split("T")[0];
    const now = Date.now();
    const updated = yourPeople.map((p) =>
      p.id === id ? { ...p, lastPrayedDate: today, lastPrayedAt: now } : p
    );
    setYourPeople(updated);
    saveYourPeopleMutation.mutate(updated);
    console.log("[PrayerProvider] Marked as prayed:", id, today);
  }, [yourPeople, saveYourPeopleMutation]);

  const addArchivedPost = useCallback((post: Omit<ArchivedPost, "id" | "archivedAt">) => {
    const newEntry: ArchivedPost = {
      ...post,
      id: `archived-${Date.now()}`,
      archivedAt: Date.now(),
    };
    const updated = [newEntry, ...archivedPosts];
    setArchivedPosts(updated);
    saveArchivedPostsMutation.mutate(updated);
    console.log("[PrayerProvider] Post archived to My Requests:", newEntry.id);
  }, [archivedPosts, saveArchivedPostsMutation]);

  const addJournalEntry = useCallback((
    entry: Omit<JournalEntry, "id" | "timestamp" | "isFavorite" | "isAnswered">
  ): string => {
    const entryId = `journal-${Date.now()}`;
    const newEntry: JournalEntry = {
      ...entry,
      id: entryId,
      timestamp: Date.now(),
      isFavorite: false,
      isAnswered: false,
    };
    const updated = [newEntry, ...journal];
    setJournal(updated);
    saveJournalMutation.mutate(updated);
    return entryId;
  }, [journal, saveJournalMutation]);

  const toggleJournalFavorite = useCallback((id: string) => {
    const updated = journal.map((e) =>
      e.id === id ? { ...e, isFavorite: !e.isFavorite } : e
    );
    setJournal(updated);
    saveJournalMutation.mutate(updated);
  }, [journal, saveJournalMutation]);

  const markJournalAnswered = useCallback((id: string) => {
    const updated = journal.map((e) =>
      e.id === id ? { ...e, isAnswered: true } : e
    );
    setJournal(updated);
    saveJournalMutation.mutate(updated);
  }, [journal, saveJournalMutation]);

  const deleteJournalEntry = useCallback((id: string) => {
    const updated = journal.filter((e) => e.id !== id);
    setJournal(updated);
    saveJournalMutation.mutate(updated);
    console.log("[PrayerProvider] Journal entry deleted:", id);
  }, [journal, saveJournalMutation]);

  const updateJournalEntry = useCallback((id: string, patch: Partial<Omit<JournalEntry, "id">>) => {
    const updated = journal.map((e) => e.id === id ? { ...e, ...patch } : e);
    setJournal(updated);
    saveJournalMutation.mutate(updated);
    console.log("[PrayerProvider] Journal entry updated:", id);
  }, [journal, saveJournalMutation]);

  const updateSetting = useCallback((key: keyof AppSettings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettingsMutation.mutate(updated);
  }, [settings, saveSettingsMutation]);

  const isLoading =
    prayersQuery.isLoading ||
    journalQuery.isLoading ||
    settingsQuery.isLoading ||
    statsQuery.isLoading ||
    remindersQuery.isLoading ||
    archivedPostsQuery.isLoading ||
    yourPeopleQuery.isLoading;

  return useMemo(() => ({
    prayers,
    journal,
    settings,
    stats,
    reminders,
    archivedPosts,
    yourPeople,
    isLoading,
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
  }), [prayers, journal, settings, stats, reminders, archivedPosts, yourPeople, isLoading, addPrayer, addJournalEntry, addArchivedPost, addYourPerson, addManyYourPeople, removeYourPerson, markPersonPrayed, toggleJournalFavorite, markJournalAnswered, deleteJournalEntry, updateJournalEntry, updateSetting, setReminder, removeReminder, getReminderForEntry]);
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
