// Destructive development-only integration check. Creates three temporary
// auth users and removes every record it creates, even when an assertion fails.
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");
const { readFile, writeFile, unlink } = require("node:fs/promises");

if (process.env.FRIEND_TEST_DEV_PROJECT_CONFIRMED !== "yes") {
  throw new Error("Set FRIEND_TEST_DEV_PROJECT_CONFIRMED=yes only for a confirmed development project.");
}

const url = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL).origin;
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!anon || !service) throw new Error("Supabase runtime secrets are missing.");

const options = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
const admin = createClient(url, service, options);
const client = () => createClient(url, anon, options);
const suffix = randomBytes(10).toString("hex");
const accounts = [];
const postIds = [];
const conversationIds = [];
const communityIds = [];
const fixturePath = "/tmp/prayer-space-repair-fixtures.json";
const pass = (label) => console.log(`PASS ${label}`);
function ok(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.code || "request failed"}`);
  return result.data;
}
function denied(result, label) {
  assert.ok(result.error, `${label}: unexpectedly succeeded`);
  assert.notEqual(result.error.code, "PGRST202", `${label}: RPC is missing from live database`);
  pass(label);
}
async function pending(actor, ownerColumn, ownerId) {
  return ok(
    await actor.from("friend_requests").select("id, sender_id, receiver_id, status")
      .eq(ownerColumn, ownerId).eq("status", "pending"),
    "read pending requests",
  );
}
async function friends(actor, id, otherId) {
  const rows = ok(
    await actor.from("friend_requests").select("sender_id, receiver_id, status")
      .eq("status", "accepted").or(`sender_id.eq.${id},receiver_id.eq.${id}`),
    "read friendships",
  );
  return rows.filter((row) => row.sender_id === otherId || row.receiver_id === otherId);
}
async function makeAccount(label) {
  const email = `friend-flow-${suffix}-${label.toLowerCase()}@example.invalid`;
  const password = randomBytes(24).toString("hex");
  const created = ok(await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: `Friend Flow ${label}`, date_of_birth: "1990-01-01" },
  }), "create temporary auth account");
  const account = { id: created.user.id, email, password, api: client() };
  accounts.push(account);
  ok(await admin.from("profiles").upsert({
    id: account.id, full_name: `Friend Flow ${label}`, updated_at: new Date().toISOString(),
  }), "create temporary profile");
  ok(await account.api.auth.signInWithPassword({ email, password }), "sign into temporary account");
  return account;
}
async function cleanup() {
  const ids = accounts.map((account) => account.id);
  const issues = [];
  for (const id of conversationIds) {
    const messages = await admin.from("messages").select("id").eq("conversation_id", id);
    if (messages.error) issues.push(`messages:${messages.error.code}`);
    for (const message of messages.data ?? []) {
      const result = await admin.from("message_reactions").delete().eq("message_id", message.id);
      if (result.error) issues.push(`reactions:${result.error.code}`);
    }
    for (const table of ["messages", "conversation_participants", "conversations"]) {
      const result = await admin.from(table).delete().eq(table === "conversations" ? "id" : "conversation_id", id);
      if (result.error) issues.push(`${table}:${result.error.code}`);
    }
  }
  for (const id of ids) {
    const result = await admin.from("communities").delete().eq("owner_id", id);
    if (result.error) issues.push(`communities:${result.error.code}`);
  }
  for (const id of postIds) {
    const result = await admin.from("prayer_requests").delete().eq("id", id);
    if (result.error) issues.push(`post:${result.error.code}`);
  }
  for (const id of ids) {
    for (const [table, column] of [
      ["notifications", "recipient_id"], ["notifications", "actor_id"],
      ["blocked_users", "blocker_id"], ["blocked_users", "blocked_id"],
      ["friend_requests", "sender_id"], ["friend_requests", "receiver_id"],
    ]) {
      const result = await admin.from(table).delete().eq(column, id);
      if (result.error) issues.push(`${table}:${result.error.code}`);
    }
    const profile = await admin.from("profiles").delete().eq("id", id);
    if (profile.error) issues.push(`profile:${profile.error.code}`);
    const deleted = await admin.auth.admin.deleteUser(id);
    if (deleted.error) issues.push(`auth:${deleted.error.code || "error"}`);
  }
  if (issues.length) console.error("Cleanup needs manual review:", issues.join(", "));
  else pass("temporary records and accounts cleaned up");
}

async function run() {
  if (process.argv.includes("--cleanup-fixtures")) {
    const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
    accounts.push(...fixture.accounts);
    postIds.push(...fixture.postIds);
    conversationIds.push(...fixture.conversationIds);
    await cleanup();
    await unlink(fixturePath);
    return;
  }
  let keep = false;
  try {
    const [a, b, c] = await Promise.all(["A", "B", "C"].map(makeAccount));
    pass("three real authenticated development accounts and profiles created");
    const found = ok(
      await a.api.from("profiles").select("id, full_name, avatar_url")
        .ilike("full_name", `%Friend Flow B%`).neq("id", a.id),
      "Find Friends search",
    );
    assert.ok(found.some((row) => row.id === b.id && row.full_name === "Friend Flow B"));
    pass("A finds B's actual profile ID");

    const first = ok(await a.api.rpc("send_friend_request", { target_user_id: b.id }), "A sends B request");
    assert.equal(first.sender_id, a.id);
    assert.equal(first.receiver_id, b.id);
    assert.equal(first.status, "pending");
    assert.equal((await pending(a.api, "sender_id", a.id)).length, 1);
    assert.equal((await pending(b.api, "receiver_id", b.id)).length, 1);
    assert.equal((await pending(c.api, "receiver_id", b.id)).length, 0);
    pass("request persisted, A sees sent, B receives incoming, C cannot read it");

    const notices = ok(await b.api.from("notifications")
      .select("id, type").eq("recipient_id", b.id).eq("request_id", first.id), "read notification");
    assert.ok(notices.some((row) => row.type === "friend_request"));
    pass("B receives separate friend-request notification");
    ok(await b.api.from("notifications").delete().eq("id", notices[0].id), "dismiss notification");
    assert.equal((await pending(b.api, "receiver_id", b.id)).length, 1);
    pass("dismissing notification leaves actual request intact");

    denied(await a.api.rpc("send_friend_request", { target_user_id: b.id }), "duplicate request rejected");
    denied(await b.api.rpc("send_friend_request", { target_user_id: a.id }), "crossed request rejected");
    denied(await c.api.rpc("respond_to_friend_request", { request_id: first.id, next_status: "accepted" }), "non-recipient cannot accept");
    assert.equal((await pending(b.api, "receiver_id", b.id)).length, 1);

    ok(await b.api.rpc("respond_to_friend_request", { request_id: first.id, next_status: "accepted" }), "B accepts");
    const acceptedNotices = ok(await a.api.from("notifications")
      .select("id, type").eq("recipient_id", a.id).eq("request_id", first.id), "read acceptance notification");
    assert.ok(acceptedNotices.some((row) => row.type === "friend_request_accepted"));
    assert.equal((await pending(a.api, "sender_id", a.id)).length, 0);
    assert.equal((await pending(b.api, "receiver_id", b.id)).length, 0);
    assert.equal((await friends(a.api, a.id, b.id)).length, 1);
    assert.equal((await friends(b.api, b.id, a.id)).length, 1);
    denied(await b.api.rpc("respond_to_friend_request", { request_id: first.id, next_status: "accepted" }), "second acceptance rejected");
    denied(await a.api.rpc("send_friend_request", { target_user_id: b.id }), "existing friends cannot be requested");
    pass("accept updates both friend lists, notifies sender, clears pending lists, and is not repeatable");

    ok(await a.api.rpc("remove_friend", { target_user_id: b.id }), "remove A-B friendship for reverse test");
    const reverse = ok(await b.api.rpc("send_friend_request", { target_user_id: a.id }), "B sends A request");
    assert.equal((await pending(a.api, "receiver_id", a.id)).length, 1);
    ok(await a.api.rpc("respond_to_friend_request", { request_id: reverse.id, next_status: "accepted" }), "A accepts reverse request");
    assert.equal((await friends(a.api, a.id, b.id)).length, 1);
    assert.equal((await friends(b.api, b.id, a.id)).length, 1);
    pass("reverse-direction request and acceptance establish friendship");

    const freshA = client();
    const freshB = client();
    ok(await freshA.auth.signInWithPassword({ email: a.email, password: a.password }), "A fresh sign-in");
    ok(await freshB.auth.signInWithPassword({ email: b.email, password: b.password }), "B fresh sign-in");
    assert.equal((await friends(freshA, a.id, b.id)).length, 1);
    assert.equal((await friends(freshB, b.id, a.id)).length, 1);
    pass("friendship persists across fresh sessions for both accounts");

    const post = ok(await a.api.from("prayer_requests").insert({
      author_id: a.id, content: `Friend flow verification ${suffix}`,
      audience: "friends", tags: [], is_anonymous: false, is_time_sensitive: false,
    }).select("id").single(), "create friends-only test activity");
    postIds.push(post.id);
    assert.equal(ok(await b.api.from("prayer_requests").select("id").eq("id", post.id), "friend reads post").length, 1);
    assert.equal(ok(await c.api.from("prayer_requests").select("id").eq("id", post.id), "stranger reads post").length, 0);
    pass("friend can read friends-only activity; stranger cannot");

    const declined = ok(await c.api.rpc("send_friend_request", { target_user_id: a.id }), "C sends A request");
    ok(await a.api.rpc("respond_to_friend_request", { request_id: declined.id, next_status: "declined" }), "A declines C");
    assert.equal((await pending(c.api, "sender_id", c.id)).length, 0);
    assert.equal((await pending(a.api, "receiver_id", a.id)).length, 0);
    assert.equal((await friends(a.api, a.id, c.id)).length, 0);
    pass("decline clears both request lists without friendship");

    const crossing = await Promise.all([
      a.api.rpc("send_friend_request", { target_user_id: c.id }),
      c.api.rpc("send_friend_request", { target_user_id: a.id }),
    ]);
    assert.equal(crossing.filter((result) => !result.error).length, 1);
    const aC = (await pending(a.api, "sender_id", a.id)).filter((row) => row.receiver_id === c.id);
    const cA = (await pending(c.api, "sender_id", c.id)).filter((row) => row.receiver_id === a.id);
    assert.equal(aC.length + cA.length, 1);
    pass("simultaneous crossed requests result in exactly one pending row");
    const winner = crossing.find((result) => !result.error).data;
    const receiver = winner.receiver_id === a.id ? a : c;
    ok(await receiver.api.rpc("respond_to_friend_request", { request_id: winner.id, next_status: "declined" }), "resolve crossed test request");

    ok(await b.api.rpc("block_user", { target_user_id: c.id }), "B blocks C");
    denied(await b.api.rpc("send_friend_request", { target_user_id: c.id }), "blocker cannot request blocked user");
    denied(await c.api.rpc("send_friend_request", { target_user_id: b.id }), "blocked user cannot request blocker");
    denied(await a.api.rpc("send_friend_request", { target_user_id: a.id }), "self-request rejected");
    pass("blocked users and self-requests rejected server-side");

    denied(await a.api.from("friend_requests").insert({
      sender_id: b.id, receiver_id: c.id, status: "pending",
    }), "direct sender impersonation rejected");
    pass("authenticated client cannot bypass relationship RPC");

    // Keep this last so a missing live RPC does not hide the independent checks.
    const cancelled = ok(await a.api.rpc("send_friend_request", { target_user_id: c.id }), "A sends C request for cancellation");
    denied(await c.api.rpc("cancel_friend_request", { request_id: cancelled.id }), "non-sender cannot cancel");
    ok(await a.api.rpc("cancel_friend_request", { request_id: cancelled.id }), "A cancels C request");
    assert.equal((await pending(a.api, "sender_id", a.id)).length, 0);
    assert.equal((await pending(c.api, "receiver_id", c.id)).length, 0);
    pass("cancel clears both request lists");

    ok(await b.api.rpc("unblock_user", { target_user_id: c.id }), "B unblocks C");
    const afterUnblock = ok(await b.api.rpc("send_friend_request", { target_user_id: c.id }), "B requests C after unblock");
    assert.equal((await pending(c.api, "receiver_id", c.id)).filter((row) => row.id === afterUnblock.id).length, 1);
    ok(await c.api.rpc("respond_to_friend_request", { request_id: afterUnblock.id, next_status: "declined" }), "C declines post-unblock request");
    pass("unblock restores connection eligibility");
    if (!(await friends(a.api, a.id, b.id)).length) {
      const request = ok(await a.api.rpc("send_friend_request", { target_user_id: b.id }), "friendship for chat");
      ok(await b.api.rpc("respond_to_friend_request", { request_id: request.id, next_status: "accepted" }), "accept for chat");
    }
    const chat = ok(await a.api.rpc("get_or_create_dm", { target_user_id: b.id }), "create secured DM");
    conversationIds.push(chat);
    assert.equal(ok(await b.api.rpc("get_or_create_dm", { target_user_id: a.id }), "reuse secured DM"), chat);
    denied(await c.api.rpc("get_or_create_dm", { target_user_id: a.id }), "non-friend cannot create a DM");
    denied(await c.api.from("conversation_participants").insert({ conversation_id: chat, user_id: c.id }), "outsider cannot self-enrol");
    assert.equal(ok(await c.api.from("conversation_participants").select("*").eq("conversation_id", chat), "outsider roster read").length, 0);
    const message = ok(await a.api.from("messages").insert({
      conversation_id: chat, sender_id: a.id, content: "Isolated chat verification", type: "text",
    }).select().single(), "send persisted message");
    const read = ok(await b.api.from("messages").select("*,message_reactions(*)").eq("id", message.id), "recipient message read");
    assert.equal(read[0]?.content, "Isolated chat verification");
    assert.equal(ok(await c.api.from("messages").select("id").eq("id", message.id), "outsider message read").length, 0);
    denied(await b.api.from("messages").update({ sender_id: b.id }).eq("id", message.id), "message identity is immutable");
    ok(await b.api.from("message_reactions").insert({ message_id: message.id, user_id: b.id, reaction_type: "amen" }), "recipient reaction");
    ok(await a.api.rpc("block_user", { target_user_id: b.id }), "block chat");
    denied(await b.api.from("messages").insert({ conversation_id: chat, sender_id: b.id, content: "Blocked", type: "text" }), "blocked sender denied by database");
    ok(await a.api.rpc("unblock_user", { target_user_id: b.id }), "unblock chat");
    // Blocking may end friendship; do not silently recreate it for the test.
    ok(await admin.from("messages").update({ created_at: new Date(Date.now()-16*60000).toISOString() }).eq("id", message.id), "age message fixture");
    denied(await a.api.from("messages").update({ deleted_for_everyone: true }).eq("id", message.id), "database enforces delete deadline");
    pass("secured DM creation, persisted message read, reactions, outsider denial and block/time enforcement");

    const community = ok(await a.api.rpc("create_prayer_community", {
      community_name: `Repair test ${suffix}`, community_description: "Isolated description",
      community_location: "Test location", community_denomination: "Test denomination",
    }), "persist community");
    communityIds.push(community);
    ok(await b.api.rpc("join_prayer_community", { community }), "join public community");
    ok(await b.api.rpc("join_prayer_community", { community }), "idempotent join");
    const own = ok(await a.api.rpc("get_my_communities"), "owner membership reload").find((row) => row.id === community);
    assert.equal(own?.member_count, 2);
    assert.equal(own?.description, "Isolated description");
    assert.equal(own?.location, "Test location");
    assert.ok(ok(await b.api.rpc("get_my_communities"), "member membership reload").some((row) => row.id === community));
    denied(await c.api.from("community_members").insert({ community_id: community, user_id: c.id, role: "owner" }), "ownership cannot be forged");
    ok(await admin.from("communities").update({ is_private: true }).eq("id", community), "private fixture");
    denied(await c.api.rpc("join_prayer_community", { community }), "private join requires invitation");
    assert.equal(ok(await c.api.from("communities").select("id").eq("id", community), "private catalogue query").length, 0);
    pass("community creation/details, durable owner/member reload, idempotent counts and private/ownership protection");

    const received = ok(await a.api.from("prayer_requests").insert({
      author_id: a.id, content: "Isolated received prayer verification", is_anonymous: true, audience: "everyone",
    }).select("id").single(), "received prayer fixture");
    postIds.push(received.id);
    const details = ok(await b.api.rpc("get_received_prayer_details", { prayer_id: received.id }), "received details");
    assert.equal(details?.content, "Isolated received prayer verification");
    assert.equal(details?.senderName, "Anonymous");
    assert.equal(details?.senderId, "");
    pass("received prayer uses real content without returning anonymous sender identity");
    if (process.argv.includes("--keep-ui-fixtures")) {
      if (!(await friends(a.api, a.id, b.id)).length) {
        const request = ok(await a.api.rpc("send_friend_request", { target_user_id: b.id }), "restore fixture friendship for browser");
        ok(await b.api.rpc("respond_to_friend_request", { request_id: request.id, next_status: "accepted" }), "accept fixture friendship for browser");
      }
      await writeFile(fixturePath, JSON.stringify({
        accounts: [a,b,c].map(({ id,email,password }) => ({ id,email,password })),
        postIds, conversationIds, communityIds, receivedPrayerId: received.id,
      }), { mode: 0o600 });
      keep = true;
      pass("isolated UI fixtures saved securely for the single browser pass");
    }
  } finally {
    if (!keep) await cleanup();
  }
}

run().catch((error) => {
  console.error("FAIL", error.message);
  process.exitCode = 1;
});