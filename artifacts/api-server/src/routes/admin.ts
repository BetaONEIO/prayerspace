import { Router, type IRouter } from "express";

const router: IRouter = Router();

// The former public bulk-deletion helper is retired. Account administration
// must never be exposed through a service-role key to arbitrary API callers.
router.post("/admin/delete-users", (_req, res) => {
  res.status(410).json({ error: "Bulk account deletion is not available through this API." });
});

export default router;
