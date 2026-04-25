import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY_HAS_REVIEWED = "@prayer_space:has_reviewed";
const STORAGE_KEY_LAST_PROMPT = "@prayer_space:last_review_prompt";
const STORAGE_KEY_PRAYERS_SENT = "@prayer_space:prayers_sent_count";

const REVIEW_MILESTONES = [5, 15, 30];
const MIN_DAYS_BETWEEN_PROMPTS = 30;

async function getShouldShowPrompt(): Promise<boolean> {
  try {
    const [hasReviewed, lastPromptStr, prayersSentStr] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_HAS_REVIEWED),
      AsyncStorage.getItem(STORAGE_KEY_LAST_PROMPT),
      AsyncStorage.getItem(STORAGE_KEY_PRAYERS_SENT),
    ]);

    if (hasReviewed === "true") {
      console.log("[ReviewPrompt] User has already reviewed, skipping.");
      return false;
    }

    const prayersSent = parseInt(prayersSentStr ?? "0", 10);

    const hitMilestone = REVIEW_MILESTONES.includes(prayersSent);
    if (!hitMilestone) {
      console.log(`[ReviewPrompt] ${prayersSent} prayers sent, no milestone hit.`);
      return false;
    }

    if (lastPromptStr) {
      const lastPrompt = new Date(lastPromptStr);
      const now = new Date();
      const daysSince = (now.getTime() - lastPrompt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < MIN_DAYS_BETWEEN_PROMPTS) {
        console.log(`[ReviewPrompt] Only ${Math.floor(daysSince)} days since last prompt, skipping.`);
        return false;
      }
    }

    console.log(`[ReviewPrompt] Milestone hit at ${prayersSent} prayers. Showing prompt.`);
    return true;
  } catch (e) {
    console.error("[ReviewPrompt] Error checking prompt eligibility:", e);
    return false;
  }
}

export async function incrementPrayersSent(): Promise<void> {
  try {
    const current = await AsyncStorage.getItem(STORAGE_KEY_PRAYERS_SENT);
    const count = parseInt(current ?? "0", 10) + 1;
    await AsyncStorage.setItem(STORAGE_KEY_PRAYERS_SENT, String(count));
    console.log(`[ReviewPrompt] Prayers sent count: ${count}`);
  } catch (e) {
    console.error("[ReviewPrompt] Error incrementing prayers sent:", e);
  }
}

export async function markReviewPromptShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_LAST_PROMPT, new Date().toISOString());
  } catch (e) {
    console.error("[ReviewPrompt] Error marking prompt shown:", e);
  }
}

export async function markAsReviewed(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_HAS_REVIEWED, "true");
    console.log("[ReviewPrompt] Marked as reviewed.");
  } catch (e) {
    console.error("[ReviewPrompt] Error marking as reviewed:", e);
  }
}

export function useReviewPrompt() {
  const [showReview, setShowReview] = useState(false);

  const checkAndShowPrompt = useCallback(async () => {
    const should = await getShouldShowPrompt();
    if (should) {
      await markReviewPromptShown();
      setShowReview(true);
    }
  }, []);

  const openReview = useCallback(() => {
    setShowReview(true);
  }, []);

  const closeReview = useCallback(() => {
    setShowReview(false);
  }, []);

  const handleReviewed = useCallback(async () => {
    await markAsReviewed();
    setShowReview(false);
  }, []);

  return {
    showReview,
    checkAndShowPrompt,
    openReview,
    closeReview,
    handleReviewed,
  };
}
