import { Router } from "express";
import { requireSupabaseUser } from "../lib/supabaseAuth";
import { accountRpc, attachFileDownloads, checkDeletionService } from "../lib/accountServices";
import { runAccountDeletionWorker } from "../lib/accountDeletionWorker";

const router = Router();
router.use("/account", requireSupabaseUser, (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

router.get("/account/export", async (req, res) => {
  if (req.query.expectedUserId !== res.locals.userId) {
    res.status(409).json({ error: "Your account changed. Reopen this screen." }); return;
  }
  try {
    const authorization = req.get("authorization")!;
    const raw = await accountRpc("export_own_account_data", { p_expected_user_id: res.locals.userId }, authorization);
    const data = await attachFileDownloads(raw, authorization);
    res.json({ version: 1, userId: res.locals.userId, exportedAt: new Date().toISOString(), data });
  } catch {
    req.log.warn("Account export unavailable");
    res.status(503).json({ error: "Your data could not be exported. No partial export was delivered. Please retry." });
  }
});

router.post("/account/deletion", async (req, res) => {
  if (req.body?.expectedUserId !== res.locals.userId) {
    res.status(409).json({ error: "Your account changed. Reopen this screen." }); return;
  }
  if (req.body?.confirmation !== "DELETE") {
    res.status(400).json({ error: "Explicit deletion confirmation is required." }); return;
  }
  try {
    await checkDeletionService(String(res.locals.userId));
    // Use the caller's verified token, not the service role, to enqueue.
    // Recent authentication and account ownership are also checked in SQL.
    const authUrl = new URL("/auth/v1/user", new URL(process.env.EXPO_PUBLIC_SUPABASE_URL!).origin);
    const response = await fetch(authUrl, { headers: { apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      Authorization: req.get("authorization")! }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("Authentication unavailable");
    const user = await response.json() as { last_sign_in_at?: string };
    const signInAt = Date.parse(user.last_sign_in_at ?? "");
    if (!Number.isFinite(signInAt) || Date.now() - signInAt > 15 * 60000) {
      res.status(403).json({ error: "Sign out and sign back in, then confirm deletion within 15 minutes." }); return;
    }
    await accountRpc("request_own_account_deletion", { p_expected_user_id: res.locals.userId }, req.get("authorization")!);
    res.status(202).json({ status: "requested" });
    void runAccountDeletionWorker();
  } catch {
    req.log.warn("Account deletion request unavailable");
    res.status(503).json({ error: "Deletion was not confirmed. Please retry or contact support." });
  }
});
export default router;
