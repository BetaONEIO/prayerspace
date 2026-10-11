import assert from "node:assert/strict";
import test from "node:test";
import { processDeletionBatch, type DeletionDependencies } from "./accountServices";

function fixture(fail?: string) {
  const events: string[] = [];
  const dependencies: DeletionDependencies = {
    rpc: async (name, _body) => {
      events.push(name);
      if (name === fail) throw Error("retry");
      if (name === "claim_account_deletions") return [{ user_id: "confirmed-owner" }];
      if (name === "deletion_owned_files") return [{ bucket: "avatars", name: "confirmed-owner/photo.jpg" }];
      return null;
    },
    request: async (path, options) => {
      events.push(`${options?.method} ${path}`);
      if (options?.method === fail) throw Error("retry");
      if (path.includes("storage")) assert.deepEqual(JSON.parse(String(options?.body)), { prefixes: ["confirmed-owner/photo.jpg"] });
      return null;
    },
  };
  return { dependencies, events };
}
test("only confirmed ledger jobs are processed; files are removed before auth identity", async () => {
  const f = fixture();
  assert.deepEqual(await processDeletionBatch(f.dependencies), [true]);
  assert.deepEqual(f.events, ["claim_account_deletions", "PUT /auth/v1/admin/users/confirmed-owner",
    "deletion_owned_files", "DELETE /storage/v1/object/avatars", "prepare_account_deletion",
    "DELETE /auth/v1/admin/users/confirmed-owner"]);
});
test("failed file removal prevents record/auth deletion and keeps the job retryable", async () => {
  const f = fixture("DELETE");
  assert.deepEqual(await processDeletionBatch(f.dependencies), [false]);
  assert.equal(f.events.includes("prepare_account_deletion"), false);
  assert.equal(f.events.includes("DELETE /auth/v1/admin/users/confirmed-owner"), false);
});
test("cleanup failure never reports a completed deletion", async () => {
  const f = fixture("prepare_account_deletion");
  assert.deepEqual(await processDeletionBatch(f.dependencies), [false]);
  assert.equal(f.events.includes("DELETE /auth/v1/admin/users/confirmed-owner"), false);
});
test("empty deletion ledger cannot process historic flags or arbitrary accounts", async () => {
  let touched = false;
  const results = await processDeletionBatch({ rpc: async () => [], request: async () => { touched = true; } });
  assert.deepEqual(results, []); assert.equal(touched, false);
});
