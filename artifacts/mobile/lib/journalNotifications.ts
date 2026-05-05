import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

type Frequency = "everyday" | "weekdays" | "weekends" | "once";

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

export async function scheduleJournalReminder(params: {
  entryTitle: string;
  hour: number;
  minute: number;
  frequency: Frequency;
  existingNotificationIds?: string[];
}): Promise<string[]> {
  if (Platform.OS === "web") return [];
  try {
    if (params.existingNotificationIds?.length) {
      for (const id of params.existingNotificationIds) {
        await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      }
    }

    const granted = await requestNotificationPermissions();
    if (!granted) return [];

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    const content = {
      title: "Time to pray",
      body: `Praying for: ${params.entryTitle}`,
      sound: true,
    };

    const ids: string[] = [];

    if (params.frequency === "everyday") {
      const id = await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: params.hour,
          minute: params.minute,
          repeats: true,
        },
      });
      ids.push(id);
    } else if (params.frequency === "once") {
      const target = new Date();
      target.setHours(params.hour, params.minute, 0, 0);
      if (target <= new Date()) target.setDate(target.getDate() + 1);
      const id = await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: target,
        },
      });
      ids.push(id);
    } else if (params.frequency === "weekdays") {
      for (const weekday of [2, 3, 4, 5, 6] as const) {
        const id = await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            weekday,
            hour: params.hour,
            minute: params.minute,
            repeats: true,
          },
        });
        ids.push(id);
      }
    } else if (params.frequency === "weekends") {
      for (const weekday of [1, 7] as const) {
        const id = await Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
            weekday,
            hour: params.hour,
            minute: params.minute,
            repeats: true,
          },
        });
        ids.push(id);
      }
    }

    console.log("[JournalNotifications] Scheduled", ids.length, "notification(s) for:", params.entryTitle);
    return ids;
  } catch (e) {
    console.log("[JournalNotifications] Scheduling failed:", e);
    return [];
  }
}

export async function cancelJournalReminder(notificationIds: string[]): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    for (const id of notificationIds) {
      await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    }
    console.log("[JournalNotifications] Cancelled", notificationIds.length, "notification(s)");
  } catch (e) {
    console.log("[JournalNotifications] Cancel failed:", e);
  }
}
