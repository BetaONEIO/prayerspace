import { supabase } from "./supabase";

export type ReactionType = "pray" | "amen" | "support";

export const REACTION_OPTIONS: {
  type: ReactionType;
  emoji: string;
  label: string;
}[] = [
  { type: "pray", emoji: "🙏", label: "Praying" },
  { type: "amen", emoji: "🕊️", label: "Amen" },
  { type: "support", emoji: "❤️", label: "Support" },
];

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  type: "text" | "prayer_share";
  prayer_request_content: string | null;
  image_url: string | null;
  image_path: string | null;
  is_edited: boolean;
  edited_at: string | null;
  deleted_for_everyone: boolean;
  deleted_for_sender: boolean;
  created_at: string;
  message_reactions: MessageReaction[];
  reply_to?: {
    id?: string;
    senderName: string;
    content: string;
  } | null;
}

export interface ConversationListItem {
  conversation_id: string;
  is_muted: boolean;
  last_read_at: string | null;
  other_user_id: string;
  other_user_name: string | null;
  other_user_avatar: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_sender_id: string | null;
  unread_count: number;
}

export function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    str
  );
}

export function formatMessageTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function canDeleteForEveryone(createdAt: string): boolean {
  const diff = Date.now() - new Date(createdAt).getTime();
  return diff < 15 * 60 * 1000;
}

export async function getOrCreateDMConversation(
  userId1: string,
  userId2: string
): Promise<string> {
  if (!isUUID(userId1) || !isUUID(userId2)) throw new Error("Invalid chat participants");
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user.id !== userId1) throw new Error("Please sign in to start a chat");
  const { data, error } = await supabase.rpc("get_or_create_dm", { target_user_id: userId2 });
  if (error) throw error;
  if (typeof data !== "string" || !isUUID(data)) throw new Error("Conversation was not created");
  return data;
}

export async function fetchConversations(
  userId: string
): Promise<ConversationListItem[]> {
  console.log("[Chat] Fetching conversations for", userId.slice(0, 8));

  const { data: userConvs, error } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", userId);

  if (error) {
    console.error("[Chat] Error fetching user convs:", error.message);
    throw error;
  }

  if (!userConvs?.length) return [];

  const candidateIds = userConvs.map(
    (c: { conversation_id: string }) => c.conversation_id
  );
  const { data: dmConversations, error: dmError } = await supabase.from("conversations")
    .select("id").eq("type", "dm").in("id", candidateIds);
  if (dmError) throw dmError;
  const convIds = (dmConversations ?? []).map((conversation: { id: string }) => conversation.id);
  if (!convIds.length) return [];

  const [participantsRes, messagesRes] = await Promise.all([
    supabase
      .from("conversation_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", convIds)
      .neq("user_id", userId),
    supabase
      .from("messages")
      .select("conversation_id, content, created_at, sender_id, type")
      .in("conversation_id", convIds)
      .eq("deleted_for_everyone", false)
      .order("created_at", { ascending: false }),
  ]);

  const allParticipants = participantsRes.data ?? [];
  const allMessages = messagesRes.data ?? [];
  if (participantsRes.error) throw participantsRes.error;
  if (messagesRes.error) throw messagesRes.error;

  const otherUserIds = [
    ...new Set(
      allParticipants.map(
        (p: { conversation_id: string; user_id: string }) => p.user_id
      )
    ),
  ];

  const profilesRes =
    otherUserIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", otherUserIds)
      : { data: [] };

  const profiles = profilesRes.data ?? [];
  if ("error" in profilesRes && profilesRes.error) throw profilesRes.error;

  const lastMessages: Record<
    string,
    { content: string; created_at: string; sender_id: string; type: string }
  > = {};
  for (const msg of allMessages as {
    conversation_id: string;
    content: string;
    created_at: string;
    sender_id: string;
    type: string;
  }[]) {
    if (!lastMessages[msg.conversation_id]) {
      lastMessages[msg.conversation_id] = msg;
    }
  }

  const items: ConversationListItem[] = convIds
    .map((convId: string) => {
      const userConv = userConvs.find(
        (c: { conversation_id: string }) => c.conversation_id === convId
      );
      const otherParticipant = allParticipants.find(
        (p: { conversation_id: string; user_id: string }) =>
          p.conversation_id === convId
      );
      const otherProfile = profiles.find(
        (p: { id: string; full_name: string | null; avatar_url: string | null }) =>
          p.id === otherParticipant?.user_id
      );
      const lastMsg = lastMessages[convId];

      if (!otherProfile) return null;

      return {
        conversation_id: convId,
        is_muted: false,
        last_read_at: userConv?.last_read_at ?? null,
        other_user_id: otherProfile.id,
        other_user_name: otherProfile.full_name,
        other_user_avatar: otherProfile.avatar_url,
        last_message: lastMsg
          ? lastMsg.type === "prayer_share"
            ? "🙏 Shared a prayer"
            : lastMsg.content
          : null,
        last_message_at: lastMsg?.created_at ?? null,
        last_sender_id: lastMsg?.sender_id ?? null,
        unread_count: 0,
      } as ConversationListItem;
    })
    .filter((item): item is ConversationListItem => item !== null)
    .sort((a, b) => {
      if (!a.last_message_at && !b.last_message_at) return 0;
      if (!a.last_message_at) return 1;
      if (!b.last_message_at) return -1;
      return (
        new Date(b.last_message_at).getTime() -
        new Date(a.last_message_at).getTime()
      );
    });

  console.log("[Chat] Loaded", items.length, "conversations");
  return items;
}
