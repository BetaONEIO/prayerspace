import { useState, useRef, useCallback } from "react";
import { Platform } from "react-native";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";

interface UseAudioRecordingReturn {
  isRecording: boolean;
  duration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  error: string | null;
}

export function useAudioRecording(): UseAudioRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startTimer = useCallback(() => {
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);

    if (Platform.OS === "web") {
      try {
        console.log("[AudioRecording] Requesting microphone access (web)...");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        chunksRef.current = [];

        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        recorder.start(250);
        setIsRecording(true);
        startTimer();
        console.log("[AudioRecording] Web recording started");
      } catch (err) {
        console.error("[AudioRecording] Web recording error:", err);
        setError("Could not access microphone. Please check permissions.");
      }
      return;
    }

    try {
      console.log("[AudioRecording] Requesting permissions...");
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setError("Microphone permission is required to record prayers.");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log("[AudioRecording] Creating recording...");
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: ".m4a",
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
        },
        ios: {
          extension: ".wav",
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
        },
        isMeteringEnabled: false,
        web: {},
      });

      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
      startTimer();
      console.log("[AudioRecording] Native recording started");
    } catch (err) {
      console.error("[AudioRecording] Native recording error:", err);
      setError("Failed to start recording. Please try again.");
    }
  }, [startTimer]);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    stopTimer();
    setIsRecording(false);

    if (Platform.OS === "web") {
      return new Promise((resolve) => {
        const recorder = mediaRecorderRef.current;
        if (!recorder) {
          resolve(null);
          return;
        }

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
          const url = URL.createObjectURL(blob);
          console.log("[AudioRecording] Web recording stopped, blob size:", blob.size);

          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
          mediaRecorderRef.current = null;
          chunksRef.current = [];
          resolve(url);
        };

        recorder.stop();
      });
    }

    try {
      const recording = recordingRef.current;
      if (!recording) return null;

      console.log("[AudioRecording] Stopping native recording...");
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const tempUri = recording.getURI();
      recordingRef.current = null;
      console.log("[AudioRecording] Native recording stopped, URI:", tempUri);

      if (!tempUri) return null;

      // Copy the recording to a stable location in document directory so it
      // is guaranteed to exist when the review screen reads it.
      const ext = tempUri.split(".").pop() ?? "m4a";
      const destUri = `${FileSystem.documentDirectory}prayer_recording_${Date.now()}.${ext}`;
      await FileSystem.copyAsync({ from: tempUri, to: destUri });
      console.log("[AudioRecording] Copied recording to:", destUri);
      return destUri;
    } catch (err) {
      console.error("[AudioRecording] Stop recording error:", err);
      setError("Failed to stop recording.");
      return null;
    }
  }, [stopTimer]);

  return { isRecording, duration, startRecording, stopRecording, error };
}
