import type { PrayerStatus } from "@/mocks/data";
import { isDatePassed, reminderDateFor, daysUntil } from "./prayerDateUtils";

export interface ScheduledReminder {
  prayerRequestId: string;
  eventDate: string;
  reminderDate: string;
  userId: string;
  type: "day_before" | "day_of";
}

export interface PrayerReminderPayload {
  prayerRequestId: string;
  senderName: string;
  snippet: string;
  eventDate: string;
}

export function shouldShowFollowUpPrompt(
  eventDate: string | null | undefined,
  status: PrayerStatus | undefined,
  followUpPromptShown: boolean | undefined
): boolean {
  if (!eventDate) return false;
  if (followUpPromptShown) return false;
  if (status === "answered" || status === "archived") return false;
  return isDatePassed(eventDate);
}

export function shouldShowReminderBadge(
  eventDate: string | null | undefined
): boolean {
  if (!eventDate) return false;
  const days = daysUntil(eventDate);
  return days === 0 || days === 1;
}

export function buildReminderPayload(
  prayerRequestId: string,
  eventDate: string,
  senderName: string,
  snippet: string
): ScheduledReminder | null {
  const reminderDate = reminderDateFor(eventDate);
  if (!reminderDate) return null;
  return {
    prayerRequestId,
    eventDate,
    reminderDate,
    userId: "",
    type: daysUntil(eventDate) === 0 ? "day_of" : "day_before",
  };
}

function notifIdFor(prayerRequestId: string, type: "day_before" | "day_of"): string {
  return `prayer_reminder_${prayerRequestId}_${type}`;
}

function triggerAt9am(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  const t = new Date(y, m - 1, d, 9, 0, 0, 0);
  return t;
}

export async function scheduleReceivedPrayerReminders(
  payload: PrayerReminderPayload
): Promise<void> {
  let Notifications: typeof import("expo-notifications") | null = null;
  try {
    Notifications = await import("expo-notifications");
  } catch {
    return;
  }

  const { prayerRequestId, senderName, snippet, eventDate } = payload;
  const firstName = senderName.split(" ")[0];
  const days = daysUntil(eventDate);

  if (isNaN(days) || days < 0) return;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return;

  await Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const dayOfDate = eventDate;
  const dayBeforeDate = reminderDateFor(eventDate);

  if (days >= 2 && dayBeforeDate) {
    const triggerDate = triggerAt9am(dayBeforeDate);
    if (triggerDate > new Date()) {
      await Notifications.scheduleNotificationAsync({
        identifier: notifIdFor(prayerRequestId, "day_before"),
        content: {
          title: `Tomorrow is the day for ${firstName}`,
          body: `Remember to pray for them: "${snippet.slice(0, 80)}${snippet.length > 80 ? "…" : ""}"`,
          data: { prayerRequestId, screen: "received-prayer" },
        },
        trigger: triggerDate,
      });
    }
  }

  if (days === 1) {
    const triggerDate = triggerAt9am(eventDate);
    if (triggerDate > new Date()) {
      await Notifications.scheduleNotificationAsync({
        identifier: notifIdFor(prayerRequestId, "day_before"),
        content: {
          title: `Tomorrow is ${firstName}'s big day`,
          body: `Hold them in prayer — it's happening tomorrow.`,
          data: { prayerRequestId, screen: "received-prayer" },
        },
        trigger: { seconds: 10 },
      });
    }
  }

  if (days >= 1) {
    const triggerDate = triggerAt9am(dayOfDate);
    if (triggerDate > new Date()) {
      await Notifications.scheduleNotificationAsync({
        identifier: notifIdFor(prayerRequestId, "day_of"),
        content: {
          title: `Today is the day for ${firstName} 🙏`,
          body: `${firstName} needs your prayers today. Lift them up.`,
          data: { prayerRequestId, screen: "received-prayer" },
        },
        trigger: triggerDate,
      });
    }
  }

  if (days === 0) {
    await Notifications.scheduleNotificationAsync({
      identifier: notifIdFor(prayerRequestId, "day_of"),
      content: {
        title: `Pray for ${firstName} today 🙏`,
        body: `Today is the day — ${firstName} is counting on your prayers.`,
        data: { prayerRequestId, screen: "received-prayer" },
      },
      trigger: { seconds: 30 },
    });
  }
}

export async function cancelPrayerReminders(prayerRequestId: string): Promise<void> {
  let Notifications: typeof import("expo-notifications") | null = null;
  try {
    Notifications = await import("expo-notifications");
  } catch {
    return;
  }
  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(notifIdFor(prayerRequestId, "day_before")).catch(() => {}),
    Notifications.cancelScheduledNotificationAsync(notifIdFor(prayerRequestId, "day_of")).catch(() => {}),
  ]);
}
