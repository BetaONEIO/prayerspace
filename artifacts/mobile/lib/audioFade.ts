import { Audio } from "expo-av";

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

/**
 * Smoothly lowers a loaded sound's volume before pausing it.
 * Keeping the pause until after the fade preserves the current position.
 */
export async function fadeOutAndPause(
  sound: Audio.Sound,
  duration = 450,
  steps = 9,
): Promise<void> {
  const status = await sound.getStatusAsync();
  if (!status.isLoaded) return;

  const startVolume = Math.max(0, status.volume ?? 1);
  const stepDuration = duration / steps;

  for (let step = 1; step <= steps; step += 1) {
    await sound.setVolumeAsync(startVolume * (1 - step / steps));
    if (step < steps) await wait(stepDuration);
  }

  await sound.pauseAsync();
}