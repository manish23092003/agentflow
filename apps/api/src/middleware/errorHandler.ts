import type { ErrorRequestHandler } from "express";
import type { Logger } from "@agentflow/shared";

/**
 * Centralized error-handling middleware.
 *
 * Catches unhandled errors, logs them with the request ID,
 * and returns a structured JSON error response.
 *
 * Must be registered LAST in the middleware chain (Express
 * identifies error handlers by the 4-parameter signature).
 */
export function createErrorHandler(log: Logger): ErrorRequestHandler {
  return (err, req, res, _next) => {
    const requestId = req.headers["x-request-id"] as string | undefined;

    log.error(err instanceof Error ? err.message : "Unknown error", {
      requestId,
      stack: err instanceof Error ? err.stack : undefined,
      path: req.path,
      method: req.method,
    });

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
        requestId,
      });
    }
  };
}
