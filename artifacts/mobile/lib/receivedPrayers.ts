import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export const prayerIdSchema = z.string().uuid();
const receivedPrayerSchema = z.object({
  id: prayerIdSchema,
  senderId: z.union([prayerIdSchema, z.literal("")]),
  senderName: z.string().min(1),
  senderAvatar: z.string(),
  type: z.literal("text"),
  content: z.string(),
  sentAt: z.string().datetime({ offset: true }),
  prayerCount: z.number().int().nonnegative(),
  prayedByAvatars: z.array(z.string()),
  hasPrayed: z.boolean(),
  eventDate: z.string().nullable(),
  eventTime: z.string().nullable(),
  hasPrayerDate: z.boolean(),
  status: z.enum(["ongoing", "answered", "still_need_prayer", "archived"]),
  imageUrl: z.string().nullable(),
  updates: z.array(z.object({
    id: prayerIdSchema,
    content: z.string(),
    createdAt: z.string().datetime({ offset: true }),
  })),
});

export type ReceivedPrayer = z.infer<typeof receivedPrayerSchema>;
export const prayerAcknowledgementSchema = z.object({
  hasPrayed: z.literal(true),
  prayerCount: z.number().int().nonnegative(),
});
export function parseReceivedPrayer(data: unknown): ReceivedPrayer | null {
  return receivedPrayerSchema.nullable().parse(data);
}
export function parseReceivedPrayers(data: unknown): ReceivedPrayer[] {
  return z.array(receivedPrayerSchema).parse(data);
}

async function assertAccount(client: SupabaseClient, expectedUserId: string) {
  const { data, error } = await client.auth.getSession();
  if (error || data.session?.user.id !== expectedUserId) throw new Error("Account changed. Please reopen this request.");
}

export async function loadReceivedPrayer(client: SupabaseClient, id: string, userId: string) {
  prayerIdSchema.parse(id);
  await assertAccount(client, userId);
  const { data, error } = await client.rpc("get_received_prayer_details", { prayer_id: id });
  if (error) throw error;
  await assertAccount(client, userId);
  return parseReceivedPrayer(data);
}

export async function loadReceivedPrayers(client: SupabaseClient, userId: string) {
  await assertAccount(client, userId);
  const { data, error } = await client.rpc("get_received_prayers");
  if (error) throw error;
  await assertAccount(client, userId);
  return parseReceivedPrayers(data);
}
