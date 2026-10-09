import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { requireSupabaseUser } from "../lib/supabaseAuth";

const execFileAsync = promisify(execFile);

const router: IRouter = Router();
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const usage = new Map<string, { start: number; count: number; busy: boolean }>();
const attempts = new Map<string, { start: number; count: number }>();

// Bound token-validation traffic as well as the expensive authenticated work.
router.use("/transcribe", (req, res, next) => {
  const now = Date.now();
  for (const [key, value] of attempts) {
    if (now - value.start >= 60000) attempts.delete(key);
  }
  const key = req.ip ?? "unknown";
  const value = attempts.get(key) ?? { start: now, count: 0 };
  if (value.count >= 30 || (!attempts.has(key) && attempts.size >= 10000)) {
    res.set("Retry-After", "60").status(429).json({ error: "Too many requests. Try again in a minute." });
    return;
  }
  value.count += 1;
  attempts.set(key, value);
  next();
});

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] ?? "dummy",
  timeout: 60000,
  maxRetries: 0,
});

async function convertToWav(inputBuffer: Buffer, inputExt: string): Promise<Buffer> {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const inputPath = join(tmpdir(), `audio_in_${id}.${inputExt}`);
  const outputPath = join(tmpdir(), `audio_out_${id}.wav`);
  try {
    await writeFile(inputPath, inputBuffer);
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", inputPath,
      "-ar", "16000",
      "-ac", "1",
      "-c:a", "pcm_s16le",
      outputPath,
    ], { timeout: 30000 });
    const wavBuffer = await readFile(outputPath);
    return wavBuffer;
  } finally {
    await unlink(inputPath).catch(() => undefined);
    await unlink(outputPath).catch(() => undefined);
  }
}

router.post("/transcribe", requireSupabaseUser, async (req, res) => {
  let reservation: { start: number; count: number; busy: boolean } | undefined;
  try {
    const { audioBase64, mimeType } = (req.body ?? {}) as {
      audioBase64?: string;
      mimeType?: string;
    };

    if (typeof audioBase64 !== "string" || !audioBase64) {
      res.status(400).json({ error: "audioBase64 is required" });
      return;
    }

    if (audioBase64.length > Math.ceil(MAX_AUDIO_BYTES / 3) * 4) {
      res.status(413).json({ error: "Audio must be no larger than 8 MB." });
      return;
    }
    if (audioBase64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(audioBase64)) {
      res.status(400).json({ error: "Invalid audio encoding." });
      return;
    }
    if (mimeType !== undefined && (typeof mimeType !== "string" ||
      !/^audio\/(wav|x-wav|webm|mp4|m4a|ogg|mpeg)(;.*)?$/i.test(mimeType))) {
      res.status(400).json({ error: "Unsupported audio format." });
      return;
    }
    const now = Date.now();
    for (const [key, value] of usage) {
      if (!value.busy && now - value.start >= 60000) usage.delete(key);
    }
    const userId = String(res.locals.userId);
    const value = usage.get(userId) ?? { start: now, count: 0, busy: false };
    if (value.busy || value.count >= 6 || (!usage.has(userId) && usage.size >= 10000)) {
      res.set("Retry-After", "60").status(429).json({ error: "Transcription limit reached. Try again in a minute." });
      return;
    }
    value.count += 1;
    value.busy = true;
    usage.set(userId, value);
    reservation = value;
    const buffer = Buffer.from(audioBase64, "base64");
    if (buffer.length > MAX_AUDIO_BYTES) {
      res.status(413).json({ error: "Audio must be no larger than 8 MB." });
      return;
    }
    if (!buffer.length || buffer.toString("base64") !== audioBase64) {
      res.status(400).json({ error: "Invalid audio encoding." });
      return;
    }
    req.log.info({ mimeType, bufferBytes: buffer.length }, "transcribe request received");

    const ext = mimeType?.includes("webm")
      ? "webm"
      : mimeType?.includes("mp4") || mimeType?.includes("m4a")
      ? "m4a"
      : mimeType?.includes("ogg")
      ? "ogg"
      : mimeType?.includes("mpeg")
      ? "mp3"
      : "wav";

    let fileBuffer: Buffer = buffer;
    let fileName = `audio.${ext}`;
    let fileMime = mimeType ?? "audio/wav";

    if (ext !== "wav") {
      req.log.info({ ext }, "converting to wav via ffmpeg");
      fileBuffer = await convertToWav(buffer, ext);
      fileName = "audio.wav";
      fileMime = "audio/wav";
      req.log.info({ wavBytes: fileBuffer.length }, "conversion complete");
    }

    const file = new File([new Uint8Array(fileBuffer)], fileName, { type: fileMime });

    const transcription = await openai.audio.transcriptions.create({
      model: "gpt-4o-mini-transcribe",
      file,
      response_format: "json",
    });

    req.log.info({ textLength: (transcription.text ?? "").length }, "transcription complete");
    res.json({ text: transcription.text ?? "" });
  } catch (err) {
    req.log.error({ err }, "transcription error");
    res.status(500).json({ error: "Transcription failed. Please try again." });
  } finally {
    if (reservation) reservation.busy = false;
  }
});

export default router;
