import { getLocalDataIdentity, type LocalDataIdentity } from "./accountLocalData";

export interface ReminderRequest {
  identifier: string;
  content: {
    title?: string | null;
    data?: Record<string, unknown>;
  };
}

export function isForeignPrayerReminder(request: ReminderRequest, userId: string | null): boolean {
  const owner = request.content.data?.prayerSpaceUserId;
  if (typeof owner === "string") return !userId || owner !== userId;
  // Earlier releases did not label ownership. Never assign those reminders to
  // whichever account happens to sign in on this device.
  return request.identifier.startsWith("prayer_reminder_") ||
    request.content.title === "Time to pray" ||
    !!request.content.data?.prayerRequestId;
}

export async function scheduleWithAccountGuard<T>(
  adapter: {
    scheduleNotificationAsync(request: T): Promise<string>;
    cancelScheduledNotificationAsync(identifier: string): Promise<void>;
  },
  owner: LocalDataIdentity,
  request: T,
): Promise<string | null> {
  const isActive = () => {
    const current = getLocalDataIdentity();
    return !!owner.userId && current.userId === owner.userId && current.epoch === owner.epoch;
  };
  if (!isActive()) return null;
  const id = await adapter.scheduleNotificationAsync(request);
  if (!isActive()) {
    await adapter.cancelScheduledNotificationAsync(id);
    return null;
  }
  return id;
}
