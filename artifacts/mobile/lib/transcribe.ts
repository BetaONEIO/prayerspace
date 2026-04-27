import { createOpenAI } from "@ai-sdk/openai";
import { experimental_transcribe as transcribe } from "ai";
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

const TOOLKIT_URL = process.env.EXPO_PUBLIC_TOOLKIT_URL ?? "https://toolkit.rork.com";
const SECRET_KEY = process.env.EXPO_PUBLIC_RORK_TOOLKIT_SECRET_KEY ?? "";

const openai = createOpenAI({
  baseURL: `${TOOLKIT_URL}/v2/openai/v1`,
  apiKey: SECRET_KEY,
});

export async function transcribeAudio(audioUri: string): Promise<string> {
  if (!audioUri) {
    throw new Error("No audio file was found. Please record again.");
  }
  console.log("[transcribeAudio] Starting transcription, URI:", audioUri);
  console.log("[transcribeAudio] Platform:", Platform.OS);
  console.log("[transcribeAudio] Toolkit URL:", TOOLKIT_URL);

  let audioData: string;

  if (Platform.OS === "web") {
    const response = await fetch(audioUri);
    if (!response.ok) {
      throw new Error("Could not read the audio file. Please record again.");
    }
    console.log("[transcribeAudio] Fetching blob for web...");
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    audioData = btoa(binary);
    console.log("[transcribeAudio] Web base64 length:", audioData.length);
  } else {
    console.log("[transcribeAudio] Reading file as base64...");
    const info = await FileSystem.getInfoAsync(audioUri);
    if (!info.exists) {
      throw new Error("Recorded audio was not available. Please record again.");
    }
    audioData = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log("[transcribeAudio] Native base64 length:", audioData.length);
  }

  console.log("[transcribeAudio] Sending to Whisper via AI SDK...");
  const result = await transcribe({
    model: openai.transcription("whisper-1"),
    audio: audioData,
  });

  console.log("[transcribeAudio] Result:", result.text?.slice(0, 100));
  return result.text ?? "";
}
