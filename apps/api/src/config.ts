import type { LogLevel } from "@agentflow/shared";
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
/**
 * Centralized application configuration.
 * All environment variables are read here — never scattered through application code.
 */
export interface AppConfig {
  port: number;
  env: string;
  version: string;
  logLevel: LogLevel;
  geminiApiKey: string;
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || "3001", 10),
  env: process.env.NODE_ENV || "development",
  version: process.env.npm_package_version || "0.0.1",
  logLevel: (process.env.LOG_LEVEL as LogLevel) || "info",
  geminiApiKey: (() => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    return key;
  })(),
};
