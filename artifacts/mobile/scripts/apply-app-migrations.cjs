const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const { resolve, basename } = require("node:path");

async function main() {
  assert.equal(process.env.APP_MIGRATIONS_DEV_PROJECT_CONFIRMED, "yes",
    "Explicit development-project confirmation is required");
  const url = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL);
  assert.ok(url.hostname.endsWith(".supabase.co"));
  const ref = url.hostname.split(".")[0];
  assert.ok(process.env.SUPABASE_ACCESS_TOKEN, "Management access missing");
  const headers = { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" };
  const base = `https://api.supabase.com/v1/projects/${ref}`;
  const identity = await fetch(base, { headers, signal: AbortSignal.timeout(20000) });
  assert.ok(identity.ok, `Project identity HTTP ${identity.status}`);
  const project = await identity.json();
  assert.equal(project.id ?? project.ref, ref);
  const files = process.argv.slice(2);
  assert.ok(files.length, "Provide migration filenames");
  for (const file of files) {
    assert.equal(basename(file), file, "Use migration basenames only");
    assert.ok(/^\d{8}_[a-z0-9_]+\.sql$/.test(file), "Invalid migration filename");
    const query = await readFile(resolve(__dirname, "../supabase/migrations", file), "utf8");
    const response = await fetch(`${base}/database/query`, {
      method: "POST", headers, body: JSON.stringify({ query, read_only: false }),
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) {
      // SQL error details contain no credentials; needed for actionable diagnosis.
      throw new Error(`Migration ${file} HTTP ${response.status}: ${await response.text()}`);
    }
    console.log(`PASS: applied ${file} to the verified app project`);
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
