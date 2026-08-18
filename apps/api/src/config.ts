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
  geminiModel: string;
  tavilyApiKey?: string;
  x402: {
    facilitatorUrl: string;
    network: string;
  };
  algorand: {
    usdcAssetId: string;
  };
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
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  tavilyApiKey: process.env.TAVILY_API_KEY,
  x402: {
    facilitatorUrl: process.env.X402_FACILITATOR_URL || 'https://facilitator.goplausible.xyz/',
    network: `algorand:${process.env.ALGORAND_NETWORK || 'testnet'}`
  },
  algorand: {
    usdcAssetId: process.env.X402_USDC_ASSET_ID || '10458941'
  }
};
