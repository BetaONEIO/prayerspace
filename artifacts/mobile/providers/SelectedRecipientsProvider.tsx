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

export const ALL_RECIPIENTS: Recipient[] = [];

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
