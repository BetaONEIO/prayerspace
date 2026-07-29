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
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCommunityIds, setSelectedCommunityIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [draftPrayerText, setDraftPrayerText] = useState<string>("");
  const [feedPostMeta, setFeedPostMeta] = useState<FeedPostMeta | null>(null);

  const toggleRecipient = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }, []);

  const clearAll = useCallback(() => {
    setSelectedIds([]);
    setSelectedCommunityIds([]);
    setSelectedGroupIds([]);
  }, []);

  return useMemo(() => ({
    recipients,
    setRecipients,
    selectedIds,
    selectedRecipients: recipients.filter((r) => selectedIds.includes(r.id)),
    toggleRecipient,
    clearAll,
    selectedCommunityIds,
    setSelectedCommunityIds,
    selectedGroupIds,
    setSelectedGroupIds,
    draftPrayerText,
    setDraftPrayerText,
    feedPostMeta,
    setFeedPostMeta,
  }), [recipients, selectedIds, toggleRecipient, clearAll, selectedCommunityIds, selectedGroupIds, draftPrayerText, feedPostMeta]);
});
