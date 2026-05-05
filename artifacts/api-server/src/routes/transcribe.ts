import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, readFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);

const router: IRouter = Router();

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] ?? "dummy",
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
    ]);
    const wavBuffer = await readFile(outputPath);
    return wavBuffer;
  } finally {
    await unlink(inputPath).catch(() => undefined);
    await unlink(outputPath).catch(() => undefined);
  }
}

router.post("/transcribe", async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body as {
      audioBase64?: string;
      mimeType?: string;
    };

    if (!audioBase64) {
      res.status(400).json({ error: "audioBase64 is required" });
      return;
    }

    let buffer = Buffer.from(audioBase64, "base64");
    req.log.info({ mimeType, bufferBytes: buffer.length }, "transcribe request received");

    const ext = mimeType?.includes("webm")
      ? "webm"
      : mimeType?.includes("mp4") || mimeType?.includes("m4a")
      ? "m4a"
      : "wav";

    let fileBuffer = buffer;
    let fileName = `audio.${ext}`;
    let fileMime = mimeType ?? "audio/wav";

    if (ext !== "wav") {
      req.log.info({ ext }, "converting to wav via ffmpeg");
      fileBuffer = await convertToWav(buffer, ext);
      fileName = "audio.wav";
      fileMime = "audio/wav";
      req.log.info({ wavBytes: fileBuffer.length }, "conversion complete");
    }

    const file = new File([fileBuffer], fileName, { type: fileMime });

    const transcription = await openai.audio.transcriptions.create({
      model: "gpt-4o-mini-transcribe",
      file,
      response_format: "json",
    });

    req.log.info({ textLength: (transcription.text ?? "").length }, "transcription complete");
    res.json({ text: transcription.text ?? "" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    req.log.error({ err }, "transcription error");
    res.status(500).json({ error: message });
  }
});

export default router;
