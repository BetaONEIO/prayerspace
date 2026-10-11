import { processDeletionBatch } from "./accountServices";
import { logger } from "./logger";

let running = false;
export async function runAccountDeletionWorker() {
  if (running) return;
  running = true;
  try {
    const results = await processDeletionBatch();
    if (results.some(result => !result)) logger.warn("Account deletion cleanup will be retried");
  } catch {
    logger.warn("Account deletion queue is temporarily unavailable");
  } finally { running = false; }
}

export function startAccountDeletionWorker() {
  void runAccountDeletionWorker();
  const timer = setInterval(() => void runAccountDeletionWorker(), 60000);
  timer.unref();
}
