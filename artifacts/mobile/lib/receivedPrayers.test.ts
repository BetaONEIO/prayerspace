import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadReceivedPrayer, loadReceivedPrayers, parseReceivedPrayer, parseReceivedPrayers, prayerAcknowledgementSchema } from "./receivedPrayers";

const id = "33333333-3333-4333-8333-333333333c33";
const prayer = {
  id, senderId: "", senderName: "Anonymous", senderAvatar: "", type: "text",
  content: "A test request", sentAt: "2026-10-11T12:00:00Z", prayerCount: 2,
  prayedByAvatars: [], hasPrayed: true, eventDate: null, eventTime: null,
  hasPrayerDate: false, status: "answered", imageUrl: null,
  updates: [{ id, content: "An update", createdAt: "2026-10-11T13:00:00Z" }],
};

function clientFor(data: unknown, accounts = ["owner", "owner"], error: unknown = null) {
  const calls: Array<{ name: string; args: unknown }> = [];
  let session = 0;
  return { calls, client: {
    auth: { getSession: async () => ({ data: { session: { user: { id: accounts[session++] } } }, error: null }) },
    rpc: async (name: string, args: unknown) => { calls.push({ name, args }); return { data, error }; },
  } as unknown as SupabaseClient };
}

test("real details preserve anonymous identity, status, updates and acknowledgements", () => {
  assert.deepEqual(parseReceivedPrayer(prayer), prayer);
  assert.equal(parseReceivedPrayer(null), null);
  assert.deepEqual(parseReceivedPrayers([]), []);
});
test("invalid or placeholder server responses fail instead of becoming sample details", () => {
  for (const bad of [[], {}, { ...prayer, id: "demo" }, { ...prayer, type: "voice" }, { ...prayer, prayerCount: -1 }]) {
    assert.throws(() => parseReceivedPrayer(bad));
  }
  assert.throws(() => parseReceivedPrayers(null));
});
test("detail fetch uses the exact request identifier", async () => {
  const mock = clientFor(prayer);
  assert.deepEqual(await loadReceivedPrayer(mock.client, id, "owner"), prayer);
  assert.deepEqual(mock.calls, [{ name: "get_received_prayer_details", args: { prayer_id: id } }]);
});
test("invalid deep links never reach the database", async () => {
  const mock = clientFor(prayer);
  await assert.rejects(loadReceivedPrayer(mock.client, "sample", "owner"));
  assert.equal(mock.calls.length, 0);
});
test("account changes before a fetch prevent the request", async () => {
  const mock = clientFor(prayer, ["other"]);
  await assert.rejects(loadReceivedPrayer(mock.client, id, "owner"), /Account changed/);
  assert.equal(mock.calls.length, 0);
});
test("account changes during a fetch cannot populate the old user's cache", async () => {
  const mock = clientFor(prayer, ["owner", "other"]);
  await assert.rejects(loadReceivedPrayer(mock.client, id, "owner"), /Account changed/);
});
test("inbox loads real rows and rejects database failures", async () => {
  assert.deepEqual(await loadReceivedPrayers(clientFor([prayer]).client, "owner"), [prayer]);
  await assert.rejects(loadReceivedPrayers(clientFor([], ["owner"], new Error("Offline")).client, "owner"), /Offline/);
});
test("acknowledgement requires the authoritative nonnegative count", () => {
  assert.deepEqual(prayerAcknowledgementSchema.parse({ hasPrayed: true, prayerCount: 1 }), { hasPrayed: true, prayerCount: 1 });
  assert.throws(() => prayerAcknowledgementSchema.parse({ hasPrayed: false, prayerCount: 1 }));
  assert.throws(() => prayerAcknowledgementSchema.parse({ hasPrayed: true, prayerCount: -1 }));
});
