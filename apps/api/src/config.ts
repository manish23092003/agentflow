import type { LogLevel } from "@agentflow/shared";

/**
 * Centralized application configuration.
 * All environment variables are read here — never scattered through application code.
 */
export interface AppConfig {
  port: number;
  env: string;
  version: string;
  logLevel: LogLevel;
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || "3001", 10),
  env: process.env.NODE_ENV || "development",
  version: process.env.npm_package_version || "0.0.1",
  logLevel: (process.env.LOG_LEVEL as LogLevel) || "info",
};
