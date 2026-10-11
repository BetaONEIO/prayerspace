import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

const uuid = z.string().uuid();
const timestamp = z.string().datetime({ offset: true });
export const groupMediaSchema = z.object({
  id: uuid, kind: z.enum(["image", "voice", "cover"]), mime: z.string(),
  bytes: z.number().int().positive().max(8388608), durationMs: z.number().int().positive().max(300000).nullable(),
});
export type GroupMedia = z.infer<typeof groupMediaSchema>;
const memberSchema = z.object({
  id: uuid, name: z.string(), avatar: z.string(), role: z.enum(["admin", "leader", "member"]), joinedAt: timestamp,
});
const reactionSchema = z.object({
  id: uuid, userId: uuid, userName: z.string(), userAvatar: z.string(),
  type: z.enum(["pray", "amen", "support"]), createdAt: timestamp,
});
export const groupChatSchema = z.object({
  id: uuid, name: z.string(), canSend: z.boolean(),
  settings: z.object({
    focus: z.enum(["Prayer", "Bible Study", "Support", "Testimony"]).default("Prayer"),
    private: z.boolean().default(true), safeSpace: z.boolean().default(true),
    coverMedia: groupMediaSchema.nullable().default(null),
  }),
  members: z.array(memberSchema),
  messages: z.array(z.object({
    id: uuid, senderId: z.union([uuid, z.literal("")]), senderName: z.string(), senderAvatar: z.string(),
    content: z.string(), createdAt: timestamp, prayerContent: z.string().nullable(),
    reply: z.object({ id: uuid, senderName: z.string(), content: z.string() }).nullable(),
    reactions: z.array(reactionSchema),
    media: groupMediaSchema.nullable().default(null),
  })),
});
export const groupListSchema = z.array(z.object({
  id: uuid, name: z.string(), memberCount: z.number().int().nonnegative(),
  isAdmin: z.boolean(), updatedAt: timestamp,
}));
export const inviteCandidatesSchema = z.array(z.object({ id: uuid, name: z.string(), avatar: z.string() }));
export type GroupChat = z.infer<typeof groupChatSchema>;

// Identifiers are not authorization tokens; every RPC independently checks
// identity and membership. Native runtimes do not always expose Web Crypto.
export function newGroupClientId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, character => {
    const n = Math.floor(Math.random() * 16);
    return (character === "x" ? n : (n & 3) | 8).toString(16);
  });
}

export async function groupRpc<S extends z.ZodTypeAny>(
  client: SupabaseClient, userId: string, name: string, args: Record<string, unknown>, schema: S,
): Promise<z.output<S>> {
  const assertAccount = async () => {
    const { data, error } = await client.auth.getSession();
    if (error || data.session?.user.id !== userId) throw new Error("Account changed. Please reopen the group.");
  };
  uuid.parse(userId);
  await assertAccount();
  const { data, error } = await client.rpc(name, { ...args, p_expected_user_id: userId });
  if (error) throw new Error(error.message);
  await assertAccount();
  return schema.parse(data);
}

export const groupIdResult = uuid;
export const emptyGroupResult = z.null();

export function groupMessages(chat: GroupChat, userId: string) {
  return chat.messages.map(message => ({
    id: message.id, senderId: message.senderId, senderName: message.senderName, senderAvatar: message.senderAvatar,
    text: message.content, time: new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    createdAt: message.createdAt, isOwn: message.senderId === userId,
    media: message.media ?? undefined,
    sharedPrayer: message.prayerContent ? { authorName: "Shared prayer", authorAvatar: "", postContent: message.prayerContent } : undefined,
    replyTo: message.reply ? { id: message.reply.id, senderName: message.reply.senderName, text: message.reply.content || "Media message" } : undefined,
    reactions: message.reactions.map(reaction => ({
      userId: reaction.userId, userName: reaction.userName, userAvatar: reaction.userAvatar,
      isMine: reaction.userId === userId, type: reaction.type === "pray" ? "pray" as const : "emoji" as const,
      emoji: reaction.type === "amen" ? "🕊️" : reaction.type === "support" ? "❤️" : undefined, createdAt: reaction.createdAt,
    })),
  }));
}
