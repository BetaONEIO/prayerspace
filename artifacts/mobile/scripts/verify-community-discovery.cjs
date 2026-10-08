/* Uses the app-configured development project, not the separately bound connector.
 * --apply adds only the discovery catalogue. --verify-rls tests inside ROLLBACK.
 * No credentials, user records, or returned community contents are logged.
 */
const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const { join } = require("node:path");
const { randomUUID } = require("node:crypto");

function required(key) {
  assert.ok(process.env[key], `Missing ${key}`);
  return process.env[key];
}

const appUrl = new URL(required("EXPO_PUBLIC_SUPABASE_URL"));
assert.ok(appUrl.hostname.endsWith(".supabase.co"), "Expected configured Supabase project host");
const ref = appUrl.hostname.split(".")[0];
const managementUrl = `https://api.supabase.com/v1/projects/${ref}`;
const headers = {
  Authorization: `Bearer ${required("SUPABASE_ACCESS_TOKEN")}`,
  "Content-Type": "application/json",
};

async function sql(query, readOnly = true) {
  const response = await fetch(`${managementUrl}/database/query`, {
    method: "POST", headers,
    body: JSON.stringify({ query, read_only: readOnly }),
    signal: AbortSignal.timeout(30000),
  });
  assert.ok(response.ok, `SQL check HTTP ${response.status}`);
  return response.json();
}

async function apiCheck(search) {
  const url = new URL("/rest/v1/communities", appUrl.origin);
  url.searchParams.set("select", "id,name,description,member_count,is_official,is_private,accent_color,icon_letter,banner_image");
  url.searchParams.set("is_private", "eq.false");
  url.searchParams.set("order", "is_official.desc,member_count.desc,id.asc");
  url.searchParams.set("limit", "50");
  if (search) {
    const term = JSON.stringify(`%${search.trim().replace(/[\\%_]/g, "\\$&")}%`);
    url.searchParams.set("or", `(name.ilike.${term},description.ilike.${term})`);
  }
  const response = await fetch(url, {
    headers: { apikey: required("EXPO_PUBLIC_SUPABASE_ANON_KEY") },
    signal: AbortSignal.timeout(20000),
  });
  assert.equal(response.status, 200, "Anonymous discovery HTTP 200");
  const rows = await response.json();
  assert.ok(Array.isArray(rows) && rows.length <= 50);
  assert.ok(rows.every((row) => row.is_private === false));
}

async function main() {
  const apply = process.argv.includes("--apply");
  const verifyRls = process.argv.includes("--verify-rls");
  if (apply || verifyRls) {
    assert.equal(process.env.COMMUNITY_DISCOVERY_DEV_PROJECT_CONFIRMED, "yes",
      "Explicit development-project confirmation is required for SQL changes/tests");
  }
  const projectResponse = await fetch(managementUrl, {
    headers, signal: AbortSignal.timeout(20000),
  });
  assert.ok(projectResponse.ok, `Project identity HTTP ${projectResponse.status}`);
  const project = await projectResponse.json();
  assert.equal(project.id ?? project.ref, ref, "Management target matches app project");

  if (apply) {
    const preflight = await sql("select to_regclass('public.communities') is null as missing");
    assert.equal(preflight[0]?.missing, true,
      "Catalogue already exists; inspect schema and permissions instead of overwriting them");
    await sql(await readFile(join(__dirname, "../supabase/migrations/20261008_community_discovery.sql"), "utf8"), false);
    console.log("PASS: discovery migration applied to the verified app project");
  }
  const schema = await sql(
    "select count(*)::integer as fields from information_schema.columns where table_schema='public' and table_name='communities' and column_name in ('id','name','description','member_count','is_official','is_private','accent_color','icon_letter','banner_image')");
  assert.equal(schema[0]?.fields, 9, "All discovery fields available");

  if (verifyRls) {
    const publicId = randomUUID(), privateId = randomUUID();
    const ids = `'${publicId}'::uuid, '${privateId}'::uuid`;
    const roleChecks = ["anon", "authenticated"].map((role) => `
      set local role ${role};
      do $check$
      begin
        if (select count(id) from public.communities where id='${publicId}') <> 1 then
          raise exception 'Public discovery read denied';
        end if;
        if (select count(id) from public.communities where id='${privateId}') <> 0 then
          raise exception 'Private community exposed';
        end if;
        if (select count(id) from (
          select id from public.communities where is_private=false
          and (name ilike '%Catalogue verification%' or description ilike '%Catalogue verification%')
          order by is_official desc,member_count desc,id limit 50
        ) filtered where id in (${ids})) <> 1 then
          raise exception 'Filtered discovery mismatch';
        end if;
        begin
          update public.communities set is_official=true where id='${publicId}';
          raise exception 'Client mutation allowed';
        exception when insufficient_privilege then null;
        end;
        begin
          insert into public.communities(name) values ('Unexpected client community');
          raise exception 'Client creation allowed';
        exception when insufficient_privilege then null;
        end;
        begin
          delete from public.communities where id='${publicId}';
          raise exception 'Client deletion allowed';
        exception when insufficient_privilege then null;
        end;
      end $check$;
      reset role;`).join("\n");
    await sql(`begin;
      insert into public.communities(id,name,is_private,member_count) values
        ('${publicId}', 'Catalogue verification, (public)', false, 1),
        ('${privateId}', 'Catalogue verification, (private)', true, 2);
      ${roleChecks}
      rollback;`, false);
    const cleanup = await sql(`select count(*)::integer as remaining from public.communities where id in (${ids})`);
    assert.equal(cleanup[0]?.remaining, 0, "Transaction fixtures rolled back");
    console.log("PASS: public discovery/filtering, private exclusion and mutation denials for both client roles; fixtures rolled back");
  }
  await apiCheck();
  for (const search of ["Catalogue verification", "church, (north)", 'name "quoted"', "100%_value\\"]) {
    await apiCheck(search);
  }
  console.log("PASS: exact anonymous app discovery/search requests return HTTP 200 and public-only results");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Community discovery verification failed");
  process.exitCode = 1;
});
