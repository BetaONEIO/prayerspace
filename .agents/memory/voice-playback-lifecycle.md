---
name: Native voice playback lifecycle
description: Durable guidance for Expo AV sound objects used by voice recording previews.
---

Treat Expo AV sound instances as short-lived native resources: playback may race with
preview teardown, re-recording, or an incomplete load. Check `getStatusAsync()` before
playback, serialize toggle actions, and catch native load/play/unload failures.

**Why:** Calling `playAsync()` on a sound that has already unloaded or is not loaded
surfaces an uncaught native error and can crash the Expo preview.

**How to apply:** Use a load generation/cancellation guard when creating preview sounds,
and make playback failure recoverable by resetting playing state rather than throwing.