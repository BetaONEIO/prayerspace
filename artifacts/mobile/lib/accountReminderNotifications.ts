import { Platform } from "react-native";
import Constants from "expo-constants";
import type { NotificationRequestInput } from "expo-notifications";
import { assertLocalDataIdentity, getLocalDataIdentity, type LocalDataIdentity } from "./accountLocalData";
import { isForeignPrayerReminder, scheduleWithAccountGuard } from "./accountReminderPrivacy";

function available() {
  return Platform.OS !== "web" && Constants.appOwnership !== "expo";
}

let cleanup: Promise<void> = Promise.resolve();

export function synchronizeAccountReminders(): Promise<void> {
  if (!available()) return Promise.resolve();
  cleanup = cleanup.catch(() => undefined).then(async () => {
    const notifications = await import("expo-notifications");
    const scheduled = await notifications.getAllScheduledNotificationsAsync();
    for (const request of scheduled) {
      if (isForeignPrayerReminder(request, getLocalDataIdentity().userId)) {
        await notifications.cancelScheduledNotificationAsync(request.identifier);
      }
    }
    const presented = await notifications.getPresentedNotificationsAsync();
    for (const notification of presented) {
      if (isForeignPrayerReminder(notification.request, getLocalDataIdentity().userId)) {
        await notifications.dismissNotificationAsync(notification.request.identifier);
      }
    }
  });
  return cleanup;
}

export async function scheduleAccountReminder(
  owner: LocalDataIdentity,
  request: NotificationRequestInput,
): Promise<string | null> {
  if (!available()) return null;
  await cleanup.catch(() => synchronizeAccountReminders());
  const notifications = await import("expo-notifications");
  return scheduleWithAccountGuard(notifications, owner, {
    ...request,
    content: {
      ...request.content,
      // Never put journal text, names or prayer snippets on a shared lockscreen.
      title: "Prayer Space reminder",
      body: "Open Prayer Space to view your reminder.",
      data: { ...request.content?.data, prayerSpaceUserId: owner.userId },
    },
  });
}

export async function currentAccountReminderIds(owner: LocalDataIdentity): Promise<Set<string> | null> {
  if (!available()) return null;
  await cleanup.catch(() => synchronizeAccountReminders());
  assertLocalDataIdentity(owner);
  const notifications = await import("expo-notifications");
  const scheduled = await notifications.getAllScheduledNotificationsAsync();
  assertLocalDataIdentity(owner);
  return new Set(scheduled
    .filter(request => request.content.data.prayerSpaceUserId === owner.userId)
    .map(request => request.identifier));
}
