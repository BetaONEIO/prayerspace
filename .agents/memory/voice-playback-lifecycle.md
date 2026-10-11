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

Do not rely only on browser playback callbacks to keep the play/pause control current.
The displayed action and accessibility label must agree, and a pause action must clear
playing state after the native command succeeds.

**Why:** Expo AV's web sound adapter reports updates through time events; a completed
clip can leave a stale Pause label. Choosing the next action only from a fresh native
status can then replay an ended clip instead of honoring the displayed Pause action.

**How to apply:** Serialize commands, ignore intermediate callbacks while a command
is pending, and check completion while playback is active. Verify pause with a clip
long enough to interact before it ends.