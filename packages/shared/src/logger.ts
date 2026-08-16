/**
 * Lightweight structured logger for AgentFlow.
 *
 * Outputs JSON-structured log entries to the console.
 * Supports log levels and arbitrary context (including request IDs).
 * No external dependencies — intentionally minimal for Phase 1.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface LogContext {
  requestId?: string;
  [key: string]: unknown;
}

export class Logger {
  private readonly minLevel: number;

  constructor(level: LogLevel = "info") {
    this.minLevel = LOG_LEVEL_PRIORITY[level];
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (LOG_LEVEL_PRIORITY[level] < this.minLevel) return;

    const entry = JSON.stringify({
      level,
      message,
      timestamp: new Date().toISOString(),
      ...context,
    });

    switch (level) {
      case "error":
        console.error(entry);
        break;
      case "warn":
        console.warn(entry);
        break;
      default:
        console.log(entry);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log("error", message, context);
  }
}

/**
 * Create a new Logger instance with the specified minimum log level.
 */
export function createLogger(level: LogLevel = "info"): Logger {
  return new Logger(level);
}
