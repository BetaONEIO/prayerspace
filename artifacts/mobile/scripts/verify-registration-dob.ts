/**
 * Explicitly opted-in live registration check. Uses normal signup and delivered
 * email verification, never admin-created or admin-confirmed users.
 * Disposable test inboxes: https://mail.tm (no real personal data).
 * Run from scripts/: RUN_REGISTRATION_DOB_TESTS=1 pnpm exec tsx
 *   ../artifacts/mobile/scripts/verify-registration-dob.ts
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  checkRegistrationStorage, loadEmailRegistrationProfile,
  readOwnRegistrationProfile, writeOwnRegistrationProfile,
} from "../lib/registrationProfile";

if (process.env.RUN_REGISTRATION_DOB_TESTS !== "1") {
  throw new Error("Set RUN_REGISTRATION_DOB_TESTS=1 to authorize isolated live test accounts.");
}
const url = new URL(required("EXPO_PUBLIC_SUPABASE_URL")).origin;
const anonKey = required("EXPO_PUBLIC_SUPABASE_ANON_KEY");
const admin = createClient(url, required("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const run = randomBytes(8).toString("hex");
const accounts: { client: SupabaseClient; id: string }[] = [];
const mailboxes: { address: string; password: string; id: string; token: string }[] = [];
let mailDomain: string | undefined;
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const newClient = () => createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const pass = (label: string) => console.log(`PASS ${label}`);

function required(key: string): string {
  if (!process.env[key]) throw new Error(`Missing ${key}`);
  return process.env[key]!;
}
async function mail(path: string, token?: string, body?: unknown, method?: string) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(`https://api.mail.tm${path}`, {
      method: method ?? (body ? "POST" : "GET"),
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 429 && attempt < 3) {
      await pause(Math.min(30, Math.max(10, Number(response.headers.get("Retry-After")) || 10)) * 1000);
      continue;
    }
    if (!response.ok) throw new Error(`Disposable inbox ${path.split("/")[1]} API ${response.status}`);
    return response.status === 204 ? null : await response.json();
  }
}
async function mailbox(label: string) {
  if (!mailDomain) {
    const domains = await mail("/domains");
    mailDomain = domains["hydra:member"].find((d: { isActive: boolean }) => d.isActive)?.domain;
  }
  assert.ok(mailDomain, "No active disposable inbox domain");
  const address = `psdob${run}${label}@${mailDomain}`;
  const password = randomBytes(24).toString("base64url");
  const created = await mail("/accounts", undefined, { address, password });
  const { token } = await mail("/token", undefined, { address, password });
  const box = { address, password, id: created.id as string, token: token as string };
  mailboxes.push(box);
  return box;
}
async function deliveredCode(box: typeof mailboxes[number]): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const messages = await mail("/messages", box.token);
    for (const message of messages["hydra:member"]) {
      const detail = await mail(`/messages/${message.id}`, box.token);
      const text = `${detail.text ?? ""} ${(detail.html ?? []).join(" ")}`;
      const code = text.match(/\b(\d{8}|\d{6})\b/)?.[1];
      if (code) return code;
    }
    await pause(3000);
  }
  throw new Error("Signup email with numeric OTP was not delivered within 90 seconds.");
}
async function signup(label: string, dob: string, existingBox?: typeof mailboxes[number]) {
  const box = existingBox ?? await mailbox(label);
  const client = newClient();
  const { data, error } = await client.auth.signUp({
    email: box.address, password: box.password,
    options: { data: { full_name: `DOB Repair Test ${run}`, date_of_birth: dob, age_verified: true } },
  });
  if (data.user) accounts.push({ client, id: data.user.id });
  if (error) throw new Error(`Normal signup failed: ${error.message} [${error.code ?? error.name}, ${error.status}]`);
  assert.ok(data.user?.id, "Signup must return the new isolated user");
  assert.equal(data.session, null, "Email confirmation must remain enabled");
  const stored = await admin.from("profiles").select("date_of_birth").eq("id", data.user.id).single();
  assert.ifError(stored.error);
  assert.equal(stored.data?.date_of_birth, dob, "DOB must persist before verification");
  pass(`${label}: normal signup stores required DOB before email verification`);
  const code = await deliveredCode(box);
  assert.equal(code.length, 8, "App verification form expects an eight-digit delivered code");
  const verified = await client.auth.verifyOtp({ email: box.address, token: code, type: "signup" });
  assert.ifError(verified.error);
  assert.ok(verified.data.session && verified.data.user);
  const profile = await loadEmailRegistrationProfile(client, verified.data.user);
  assert.equal(profile?.date_of_birth, dob);
  pass(`${label}: delivered signup OTP verifies and reads back DOB`);
  return { box, client, user: verified.data.user, dob };
}

async function main() {
  const anonymous = newClient();
  await checkRegistrationStorage(anonymous);
  pass("anonymous readiness check returns true without profile data");
  assert.ok((await anonymous.rpc("get_my_registration_profile")).error);
  assert.ok((await anonymous.from("profiles").select("date_of_birth").limit(0)).error);
  assert.ifError((await anonymous.from("profiles").select("id,full_name,avatar_url,bio").limit(0)).error);
  pass("anonymous DOB access denied; public profile fields remain accessible");

  const invalid = [
    { label: "missing", data: { age_verified: true } },
    { label: "invalid-calendar", data: { date_of_birth: "2000-02-30", age_verified: true } },
    { label: "under-thirteen", data: { date_of_birth: "2020-01-01", age_verified: true } },
  ];
  // Rejected requests must not create accounts or reach email delivery.
  const box = await mailbox("adult");
  for (const scenario of invalid) {
    const result = await newClient().auth.signUp({
      email: box.address, password: box.password, options: { data: scenario.data },
    });
    if (result.data.user) accounts.push({ client: newClient(), id: result.data.user.id });
    assert.ok(result.error, `${scenario.label} signup must fail server-side`);
    assert.match(result.error.message, /database error saving new user/i,
      "A rate limit or email failure is not evidence of DOB enforcement");
    assert.equal(result.data.user, null);
    pass(`server rejects ${scenario.label} DOB despite age_verified metadata`);
    await pause(1200);
  }

  const a = await signup("adult", "2000-02-29", box);
  await a.client.auth.signOut();
  const login = await a.client.auth.signInWithPassword({ email: a.box.address, password: a.box.password });
  assert.ifError(login.error);
  assert.ok(login.data.user && login.data.session);
  assert.equal((await loadEmailRegistrationProfile(a.client, login.data.user))?.date_of_birth, a.dob);
  const reloaded = newClient();
  assert.ifError((await reloaded.auth.setSession({
    access_token: login.data.session.access_token, refresh_token: login.data.session.refresh_token,
  })).error);
  assert.equal((await readOwnRegistrationProfile(reloaded))?.date_of_birth, a.dob);
  pass("DOB survives real password sign-in and a fresh client session");

  const changed = await writeOwnRegistrationProfile(a.client, a.user.id, {
    full_name: `DOB Repair Test ${run}`, bio: "Isolated test bio", date_of_birth: "2001-01-01",
  });
  assert.equal(changed.bio, "Isolated test bio");
  assert.equal(changed.date_of_birth, "2001-01-01");
  assert.ok((await a.client.from("profiles").update({ date_of_birth: null }).eq("id", a.user.id)).error);
  assert.ok((await a.client.from("profiles").update({ date_of_birth: "2020-01-01" }).eq("id", a.user.id)).error);
  assert.ok((await a.client.from("profiles").select("date_of_birth").eq("id", a.user.id)).error);
  pass("own DOB write/readback works; clearing, under-age writes and direct DOB reads fail");

  // Derive the boundary from the database date, not the client's local timezone.
  const ref = new URL(url).hostname.split(".")[0];
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${required("SUPABASE_ACCESS_TOKEN")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: "select (current_date - interval '13 years')::date::text as boundary", read_only: true }),
  });
  assert.ok(response.ok, "Database birthday boundary query");
  const boundary = (await response.json())[0].boundary as string;
  const b = await signup("birthday", boundary);
  assert.equal((await readOwnRegistrationProfile(b.client))?.id, b.user.id);
  const otherWrite = await a.client.from("profiles").update({ date_of_birth: "1990-01-01" })
    .eq("id", b.user.id).select("id");
  assert.ifError(otherWrite.error);
  assert.deepEqual(otherWrite.data, []);
  assert.equal((await readOwnRegistrationProfile(b.client))?.date_of_birth, boundary);
  assert.ok((await a.client.rpc("get_my_registration_profile", { id: b.user.id })).error);
  pass("exact thirteenth birthday accepted; cross-user DOB writes and parameterized reads denied");

  // A user-owned profile can be recreated from durable signup metadata. No
  // triggers are disabled and no admin-confirmed auth user is substituted.
  assert.ifError((await a.client.from("profiles").delete().eq("id", a.user.id)).error);
  assert.equal((await loadEmailRegistrationProfile(a.client, a.user))?.date_of_birth, a.dob);
  pass("missing isolated profile recovers DOB from durable signup metadata");
}

async function cleanup() {
  let failed = false;
  for (const account of accounts) {
    await account.client.auth.signOut();
    const { error } = await admin.auth.admin.deleteUser(account.id);
    if (error) { failed = true; console.error(`Test account cleanup failed: ${error.code ?? error.name}`); }
  }
  for (const box of mailboxes) {
    try { await mail(`/accounts/${box.id}`, box.token, undefined, "DELETE"); }
    catch { failed = true; console.error("Disposable inbox cleanup failed"); }
  }
  if (failed) throw new Error("Isolated test cleanup requires attention");
  pass("isolated auth accounts and disposable inboxes removed");
}

void (async () => {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Live registration test failed");
    process.exitCode = 1;
  } finally {
    try { await cleanup(); }
    catch (error) { console.error(error instanceof Error ? error.message : "Cleanup failed"); process.exitCode = 1; }
  }
})();
