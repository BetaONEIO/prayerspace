const { readFile } = require("node:fs/promises");
const { resolve } = require("node:path");
async function main() {
  const ref = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
  const query = await readFile(resolve(__dirname, "../supabase/tests/privacy-services.sql"), "utf8");
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, read_only: false }), signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Privacy assertions HTTP ${response.status}: ${await response.text()}`);
  // Print only the final assertion label, not fixture account rows or private records.
  const results = await response.json();
  const labels = results.filter(row => typeof row.result === "string");
  if (!labels.length) throw new Error("Privacy assertions did not return a completion label");
  labels.forEach(row => console.log(row.result));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
