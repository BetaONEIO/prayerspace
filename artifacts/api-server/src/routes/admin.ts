import { Router, type Request, type Response } from "express";

const router = Router();

const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
const adminToken = (process.env.ADMIN_DELETE_TOKEN ?? "").trim();

function normalizeSupabaseUrl(input: string) {
  if (!input) return "";
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  try {
    const parsed = new URL(withProtocol);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return withProtocol.replace(/\/+$/, "").replace(/\/(rest|auth|storage|realtime)\/v\d+.*$/i, "");
  }
}

function deny(res: Response, status: number, message: string) {
  return res.status(status).json({ error: message });
}

router.post("/admin/delete-users", async (req: Request, res: Response) => {
  if (!adminToken || req.header("x-admin-token") !== adminToken) {
    return deny(res, 401, "Unauthorized");
  }
  if (!supabaseUrl || !serviceRoleKey) {
    return deny(res, 500, "Supabase admin config missing");
  }

  const emails = Array.isArray(req.body?.emails) ? req.body.emails : [];
  const uniqueEmails = [...new Set(emails.map((email) => String(email).trim().toLowerCase()).filter(Boolean))];
  if (!uniqueEmails.length) {
    return deny(res, 400, "No emails provided");
  }

  const baseUrl = normalizeSupabaseUrl(supabaseUrl);
  const results: Array<{ email: string; deleted: boolean; error?: string }> = [];

  const usersResponse = await fetch(`${baseUrl}/auth/v1/admin/users?per_page=1000`, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!usersResponse.ok) {
    return deny(res, usersResponse.status, await usersResponse.text());
  }

  const usersData = (await usersResponse.json()) as { users?: Array<{ id: string; email?: string | null }> };
  const users = usersData.users ?? [];

  for (const email of uniqueEmails) {
    const user = users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (!user) {
      results.push({ email, deleted: false, error: "User not found" });
      continue;
    }

    const deleteResponse = await fetch(`${baseUrl}/auth/v1/admin/users/${user.id}`, {
      method: "DELETE",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!deleteResponse.ok) {
      results.push({ email, deleted: false, error: await deleteResponse.text() });
      continue;
    }

    results.push({ email, deleted: true });
  }

  return res.json({ ok: true, results });
});

export default router;