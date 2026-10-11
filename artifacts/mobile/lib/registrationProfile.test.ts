import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import {
  checkRegistrationStorage, loadEmailRegistrationProfile,
  profileStorageError, validateDateOfBirth, readOwnRegistrationProfile, needsDateOfBirth,
} from "./registrationProfile";

const today = new Date(2026, 9, 7, 12);
const user = {
  id: "isolated-test-user", user_metadata: { full_name: "Test", date_of_birth: "2000-02-29" },
} as unknown as User;

test("every provider needs completion when the profile or DOB is missing", () => {
  for (const profile of [null, undefined, { date_of_birth: null }]) {
    assert.equal(needsDateOfBirth(profile), true);
  }
  assert.equal(needsDateOfBirth({ date_of_birth: "1995-01-01" }), false);
});

test("shared profile loading rejects saved underage and invalid dates for OAuth and restored sessions", async () => {
  for (const date_of_birth of ["2020-01-01", "2001-02-29", "2099-01-01"]) {
    const existing = { id: user.id, date_of_birth };
    const { client, writes } = clientFor(existing, null);
    await assert.rejects(readOwnRegistrationProfile(client), /at least 13|valid date/);
    assert.equal(writes.length, 0);
  }
  const saved = { id: user.id, date_of_birth: "1995-01-01" };
  assert.deepEqual(await readOwnRegistrationProfile(clientFor(saved, null).client), saved);
  assert.equal(await readOwnRegistrationProfile(clientFor(null, null).client), null);
});

function clientFor(
  existing: unknown, saved: unknown, readError: unknown = null, saveError: unknown = null,
  serverUser: User | null = user, authError: unknown = null,
) {
  const writes: Record<string, unknown>[] = [];
  let current = existing;
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: current, error: readError }),
    insert: (payload: Record<string, unknown>) => { writes.push(payload); return chain; },
    update: (payload: Record<string, unknown>) => { writes.push(payload); return chain; },
    single: async () => {
      if (!saveError) current = saved;
      return { data: saved, error: saveError };
    },
  };
  return { client: {
    auth: { getUser: async () => ({ data: { user: serverUser }, error: authError }) },
    from: () => chain,
    rpc: (name: string) => name === "registration_profile_storage_ready"
      ? Promise.resolve({ data: true, error: readError }) : chain,
  } as unknown as SupabaseClient, writes };
}

test("validates exact thirteenth birthday and strict calendar dates", () => {
  for (const dob of ["2013-10-07", "2000-02-29", "1900-01-01"]) {
    assert.doesNotThrow(() => validateDateOfBirth(dob, today));
  }
  assert.throws(() => validateDateOfBirth("2013-10-08", today), /at least 13/);
  for (const dob of ["2001-02-29", "2000-04-31", "2027-01-01", "1899-01-01", "", null, "2000-2-29"]) {
    assert.throws(() => validateDateOfBirth(dob, today), /valid date/);
  }
});

test("schema preflight fails explicitly before signup", async () => {
  const { client } = clientFor(null, null, { code: "42703" });
  await assert.rejects(checkRegistrationStorage(client), /storage is unavailable/);
  for (const code of ["42703", "42P01", "PGRST202", "PGRST204", "PGRST205"]) {
    assert.match(profileStorageError({ code }).message, /storage is unavailable/);
  }
});

test("verification/session reload copies durable metadata to missing profile", async () => {
  const saved = { id: user.id, date_of_birth: "2000-02-29" };
  const { client, writes } = clientFor(null, saved);
  assert.deepEqual(await loadEmailRegistrationProfile(client, user), saved);
  assert.equal(writes[0].date_of_birth, "2000-02-29");
  assert.equal(writes[0].id, user.id);
  assert.equal(writes[0].full_name, "Test");
});

test("repairing a date preserves existing name, bio and avatar", async () => {
  const existing = { id: user.id, full_name: "Changed name", bio: "Keep", avatar_url: "Keep", date_of_birth: null };
  const { client, writes } = clientFor(existing, { ...existing, date_of_birth: "2000-02-29" });
  await loadEmailRegistrationProfile(client, user);
  assert.equal(writes.length, 1);
  for (const field of ["full_name", "bio", "avatar_url"]) assert.equal(field in writes[0], false);
});

test("stored profile DOB is authoritative over subsequently edited auth metadata", async () => {
  const existing = { id: user.id, date_of_birth: "1995-01-01" };
  const { client, writes } = clientFor(existing, null);
  assert.deepEqual(await loadEmailRegistrationProfile(client, user), existing);
  assert.equal(writes.length, 0);
});

test("save failures and incorrect returned DOB are not successful verification", async () => {
  const failed = clientFor(null, null, null, { code: "PGRST204" });
  await assert.rejects(loadEmailRegistrationProfile(failed.client, user), /storage is unavailable/);
  const mismatched = clientFor(null, { id: user.id, date_of_birth: null });
  await assert.rejects(loadEmailRegistrationProfile(mismatched.client, user), /not saved/);
  const unreadable = clientFor(null, null, { code: "42501" });
  await assert.rejects(loadEmailRegistrationProfile(unreadable.client, user), /couldn't save or load/);
});

test("does not invent DOB for legacy accounts or trust age_verified", async () => {
  const legacy = { ...user, user_metadata: { age_verified: true } } as User;
  const { client, writes } = clientFor(null, null, null, null, legacy);
  assert.equal(await loadEmailRegistrationProfile(client, legacy), null);
  assert.equal(writes.length, 0);
});

test("rejects invalid metadata and leaves deletion-pending profiles alone", async () => {
  const invalid = { ...user, user_metadata: { date_of_birth: "2020-01-01" } } as User;
  const { client, writes } = clientFor(null, null, null, null, invalid);
  await assert.rejects(loadEmailRegistrationProfile(client, invalid), /at least 13/);
  assert.equal(writes.length, 0);
  const deleted = { id: user.id, deletion_requested_at: "2026-01-01" };
  const pending = clientFor(deleted, null);
  assert.deepEqual(await loadEmailRegistrationProfile(pending.client, user), deleted);
  assert.equal(pending.writes.length, 0);
});

test("missing DOB uses current server metadata, not a stale persisted session", async () => {
  const cleared = { ...user, user_metadata: { full_name: "Server name", age_verified: true } } as User;
  const missing = clientFor(null, null, null, null, cleared);
  assert.equal(await loadEmailRegistrationProfile(missing.client, user), null);
  assert.equal(missing.writes.length, 0);

  const current = { ...user, user_metadata: { full_name: "Server name", date_of_birth: "1995-01-01" } } as User;
  const repaired = clientFor(null, { id: user.id, date_of_birth: "1995-01-01" }, null, null, current);
  await loadEmailRegistrationProfile(repaired.client, user);
  assert.equal(repaired.writes[0].date_of_birth, "1995-01-01");
  assert.equal(repaired.writes[0].full_name, "Server name");
});

test("unavailable or different authenticated metadata never triggers profile recovery", async () => {
  for (const fixture of [
    clientFor(null, null, null, null, null),
    clientFor(null, null, null, null, { ...user, id: "different-user" } as User),
    clientFor(null, null, null, null, user, { code: "network_error" }),
  ]) {
    await assert.rejects(loadEmailRegistrationProfile(fixture.client, user), /could not be loaded|couldn't save or load/);
    assert.equal(fixture.writes.length, 0);
  }
});
