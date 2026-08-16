import { Router } from "express";
import type { ApiResponse } from "@agentflow/shared";

const router = Router();

/**
 * GET /api/v1/ready
 *
 * Confirms that the application is ready to accept traffic.
 * In Phase 1, this simply returns ready: true.
 * Future phases may add dependency checks (e.g., database connection).
 */
router.get("/ready", (req, res) => {
  const response: ApiResponse<{ status: "ready" }> = {
    success: true,
    data: {
      status: "ready",
    },
    requestId: req.headers["x-request-id"] as string,
  };

  res.json(response);
});

export default router;
