import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { Readable } from "stream";

const router: IRouter = Router();

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] ?? "dummy",
});

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

    const buffer = Buffer.from(audioBase64, "base64");
    const ext = mimeType?.includes("webm")
      ? "webm"
      : mimeType?.includes("mp4") || mimeType?.includes("m4a")
      ? "m4a"
      : "wav";

    const file = new File([buffer], `audio.${ext}`, {
      type: mimeType ?? "audio/wav",
    });

    const transcription = await openai.audio.transcriptions.create({
      model: "gpt-4o-mini-transcribe",
      file,
      response_format: "json",
    });

    res.json({ text: transcription.text ?? "" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    res.status(500).json({ error: message });
  }
});

export default router;
