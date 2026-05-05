import { useState, useCallback, useMemo } from "react";
import createContextHook from "@nkzw/create-context-hook";

export type Recipient = {
  id: string;
  name: string;
  avatar?: string;
  initials?: string;
  subtitle: string;
  onApp: boolean;
  source: "app" | "whatsapp" | "sim";
};

export const ALL_RECIPIENTS: Recipient[] = [
  {
    id: "r1",
    name: "Michael Scott",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    subtitle: "Recent prayer partner",
    onApp: true,
    source: "app",
  },
  {
    id: "r2",
    name: "Pam Beesly",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    subtitle: "Community member",
    onApp: true,
    source: "app",
  },
  {
    id: "r3",
    name: "Alice Thompson",
    avatar: "https://randomuser.me/api/portraits/women/62.jpg",
    subtitle: "Prayer circle",
    onApp: true,
    source: "app",
  },
  {
    id: "r4",
    name: "Dwight Schrute",
    initials: "DW",
    subtitle: "WhatsApp Contact",
    onApp: false,
    source: "whatsapp",
  },
  {
    id: "r5",
    name: "Jim Halpert",
    initials: "JH",
    subtitle: "SIM Contact",
    onApp: false,
    source: "sim",
  },
  {
    id: "r6",
    name: "Kevin Malone",
    initials: "KM",
    subtitle: "WhatsApp Contact",
    onApp: false,
    source: "whatsapp",
  },
  {
    id: "r7",
    name: "Angela Martin",
    initials: "AM",
    subtitle: "SIM Contact",
    onApp: false,
    source: "sim",
  },
];

export type FeedPostMeta = {
  isAnonymous: boolean;
  tags: string[];
  eventDate: string | null;
  photoUrls: string[];
  audioUri?: string;
  audioDurationMs?: number;
  includeAudio?: boolean;
  includeTranscription?: boolean;
  audioTranscription?: string;
};

export const [SelectedRecipientsProvider, useSelectedRecipients] = createContextHook(() => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draftPrayerText, setDraftPrayerText] = useState<string>("");
  const [feedPostMeta, setFeedPostMeta] = useState<FeedPostMeta | null>(null);

  const toggleRecipient = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }, []);

  const clearAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  return useMemo(() => ({
    selectedIds,
    selectedRecipients: ALL_RECIPIENTS.filter((r) => selectedIds.includes(r.id)),
    toggleRecipient,
    clearAll,
    draftPrayerText,
    setDraftPrayerText,
    feedPostMeta,
    setFeedPostMeta,
  }), [selectedIds, toggleRecipient, clearAll, draftPrayerText, feedPostMeta]);
});
