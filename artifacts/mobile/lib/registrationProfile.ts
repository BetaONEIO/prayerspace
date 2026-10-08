import type { SupabaseClient, User } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  favorite_verse: string | null;
  date_of_birth: string | null;
  updated_at: string | null;
  deletion_requested_at: string | null;
}

export function validateDateOfBirth(value: unknown, today = new Date()): asserts value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Please enter a valid date of birth.");
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1900 || date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day ||
      date.getTime() > today.getTime()) {
    throw new Error("Please enter a valid date of birth.");
  }
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month ||
      (today.getMonth() + 1 === month && today.getDate() < day)) age--;
  if (age < 13) throw new Error("You must be at least 13 years old to create an account.");
}

export function profileStorageError(error: { code?: string; message?: string }): Error {
  if (["42703", "PGRST202", "PGRST204", "PGRST205", "42P01"].includes(error.code ?? "")) {
    return new Error("Required profile storage is unavailable. Please try again after the service has been repaired.");
  }
  return new Error("We couldn't save or load your required profile. Please check your connection and try again.");
}

// Anonymous preflight exposes only schema readiness, never any profile data.
export async function checkRegistrationStorage(client: SupabaseClient): Promise<void> {
  const { data, error } = await client.rpc("registration_profile_storage_ready");
  if (error) throw profileStorageError(error);
  if (data !== true) throw profileStorageError({ code: "42703" });
}

// DOB has no direct client SELECT grant. The database derives the owner from
// auth.uid(); this RPC has no user-id parameter and is unavailable anonymously.
export async function readOwnRegistrationProfile(client: SupabaseClient): Promise<UserProfile | null> {
  const { data, error } = await client.rpc("get_my_registration_profile").maybeSingle();
  if (error) throw profileStorageError(error);
  return data as UserProfile | null;
}

export async function writeOwnRegistrationProfile(
  client: SupabaseClient,
  id: string,
  updates: Record<string, unknown>,
) {
  if ("date_of_birth" in updates) validateDateOfBirth(updates.date_of_birth);
  const existing = await readOwnRegistrationProfile(client);
  if (existing && existing.id !== id) throw new Error("You can only save your own profile.");
  const payload = { ...updates, updated_at: new Date().toISOString() };
  // ON CONFLICT's EXCLUDED.dob needs SELECT on the target DOB column, which is
  // deliberately private. Use owner-scoped UPDATE or INSERT instead.
  const update = () => client.from("profiles").update(payload).eq("id", id).select("id").single();
  let result = existing
    ? await update()
    : await client.from("profiles").insert({ ...payload, id }).select("id").single();
  if (!existing && result.error?.code === "23505") {
    // Another owner-session may have created the profile after our read.
    result = await update();
  }
  if (result.error) throw profileStorageError(result.error);
  const saved = await readOwnRegistrationProfile(client);
  if (!saved || saved.id !== id) throw new Error("Your profile was not saved. Please try again.");
  if ("date_of_birth" in updates && saved.date_of_birth !== updates.date_of_birth) {
    throw new Error("Your date of birth was not saved. Please try again.");
  }
  return saved;
}

// Email confirmation creates a session later than signup. Recover from durable
// auth metadata on verification, password sign-in and session reload, not from
// navigation parameters or an in-memory copy of the form.
export async function loadEmailRegistrationProfile(client: SupabaseClient, user: User) {
  const existing = await readOwnRegistrationProfile(client);
  if (existing?.deletion_requested_at) return existing;
  if (existing?.date_of_birth) {
    validateDateOfBirth(existing.date_of_birth);
    return existing;
  }
  // getSession's user may come from persisted local storage. Fetch current
  // server metadata before restoring a missing date; stale session metadata
  // must not recreate a DOB that has since been removed from its source.
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError) throw profileStorageError(authError);
  const currentUser = authData.user;
  if (!currentUser || currentUser.id !== user.id) {
    throw new Error("Your required profile could not be loaded. Please sign in again.");
  }
  const dob: unknown = currentUser.user_metadata?.date_of_birth;
  // Legacy accounts without metadata must complete the required form; never
  // invent a DOB or treat the age_verified metadata flag as proof.
  if (!dob) return existing;
  validateDateOfBirth(dob);
  const saved = await writeOwnRegistrationProfile(client, user.id, {
    date_of_birth: dob,
    ...(!existing ? { full_name: currentUser.user_metadata?.full_name ?? "" } : {}),
  });
  if (saved?.date_of_birth !== dob) {
    throw new Error("Your date of birth was not saved. Please try again.");
  }
  return saved;
}
