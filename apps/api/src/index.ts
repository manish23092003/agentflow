import app, { logger } from "./app.js";
import { config } from "./config.js";

/**
 * Start the HTTP server.
 *
 * This is the only file that calls app.listen().
 * Tests import app.ts directly and never execute this file.
 */
const server = app.listen(config.port, () => {
  logger.info("AgentFlow API server started", {
    port: config.port,
    environment: config.env,
    version: config.version,
  });
});

// --- Graceful shutdown ---
function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
