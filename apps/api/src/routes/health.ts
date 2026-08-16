import { Router } from "express";
import type { ApiResponse, HealthResponse } from "@agentflow/shared";
import { config } from "../config.js";

const router = Router();

/**
 * GET /api/v1/health
 *
 * Returns current service health, version, uptime, and environment.
 */
router.get("/health", (req, res) => {
  const response: ApiResponse<HealthResponse> = {
    success: true,
    data: {
      status: "healthy",
      version: config.version,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: config.env,
    },
    requestId: req.headers["x-request-id"] as string,
  };

  res.json(response);
});

export default router;
