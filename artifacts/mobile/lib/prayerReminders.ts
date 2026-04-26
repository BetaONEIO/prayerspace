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

// TODO: Integrate with Expo Notifications (expo-notifications) for push scheduling.
// When a user sets an eventDate on a prayer request, schedule a local notification
// for reminderDate (the day before) and optionally for the day of the event.
//
// Example flow (not yet implemented):
//
//   import * as Notifications from "expo-notifications";
//
//   async function schedulePrayerReminder(payload: PrayerReminderPayload) {
//     await Notifications.scheduleNotificationAsync({
//       content: {
//         title: `Prayer reminder for ${payload.senderName}`,
//         body: `"${payload.snippet}" — happening tomorrow`,
//         data: { prayerRequestId: payload.prayerRequestId },
//       },
//       trigger: {
//         date: new Date(payload.eventDate + "T08:00:00"),
//       },
//     });
//   }
//
// For server-side push (background reminders), the api-server can query
// prayer_requests where event_date = CURRENT_DATE + 1 and reminder_sent = false,
// then send via Expo's push API and mark reminder_sent = true.
//
// Required steps to enable:
//   1. pnpm --filter @workspace/mobile add expo-notifications
//   2. Register for push permissions in app startup (ask user once)
//   3. Handle notification tap to navigate to prayer-detail/[id]
//   4. Add cron job to api-server for server-side reminders
