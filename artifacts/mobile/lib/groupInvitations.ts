import { z } from "zod";

export const groupInvitationsSchema = z.array(z.object({
  id: z.string().uuid(), groupId: z.string().uuid(), groupName: z.string(),
  inviterId: z.string().uuid(), inviterName: z.string(),
  recipientId: z.string().uuid(), recipientName: z.string(),
  status: z.enum(["pending", "accepted", "declined", "revoked", "expired", "unavailable"]),
  createdAt: z.string().datetime({ offset: true }), expiresAt: z.string().datetime({ offset: true }),
}));
export type GroupInvitation = z.infer<typeof groupInvitationsSchema>[number];
