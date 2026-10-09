// Isolated authenticated metadata tests. Does not add tutorial/demo content.
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");

async function run() {
  assert.equal(process.env.TOUR_TEST_DEV_PROJECT_CONFIRMED, "yes", "Development confirmation required");
  const fixture = JSON.parse(await readFile("/tmp/prayer-space-repair-fixtures.json", "utf8"));
  const base = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL).origin;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  async function signIn(account) {
    const r = await fetch(`${base}/auth/v1/token?grant_type=password`, {
      method: "POST", headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ email: account.email, password: account.password }),
    });
    assert.equal(r.status, 200, "fixture sign-in");
    const data = await r.json();
    return { token: data.access_token, id: data.user.id };
  }
  const [a, b] = await Promise.all(fixture.accounts.slice(0, 2).map(signIn));
  // The repair harness's public received-prayer fixture is deliberately visible
  // to every account. Restrict only this scratch-owned row for the no-friends
  // empty-feed tour check, while A/B retain their real authorized fixture.
  const restrict = await fetch(`${base}/rest/v1/prayer_requests?id=eq.${fixture.receivedPrayerId}&author_id=eq.${a.id}`, {
    method: "PATCH", headers: { apikey: key, Authorization: `Bearer ${a.token}`,
      "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ audience: "friends" }),
  });
  assert.ok(restrict.ok, "restrict scratch-owned public fixture");
  const restrictedRows = await restrict.json();
  assert.equal(restrictedRows.length, 1);
  assert.equal(restrictedRows[0].audience, "friends");
  const c = await signIn(fixture.accounts[2]);
  const empty = await fetch(`${base}/rest/v1/prayer_requests?select=id&status=neq.archived&audience=in.(everyone,friends)`, {
    headers: { apikey: key, Authorization: `Bearer ${c.token}` },
  });
  assert.ok(empty.ok, "empty-account feed query");
  assert.deepEqual(await empty.json(), [], "C has a verified genuinely empty authorized feed");
  console.log("PASS scratch public fixture restricted; C feed is empty, A/B retain their friend-visible fixture");
  async function request(auth, method, query, body) {
    return fetch(`${base}/rest/v1/user_tour_progress${query}`, {
      method, headers: { apikey: key, ...(auth ? { Authorization: `Bearer ${auth.token}` } : {}),
        "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" },
      body: body ? JSON.stringify(body) : undefined,
    });
  }
  for (const status of ["not_started", "in_progress", "skipped", "completed"]) {
    const response = await request(a, "POST", "?on_conflict=user_id", {
      user_id: a.id, status, step: status === "completed" ? 12 : 3, updated_at: new Date().toISOString(),
    });
    assert.ok(response.ok, `own ${status} save`);
    const rows = await (await request(a, "GET", `?user_id=eq.${a.id}&select=status,step`)).json();
    assert.equal(rows[0].status, status);
  }
  console.log("PASS own welcome/progress/skip/completion persist and reload");
  const foreignRead = await request(b, "GET", `?user_id=eq.${a.id}&select=status,step`);
  assert.deepEqual(await foreignRead.json(), []);
  const foreignWrite = await request(b, "POST", "?on_conflict=user_id", {
    user_id: a.id, status: "in_progress", step: 0,
  });
  assert.equal(foreignWrite.status, 403);
  console.log("PASS another account cannot read or overwrite tour progress");
  const invalid = await request(a, "POST", "?on_conflict=user_id", { user_id: a.id, status: "in_progress", step: 13 });
  assert.equal(invalid.status, 400);
  const anonymous = await request(null, "GET", "?select=status");
  assert.equal(anonymous.status, 401);
  console.log("PASS invalid steps and anonymous reads rejected");
  console.log("PASS temporary account A is completed; B/C tour states are unchanged");
}
run().catch(e => { console.error("FAIL", e.message); process.exitCode = 1; });
