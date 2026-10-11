import { createHash } from "node:crypto";

export const GROUP_MEDIA_BUCKET = "group-chat-private";
export const MAX_MEDIA_BYTES = 8 * 1024 * 1024;
export function decodeGroupMedia(base64: string, mime: string, kind: string): Buffer {
  const limit = kind === "voice" ? MAX_MEDIA_BYTES : 5 * 1024 * 1024;
  if (typeof base64 !== "string" || base64.length > 4 * Math.ceil(limit / 3)) throw new Error("File too large");
  if (!base64.length || base64.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64))
    throw new Error("Invalid file encoding");
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > limit) throw new Error("File too large");
  if (!bytes.length || bytes.toString("base64") !== base64) throw new Error("Invalid file encoding");
  const head = bytes.subarray(0, 16);
  const supported = mime === "image/jpeg" ? head[0] === 255 && head[1] === 216 && head[2] === 255
    : mime === "image/png" ? head.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : mime === "image/webp" ? head.toString("ascii",0,4)==="RIFF" && head.toString("ascii",8,12)==="WEBP"
    : mime === "audio/webm" ? head.subarray(0,4).equals(Buffer.from([26,69,223,163]))
    : mime === "audio/mp4" || mime === "audio/3gpp" ? head.toString("ascii",4,8)==="ftyp"
    : mime === "audio/ogg" ? head.toString("ascii",0,4)==="OggS"
    : mime === "audio/wav" ? head.toString("ascii",0,4)==="RIFF" && head.toString("ascii",8,12)==="WAVE"
    : mime === "audio/x-caf" ? head.toString("ascii",0,4)==="caff"
    : mime === "audio/aac" ? head[0]===255 && (head[1] & 240)===240 : false;
  if (!supported || (kind === "voice" ? !mime.startsWith("audio/") : !mime.startsWith("image/")))
    throw new Error("File type does not match its contents");
  return bytes;
}
export const mediaDigest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

export async function mediaStorage(path: string, authorization?: string, bytes?: Buffer, mime?: string): Promise<Response> {
  const base = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL!).origin;
  const key = authorization ? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY! : process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error("Private storage is not configured");
  return fetch(`${base}/storage/v1/object/${GROUP_MEDIA_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`, {
    method: bytes ? "POST" : "GET",
    headers: { apikey: key, Authorization: authorization ?? `Bearer ${key}`,
      ...(bytes ? { "Content-Type": mime!, "x-upsert": "false" } : {}) },
    body: bytes ? new Uint8Array(bytes) : undefined,
    signal: AbortSignal.timeout(30000),
  });
}
