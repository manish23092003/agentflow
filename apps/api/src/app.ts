import express from "express";
import { createLogger } from "@agentflow/shared";
import { config } from "./config.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { createErrorHandler } from "./middleware/errorHandler.js";
import healthRouter from "./routes/health.js";
import readyRouter from "./routes/ready.js";

import helmet from "helmet";
import cors from "cors";

/**
 * Centralized logger instance for the API.
 */
export const logger = createLogger(config.logLevel);

/**
 * Create and configure the Express application.
 *
 * This module exports the configured app WITHOUT starting the server,
 * enabling direct import for integration testing (e.g., with Supertest).
 */
const app = express();

// --- Security baseline ---
app.use(helmet());
app.use(cors({
  origin: config.env === "development" ? "http://localhost:5173" : false, // Adjust in production
  optionsSuccessStatus: 200,
}));

// --- Core middleware ---
app.use(express.json({ limit: "100kb" }));
app.use(requestIdMiddleware);

import agentRouter from "./routes/agent.js";

// --- API routes (versioned) ---
app.use("/api/v1", healthRouter);
app.use("/api/v1", readyRouter);
app.use("/api/v1/agent", agentRouter);

// --- 404 Not Found Handler ---
app.use((req, res, _next) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Cannot ${req.method} ${req.path}`,
    },
    requestId: req.headers["x-request-id"] as string,
  });
});

// --- Error handling (must be registered last) ---
app.use(createErrorHandler(logger));

export default app;
