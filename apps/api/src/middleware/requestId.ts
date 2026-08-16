import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

/**
 * Request-ID middleware.
 *
 * - If the incoming request has an X-Request-ID header, it is preserved.
 * - If not, a new UUIDv4 is generated.
 * - The request ID is set on both the request headers and response headers.
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const id = (req.headers["x-request-id"] as string) || randomUUID();
  req.headers["x-request-id"] = id;
  res.setHeader("X-Request-ID", id);
  next();
}
