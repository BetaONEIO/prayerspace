import test from "node:test";
import assert from "node:assert/strict";
import { groupChatSchema, groupMessages, groupRpc, groupIdResult, newGroupClientId } from "./groupChat";
import type { SupabaseClient } from "@supabase/supabase-js";

const userId = "a1100000-0000-4000-8000-000000000001";
const otherId = "a1100000-0000-4000-8000-000000000002";
const groupId = "a1200000-0000-4000-8000-000000000001";
const date = "2026-10-12T12:00:00+00:00";
const raw = {
  id: groupId, name: "Fixture group", canSend: true, settings: {}, members: [],
  messages: [{
    id: "a1300000-0000-4000-8000-000000000001", senderId: otherId, senderName: "Someone",
    senderAvatar: "", content: "Saved message", createdAt: date, prayerContent: null, reply: null,
    reactions: [{ id: "a1500000-0000-4000-8000-000000000001", userId, userName: "You", userAvatar: "", type: "support", createdAt: date }],
  }],
};
test("real sender and reaction ownership are not hardcoded to me", () => {
  const messages = groupMessages(groupChatSchema.parse(raw), userId);
  assert.equal(messages[0].isOwn, false);
  assert.equal(messages[0].reactions[0].userId, userId);
  assert.equal(messages[0].reactions[0].isMine, true);
  assert.equal(messages[0].reactions[0].emoji, "❤️");
});
test("legacy missing metadata defaults do not confer administrative roles", () => {
  const parsed = groupChatSchema.parse(raw);
  assert.equal(parsed.settings.private, true);
  assert.equal(parsed.members.length, 0);
});
test("malformed server records fail instead of silently appearing as empty chat", () => {
  assert.throws(() => groupChatSchema.parse({ ...raw, messages: [{ content: "Invalid" }] }));
});
test("all supported reaction meanings survive mapping", () => {
  for (const type of ["pray", "amen", "support"]) {
    const message = structuredClone(raw.messages[0]);
    message.reactions[0].type = type;
    const reaction = groupMessages(groupChatSchema.parse({ ...raw, messages: [message] }), userId)[0].reactions[0];
    assert.equal(type === "pray" ? reaction.type : reaction.emoji, type === "pray" ? "pray" : type === "amen" ? "🕊️" : "❤️");
  }
});
test("operation identifiers are UUIDs and remain distinct", () => {
  const ids = Array.from({ length: 1000 }, newGroupClientId);
  ids.forEach(id => groupIdResult.parse(id));
  assert.equal(new Set(ids).size, ids.length);
});
test("RPC identity is checked before issuing a mutation", async () => {
  let called = false;
  const client = { auth: { getSession: async () => ({ data: { session: { user: { id: otherId } } }, error: null }) },
    rpc: async () => { called = true; return { data: groupId, error: null }; } } as unknown as SupabaseClient;
  await assert.rejects(groupRpc(client, userId, "create_prayer_chat_group", {}, groupIdResult), /Account changed/);
  assert.equal(called, false);
});
test("account transition after the server response rejects obsolete results", async () => {
  let account = userId;
  const client = { auth: { getSession: async () => ({ data: { session: { user: { id: account } } }, error: null }) },
    rpc: async () => { account = otherId; return { data: groupId, error: null }; } } as unknown as SupabaseClient;
  await assert.rejects(groupRpc(client, userId, "create_prayer_chat_group", {}, groupIdResult), /Account changed/);
});
