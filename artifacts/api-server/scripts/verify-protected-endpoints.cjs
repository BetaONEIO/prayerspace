// Uses only temporary fixtures created by the guarded integration test.
// Does not upload usable audio, make purchases or delete any account.
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");

async function run() {
  if (process.env.API_TEST_DEV_PROJECT_CONFIRMED !== "yes") throw new Error("Development confirmation required");
  const fixture = JSON.parse(await readFile("/tmp/prayer-space-repair-fixtures.json", "utf8"));
  const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
  async function signIn(account) {
    const url = new URL("/auth/v1/token?grant_type=password", new URL(process.env.EXPO_PUBLIC_SUPABASE_URL).origin);
    const response = await fetch(url, {
      method: "POST",
      headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email: account.email, password: account.password }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Fixture sign-in failed");
    const data = await response.json();
    if (!data.access_token) throw new Error("Fixture session missing");
    return data.access_token;
  }
  const [owner, outsider] = await Promise.all([signIn(fixture.accounts[0]), signIn(fixture.accounts[2])]);
  async function check(path, status, { token, body, method = "GET" } = {}) {
    const response = await fetch(base + path, {
      method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    assert.equal(response.status, status, `${method} ${path}`);
    console.log(`PASS ${method} ${path.split("?")[0]} HTTP ${status}`);
    return response;
  }
  await check("/api/healthz", 200);
  await check("/api/admin/delete-users", 410, { method: "POST" });
  await check("/api/transcribe", 401, { method: "POST", body: {} });
  await check("/api/transcribe", 401, { method: "POST", token: "invalid-fixture-token", body: {} });
  await check("/api/transcribe", 400, { method: "POST", token: owner, body: {} });
  await check("/api/transcribe", 400, { method: "POST", token: owner, body: { audioBase64: "!!!=", mimeType: "audio/m4a" } });
  await check("/api/transcribe", 400, { method: "POST", token: owner, body: { audioBase64: "UklGRg==", mimeType: "image/png" } });
  await check("/api/transcribe", 413, { method: "POST", token: owner, body: { audioBase64: Buffer.alloc(8*1024*1024+1).toString("base64"), mimeType: "audio/wav" } });
  await check("/api/community-access", 401);
  const result = await check("/api/community-access", 200, { token: owner });
  assert.equal((await result.json()).active, false, "unpaid fixture must not receive paid access");
  await check("/api/community-access?communityId=not-a-uuid", 400, { token: owner });
  const communityId = fixture.communityIds[0];
  const member = await check(`/api/community-access?communityId=${communityId}`, 200, { token: owner });
  assert.equal((await member.json()).active, false);
  await check(`/api/community-access?communityId=${communityId}`, 403, { token: outsider });
}
run().catch((error) => { console.error("FAIL", error.message); process.exitCode = 1; });
