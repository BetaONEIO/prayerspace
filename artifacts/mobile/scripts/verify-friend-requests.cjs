// Destructive development-only integration check. Creates three temporary
// auth users and removes every record it creates, even when an assertion fails.
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { createClient } = require("@supabase/supabase-js");

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
const pass = (label) => console.log(`PASS ${label}`);
function ok(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.code || "request failed"}`);
  return result.data;
}
function denied(result, label) {
  assert.ok(result.error, `${label}: unexpectedly succeeded`);
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
    email, password, email_confirm: true, user_metadata: { full_name: `Friend Flow ${label}` },
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
    denied(await b.api.rpc("cancel_friend_request", { request_id: first.id }), "non-sender cannot cancel");
    assert.equal((await pending(b.api, "receiver_id", b.id)).length, 1);

    ok(await b.api.rpc("respond_to_friend_request", { request_id: first.id, next_status: "accepted" }), "B accepts");
    assert.equal((await pending(a.api, "sender_id", a.id)).length, 0);
    assert.equal((await pending(b.api, "receiver_id", b.id)).length, 0);
    assert.equal((await friends(a.api, a.id, b.id)).length, 1);
    assert.equal((await friends(b.api, b.id, a.id)).length, 1);
    denied(await b.api.rpc("respond_to_friend_request", { request_id: first.id, next_status: "accepted" }), "second acceptance rejected");
    denied(await a.api.rpc("send_friend_request", { target_user_id: b.id }), "existing friends cannot be requested");
    pass("accept updates both friend lists, clears both pending lists, and is not repeatable");

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

    const cancelled = ok(await b.api.rpc("send_friend_request", { target_user_id: c.id }), "B sends C request");
    ok(await b.api.rpc("cancel_friend_request", { request_id: cancelled.id }), "B cancels C request");
    assert.equal((await pending(b.api, "sender_id", b.id)).length, 0);
    assert.equal((await pending(c.api, "receiver_id", c.id)).length, 0);
    pass("cancel clears both request lists");

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
  } finally {
    await cleanup();
  }
}

run().catch((error) => {
  console.error("FAIL", error.message);
  process.exitCode = 1;
});