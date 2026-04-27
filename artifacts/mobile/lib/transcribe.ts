import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

function getMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.includes(".m4a")) return "audio/mp4";
  if (lower.includes(".mp4")) return "audio/mp4";
  if (lower.includes(".webm")) return "audio/webm";
  if (lower.includes(".ogg")) return "audio/ogg";
  return "audio/wav";
}

export async function transcribeAudio(audioUri: string): Promise<string> {
  if (!audioUri) {
    throw new Error("No audio file was found. Please record again.");
  }

  console.log("[transcribeAudio] URI:", audioUri);
  console.log("[transcribeAudio] Platform:", Platform.OS);
  console.log("[transcribeAudio] API URL:", API_URL);

  let audioBase64: string;
  let mimeType: string;

  if (Platform.OS === "web") {
    console.log("[transcribeAudio] Fetching blob for web...");
    const response = await fetch(audioUri);
    if (!response.ok) {
      throw new Error("Could not read the recorded audio. Please try again.");
    }
    const blob = await response.blob();
    mimeType = blob.type || "audio/webm";
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    audioBase64 = btoa(binary);
    console.log("[transcribeAudio] Web base64 length:", audioBase64.length);
  } else {
    mimeType = getMimeType(audioUri);
    console.log("[transcribeAudio] Reading file, mimeType:", mimeType);
    try {
      audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (readErr) {
      console.error("[transcribeAudio] File read error:", readErr);
      throw new Error("Could not read the recorded audio. Please record again.");
    }
    if (!audioBase64) {
      throw new Error("Recorded audio file was empty. Please record again.");
    }
    console.log("[transcribeAudio] Native base64 length:", audioBase64.length);
  }

  if (!API_URL) {
    throw new Error("Transcription service is not configured.");
  }

  console.log("[transcribeAudio] Sending to API server...");
  const response = await fetch(`${API_URL}/api/transcribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioBase64, mimeType }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("[transcribeAudio] Server error:", response.status, body);
    throw new Error(`Transcription failed (${response.status}). Please try again.`);
  }

  const data = await response.json() as { text?: string; error?: string };
  if (data.error) {
    throw new Error(data.error);
  }

  console.log("[transcribeAudio] Result:", (data.text ?? "").slice(0, 100));
  return data.text ?? "";
}
