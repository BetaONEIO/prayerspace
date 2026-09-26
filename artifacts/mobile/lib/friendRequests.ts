import { supabase } from "@/lib/supabase";

export type PendingFriendRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  } | null;
};

export async function loadPendingFriendRequests(
  userId: string,
  direction: "incoming" | "sent",
): Promise<PendingFriendRequest[]> {
  const personColumn = direction === "incoming" ? "sender_id" : "receiver_id";
  const ownerColumn = direction === "incoming" ? "receiver_id" : "sender_id";
  const { data: requests, error: requestError } = await supabase
    .from("friend_requests")
    .select("id, sender_id, receiver_id, created_at")
    .eq(ownerColumn, userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (requestError) throw requestError;
  if (!requests?.length) return [];

  // friend_requests references auth.users, not profiles. A PostgREST embedded
  // profiles join requires a separate FK and fails even when requests exist.
  const personIds = [...new Set(requests.map((request) => request[personColumn]))];
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, bio")
    .in("id", personIds);
  if (profileError) throw profileError;

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return requests.map((request) => ({
    ...request,
    profile: profilesById.get(request[personColumn]) ?? null,
  }));
}