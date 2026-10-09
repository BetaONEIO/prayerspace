import assert from "node:assert/strict";
import { test } from "node:test";
import { TOUR_STEPS, TOUR_FINAL_STEP, newestTourProgress, parseTourProgress } from "./tourSteps";

const saved = { status: "in_progress", step: 3, updated_at: "2026-10-09T10:00:00.000Z" };
test("the expanded tour has thirteen ordered steps and only real screen routes", () => {
  assert.equal(TOUR_STEPS.length, 13);
  assert.equal(TOUR_STEPS[3].route, "/find-friend");
  assert.equal(TOUR_STEPS[6].section, "Feed");
  assert.equal(TOUR_STEPS[7].route, "/journal");
  assert.equal(TOUR_STEPS[8].route, "/my-posts");
  assert.equal(TOUR_STEPS[9].route, "/meditative-prayer");
  assert.equal(TOUR_STEPS[10].route, "/prayer-mode");
  assert.equal(TOUR_STEPS[11].route, "/select-recipients");
  assert.equal(TOUR_STEPS[TOUR_FINAL_STEP].title, "You're Ready to Get Started!");
});
test("progress accepts valid saved steps and refuses corrupt or out-of-range state", () => {
  assert.deepEqual(parseTourProgress(saved), saved);
  for (const bad of [null, {}, { ...saved, step: TOUR_STEPS.length }, { ...saved, step: -1 },
    { ...saved, step: 1.5 }, { ...saved, step: "3" }, { ...saved, status: "paid" }, { ...saved, updated_at: "bad" }]) {
    assert.equal(parseTourProgress(bad), null);
  }
});
test("newer offline completion/skip survives older remote progress", () => {
  const remote = parseTourProgress(saved)!;
  for (const status of ["completed", "skipped"]) {
    const local = parseTourProgress({ ...saved, status, updated_at: "2026-10-09T11:00:00.000Z" })!;
    assert.equal(newestTourProgress(local, remote), local);
    assert.equal(newestTourProgress(remote, local), local);
  }
  assert.equal(newestTourProgress(null, remote), remote);
  assert.equal(newestTourProgress(remote, null), remote);
});
