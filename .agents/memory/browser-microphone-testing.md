---
name: Browser microphone testing
description: Headless microphone limitations and safe verification of the real recording pipeline.
---
Granting browser microphone permission does not create an audio-input device.
For an emulated microphone, create a fresh WebAudio-backed MediaStream for every
getUserMedia call, while retaining the real MediaRecorder and application pipeline.

**Why:** The test browser had no native input devices. Expo's permission probe
stops the stream's tracks, so reusing that stream for recording would fail.

**How to apply:** Label this as synthetic-microphone browser verification, not
iOS/Android permission or acoustic-output verification. Never substitute direct
file uploads or mocked recorder results for the record-preview-send journey.
