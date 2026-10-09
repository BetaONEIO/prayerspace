import assert from "node:assert/strict";
import { test } from "node:test";
import { TOUR_STEPS, TOUR_FINAL_STEP, newestTourProgress, parseTourProgress } from "./tourSteps";

const saved = { status: "in_progress", step: 3, updated_at: "2026-10-09T10:00:00.000Z", tour_version: 2 };
test("the condensed tour has five key chapters on real screens", () => {
  assert.equal(TOUR_STEPS.length, 5);
  assert.equal(TOUR_STEPS[0].section, "Feed");
  assert.equal(TOUR_STEPS[1].target, "create-prayer");
  assert.equal(TOUR_STEPS[2].section, "Groups");
  assert.equal(TOUR_STEPS[3].route, "/journal");
  assert.equal(TOUR_STEPS[TOUR_FINAL_STEP].route, "/prayer-mode");
  assert.ok(TOUR_STEPS.every(step => step.description.split(/\s+/).length <= 36));
});
test("progress accepts valid saved steps and refuses corrupt or out-of-range state", () => {
  assert.deepEqual(parseTourProgress(saved), saved);
  for (const bad of [null, {}, { ...saved, step: TOUR_STEPS.length }, { ...saved, step: -1 },
    { ...saved, step: 1.5 }, { ...saved, step: "3" }, { ...saved, status: "paid" }, { ...saved, updated_at: "bad" },
    { ...saved, tour_version: 3 }, { ...saved, tour_version: "2" }]) {
    assert.equal(parseTourProgress(bad), null);
  }
});
test("older checkpoints resume at matching chapters and never reset completion or skip", () => {
  const { tour_version: _version, ...legacy } = saved;
  const expected = [0, 1, 0, 2, 2, 2, 0, 3, 1, 4, 4, 4, 4];
  for (let step = 0; step < expected.length; step++) {
    assert.equal(parseTourProgress({ ...legacy, step })?.step, expected[step]);
    assert.equal(parseTourProgress({ ...legacy, step, tour_version: 1 })?.tour_version, 2);
    for (const status of ["completed", "skipped"]) {
      const restored = parseTourProgress({ ...legacy, step, status })!;
      assert.equal(restored.status, status);
      assert.equal(restored.step, TOUR_FINAL_STEP);
    }
  }
  assert.equal(parseTourProgress({ ...legacy, step: 13 }), null);
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
