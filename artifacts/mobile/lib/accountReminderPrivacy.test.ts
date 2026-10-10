import assert from "node:assert/strict";
import { test } from "node:test";
import { setLocalDataIdentity } from "./accountLocalData";
import { isForeignPrayerReminder, scheduleWithAccountGuard } from "./accountReminderPrivacy";

test("foreign/legacy reminders are removed, current-account and unrelated reminders are kept", () => {
  const owned = (userId: string) => ({ identifier: "journal-reminder", content: { data: { prayerSpaceUserId: userId } } });
  assert.equal(isForeignPrayerReminder(owned("a"), "a"), false);
  assert.equal(isForeignPrayerReminder(owned("a"), "b"), true);
  assert.equal(isForeignPrayerReminder(owned("a"), null), true);
  assert.equal(isForeignPrayerReminder({ identifier: "prayer_reminder_old_day_of", content: {} }, "a"), true);
  assert.equal(isForeignPrayerReminder({ identifier: "legacy", content: { title: "Time to pray" } }, "a"), true);
  assert.equal(isForeignPrayerReminder({ identifier: "other", content: { title: "Unrelated notification" } }, "a"), false);
});

test("a stale account cannot start a notification schedule", async () => {
  const a = { ...setLocalDataIdentity("a") };
  setLocalDataIdentity("b");
  let scheduled = false;
  const result = await scheduleWithAccountGuard({
    scheduleNotificationAsync: async () => { scheduled = true; return "id"; },
    cancelScheduledNotificationAsync: async () => {},
  }, a, {});
  assert.equal(result, null);
  assert.equal(scheduled, false);
});

test("a schedule finishing after logout is cancelled immediately", async () => {
  const owner = { ...setLocalDataIdentity("a") };
  let release!: (id: string) => void;
  const cancelled: string[] = [];
  const result = scheduleWithAccountGuard({
    scheduleNotificationAsync: () => new Promise<string>(resolve => { release = resolve; }),
    cancelScheduledNotificationAsync: async id => { cancelled.push(id); },
  }, owner, {});
  setLocalDataIdentity(null);
  release("late-notification");
  assert.equal(await result, null);
  assert.deepEqual(cancelled, ["late-notification"]);
});

test("active schedules remain intact; failed native cancellation is not silently ignored", async () => {
  const owner = { ...setLocalDataIdentity("a") };
  const live = await scheduleWithAccountGuard({
    scheduleNotificationAsync: async () => "live",
    cancelScheduledNotificationAsync: async () => { throw new Error("Should not cancel"); },
  }, owner, {});
  assert.equal(live, "live");
  const old = { ...setLocalDataIdentity("a") };
  await assert.rejects(scheduleWithAccountGuard({
    scheduleNotificationAsync: async () => { setLocalDataIdentity("b"); return "late"; },
    cancelScheduledNotificationAsync: async () => { throw new Error("Native cancellation failed"); },
  }, old, {}), /Native cancellation failed/);
});
