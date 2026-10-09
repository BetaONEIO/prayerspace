import type { RequestHandler } from "express";

export const requireSupabaseUser: RequestHandler = async (req, res, next) => {
  const match = /^Bearer ([^\s]+)$/i.exec(req.get("authorization") ?? "");
  if (!match) {
    res.status(401).json({ error: "Please sign in to continue." });
    return;
  }
  const configuredUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!configuredUrl || !apiKey) {
    res.status(503).json({ error: "Authentication is temporarily unavailable." });
    return;
  }
  try {
    const response = await fetch(new URL("/auth/v1/user", new URL(configuredUrl).origin), {
      headers: { apikey: apiKey, Authorization: `Bearer ${match[1]}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      res.status(response.status >= 500 ? 503 : 401).json({
        error: response.status >= 500 ? "Authentication is temporarily unavailable." : "Your session has expired. Please sign in again.",
      });
      return;
    }
    const user = await response.json() as { id?: unknown };
    if (typeof user.id !== "string" || !/^[0-9a-f-]{36}$/i.test(user.id)) {
      res.status(401).json({ error: "Invalid user session." });
      return;
    }
    res.locals.userId = user.id;
    next();
  } catch {
    res.status(503).json({ error: "Authentication is temporarily unavailable." });
  }
};
