export type AccountFile = { bucket: string; name: string; metadata?: unknown };

function configuration(service = false) {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = service ? process.env.SUPABASE_SERVICE_ROLE_KEY : process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Account service is not configured");
  return { base: new URL(url).origin, key };
}

export async function supabaseRequest(path: string, options: RequestInit = {}, authorization?: string) {
  const { base, key } = configuration(!authorization);
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { apikey: key, Authorization: authorization ?? `Bearer ${key}`,
      "Content-Type": "application/json", ...options.headers },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Account service HTTP ${response.status}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function accountRpc(name: string, body: unknown, authorization?: string) {
  return supabaseRequest(`/rest/v1/rpc/${name}`, { method: "POST", body: JSON.stringify(body) }, authorization);
}

export async function checkDeletionService(userId: string) {
  const user = await supabaseRequest(`/auth/v1/admin/users/${encodeURIComponent(userId)}`);
  if (user?.id !== userId) throw new Error("Deletion administration targets a different account");
}

export async function attachFileDownloads(data: Record<string, unknown>, authorization: string) {
  const files = data.storageFiles as AccountFile[] | undefined;
  if (!Array.isArray(files)) throw new Error("Export file manifest is unavailable");
  const byBucket = new Map<string, AccountFile[]>();
  for (const file of files) {
    if (typeof file.bucket !== "string" || typeof file.name !== "string") throw new Error("Invalid export manifest");
    const bucket = byBucket.get(file.bucket) ?? [];
    bucket.push(file); byBucket.set(file.bucket, bucket);
  }
  const exportedFiles: unknown[] = [];
  const { base } = configuration();
  for (const [bucket, list] of byBucket) {
    for (let index = 0; index < list.length; index += 100) {
      const batch = list.slice(index, index + 100);
      const signed = await supabaseRequest(`/storage/v1/object/sign/${encodeURIComponent(bucket)}`, {
        method: "POST", body: JSON.stringify({ expiresIn: 3600, paths: batch.map(file => file.name) }),
      // The manifest is returned by the caller-authenticated own-account RPC,
      // never supplied by the request. Private group objects cannot be signed
      // through the normal client role; exporting one's own files is separate
      // from reading other group members' content.
      }, bucket === "group-chat-private" ? undefined : authorization) as Array<{ path: string; signedURL?: string; error?: unknown }>;
      if (!Array.isArray(signed) || signed.length !== batch.length) throw new Error("Could not export file links");
      for (const file of batch) {
        const link = signed.find(item => item.path === file.name);
        if (!link?.signedURL || link.error) throw new Error("Could not export an owned file link");
        exportedFiles.push({ ...file, downloadUrl: `${base}/storage/v1${link.signedURL}`,
          downloadExpiresAt: new Date(Date.now() + 3600000).toISOString() });
      }
    }
  }
  return { ...data, storageFiles: exportedFiles };
}

export interface DeletionDependencies {
  rpc: typeof accountRpc;
  request: typeof supabaseRequest;
}

// Only the new, explicit self-deletion ledger is processed. Historic profile
// flags are never scanned or converted into jobs.
export async function processDeletionBatch(
  dependencies: DeletionDependencies = { rpc: accountRpc, request: supabaseRequest },
) {
  const jobs = await dependencies.rpc("claim_account_deletions", {}) as Array<{ user_id: string }>;
  if (!Array.isArray(jobs)) throw new Error("Deletion queue unavailable");
  const results: boolean[] = [];
  for (const job of jobs) {
    try {
      await dependencies.request(`/auth/v1/admin/users/${encodeURIComponent(job.user_id)}`, {
        method: "PUT", body: JSON.stringify({ ban_duration: "876000h" }),
      });
      const files = await dependencies.rpc("deletion_owned_files", { p_user_id: job.user_id }) as AccountFile[];
      if (!Array.isArray(files)) throw new Error("Owned file inventory unavailable");
      const buckets = new Map<string, string[]>();
      for (const file of files) {
        const names = buckets.get(file.bucket) ?? [];
        names.push(file.name); buckets.set(file.bucket, names);
      }
      for (const [bucket, names] of buckets) {
        for (let i = 0; i < names.length; i += 100) {
          await dependencies.request(`/storage/v1/object/${encodeURIComponent(bucket)}`, {
            method: "DELETE", body: JSON.stringify({ prefixes: names.slice(i, i + 100) }),
          });
        }
      }
      await dependencies.rpc("prepare_account_deletion", { p_user_id: job.user_id });
      await dependencies.request(`/auth/v1/admin/users/${encodeURIComponent(job.user_id)}`, { method: "DELETE" });
      results.push(true);
    } catch {
      // The database lease expires for a later retry. No private contents or
      // account IDs are logged, and no completion is reported for this job.
      results.push(false);
    }
  }
  return results;
}
