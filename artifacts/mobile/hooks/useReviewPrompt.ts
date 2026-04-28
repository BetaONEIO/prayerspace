import { useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RatingTriggerEvent } from "@/lib/ratingStore";

const STORAGE_KEY_HAS_RATED = "@prayer_space:has_reviewed";
const STORAGE_KEY_LAST_PROMPT = "@prayer_space:last_review_prompt";
const STORAGE_KEY_APP_OPEN_COUNT = "@prayer_space:app_open_count";
const STORAGE_KEY_ANSWERED_COUNT = "@prayer_space:answered_prayer_count";
const STORAGE_KEY_COMMUNITY_COUNT = "@prayer_space:community_engagement_count";

const MIN_DAYS_BETWEEN_PROMPTS = 7;
const APP_OPENS_THRESHOLD = 5;
const COMMUNITY_ENGAGEMENT_THRESHOLD = 3;

async function incrementKey(key: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(key);
    const next = parseInt(raw ?? "0", 10) + 1;
    await AsyncStorage.setItem(key, String(next));
    return next;
  } catch {
    return 0;
  }
}

async function getCount(key: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return parseInt(raw ?? "0", 10);
  } catch {
    return 0;
  }
}

async function getShouldShowPrompt(event: RatingTriggerEvent): Promise<boolean> {
  try {
    const [hasRated, lastPromptStr, appOpens, answeredCount, communityCount] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_HAS_RATED),
      AsyncStorage.getItem(STORAGE_KEY_LAST_PROMPT),
      getCount(STORAGE_KEY_APP_OPEN_COUNT),
      getCount(STORAGE_KEY_ANSWERED_COUNT),
      getCount(STORAGE_KEY_COMMUNITY_COUNT),
    ]);

    if (hasRated === "true") {
      console.log("[RatingPrompt] User has already rated, skipping.");
      return false;
    }

    if (lastPromptStr) {
      const daysSince =
        (Date.now() - new Date(lastPromptStr).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < MIN_DAYS_BETWEEN_PROMPTS) {
        console.log(`[RatingPrompt] Only ${Math.floor(daysSince)}d since last prompt, skipping.`);
        return false;
      }
    }

    const hasQualifyingEngagement =
      event === "answered_prayer" ||
      (event === "app_open" && appOpens >= APP_OPENS_THRESHOLD) ||
      (event === "community_engagement" && communityCount >= COMMUNITY_ENGAGEMENT_THRESHOLD);

    if (!hasQualifyingEngagement) {
      console.log(`[RatingPrompt] Event "${event}" – engagement thresholds not met. Opens:${appOpens} Answered:${answeredCount} Community:${communityCount}`);
      return false;
    }

    console.log(`[RatingPrompt] Showing prompt. Event: ${event}`);
    return true;
  } catch (e) {
    console.error("[RatingPrompt] Error checking eligibility:", e);
    return false;
  }
}

export async function recordAppOpen(): Promise<void> {
  await incrementKey(STORAGE_KEY_APP_OPEN_COUNT);
}

export async function recordAnsweredPrayer(): Promise<void> {
  await incrementKey(STORAGE_KEY_ANSWERED_COUNT);
}

export async function recordCommunityEngagement(): Promise<void> {
  await incrementKey(STORAGE_KEY_COMMUNITY_COUNT);
}

export async function markPromptShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_LAST_PROMPT, new Date().toISOString());
  } catch {
  }
}

export async function markAsRated(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_HAS_RATED, "true");
    console.log("[RatingPrompt] Marked as rated.");
  } catch {
  }
}

export async function getHasRated(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_HAS_RATED);
    return raw === "true";
  } catch {
    return false;
  }
}

export function useReviewPrompt() {
  const [showReview, setShowReview] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  useEffect(() => {
    getHasRated().then(setHasRated);
  }, []);

  const checkAndShowPrompt = useCallback(async (event: RatingTriggerEvent) => {
    const should = await getShouldShowPrompt(event);
    if (should) {
      await markPromptShown();
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
    await markAsRated();
    setHasRated(true);
    setShowReview(false);
  }, []);

  return {
    showReview,
    hasRated,
    checkAndShowPrompt,
    openReview,
    closeReview,
    handleReviewed,
  };
}

export async function incrementPrayersSent(): Promise<void> {
  await recordAppOpen();
}

export async function markReviewPromptShown(): Promise<void> {
  await markPromptShown();
}

export async function markAsReviewed(): Promise<void> {
  await markAsRated();
}
