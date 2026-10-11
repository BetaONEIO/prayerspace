import { Router } from "express";
import { z } from "zod";
import { requireSupabaseUser } from "../lib/supabaseAuth";
import { accountRpc } from "../lib/accountServices";
import { decodeGroupMedia, mediaDigest, mediaStorage, MAX_MEDIA_BYTES } from "../lib/groupMedia";

const router = Router();
const identity = z.object({ expectedUserId: z.string().uuid(), groupId: z.string().uuid(), mediaId: z.string().uuid() });
const input = identity.extend({ kind: z.enum(["image","voice","cover"]), mime: z.string().max(32),
  base64: z.string().max(4 * Math.ceil(MAX_MEDIA_BYTES / 3)), durationMs: z.number().int().min(1).max(300000).optional() });
const descriptor = z.object({ id: z.string().uuid(), path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]+$/),
  mime: z.string(), bytes: z.number().int().min(1).max(MAX_MEDIA_BYTES), digest: z.string().regex(/^[0-9a-f]{64}$/) });
const busy = new Set<string>();
router.use("/group-media", requireSupabaseUser, (_req,res,next) => { res.setHeader("Cache-Control","no-store"); next(); });
router.post("/group-media/upload", async (req,res) => {
  const parsed = input.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({error:"Invalid file details or file too large"}); return; }
  const body = parsed.data, userId = String(res.locals.userId), auth = req.get("authorization")!;
  if (body.expectedUserId !== userId) { res.status(409).json({error:"Account changed"}); return; }
  if (busy.has(userId)) { res.status(429).json({error:"Another file transfer is in progress. Please retry."}); return; }
  busy.add(userId);
  try {
    let bytes: Buffer;
    try { bytes = decodeGroupMedia(body.base64,body.mime,body.kind); }
    catch (error) { res.status(400).json({error:(error as Error).message}); return; }
    const digest = mediaDigest(bytes);
    const record = descriptor.parse(await accountRpc("reserve_group_media",{
      p_group_id:body.groupId,p_expected_user_id:userId,p_media_id:body.mediaId,p_kind:body.kind,p_mime:body.mime,
      p_bytes:bytes.length,p_digest:digest,p_duration_ms:body.kind==="voice" ? body.durationMs ?? null : null,
    },auth));
    const uploaded = await mediaStorage(record.path,auth,bytes,body.mime);
    if (!uploaded.ok) {
      // An upload may have succeeded while its response was lost. Never overwrite.
      const existing = await mediaStorage(record.path);
      if (!existing.ok || mediaDigest(new Uint8Array(await existing.arrayBuffer()))!==digest) throw new Error("Upload failed");
    }
    await accountRpc("commit_group_media_upload",{
      p_group_id:body.groupId,p_expected_user_id:userId,p_media_id:body.mediaId,
    },auth);
    res.json({id:body.mediaId});
  } catch {
    req.log.warn("Private group upload not confirmed");
    res.status(503).json({error:"Upload not confirmed. Your draft is retained; retry without changing it."});
  } finally { busy.delete(userId); }
});
router.post("/group-media/download", async (req,res) => {
  const parsed = identity.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({error:"Invalid file identifier"}); return; }
  const body = parsed.data, userId = String(res.locals.userId), auth = req.get("authorization")!;
  if (body.expectedUserId!==userId) { res.status(409).json({error:"Account changed"}); return; }
  if (busy.has(userId)) { res.status(429).json({error:"Another file transfer is in progress. Please retry."}); return; }
  busy.add(userId);
  try {
    const args = {p_group_id:body.groupId,p_expected_user_id:userId,p_media_id:body.mediaId};
    const record = descriptor.parse(await accountRpc("read_group_media",args,auth));
    const response = await mediaStorage(record.path);
    if (!response.ok) throw new Error("Download unavailable");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length!==record.bytes || mediaDigest(bytes)!==record.digest) throw new Error("File verification failed");
    // Removal, deletion or blocking during the storage fetch must also deny delivery.
    await accountRpc("read_group_media",args,auth);
    res.json({base64:bytes.toString("base64"),mime:record.mime});
  } catch {
    res.status(403).json({error:"This media is unavailable or you no longer have access."});
  } finally { busy.delete(userId); }
});
export default router;
