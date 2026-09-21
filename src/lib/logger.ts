export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  message: string;
  context?: Record<string, unknown>;
  error?: Error | unknown;
  timestamp?: string;
}

class Logger {
  private formatLog(level: LogLevel, message: string, context?: Record<string, unknown>, error?: unknown): string {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
      ...(error ? { error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error } : {}),
    };

    return JSON.stringify(entry);
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(`\x1b[34m[DEBUG]\x1b[0m ${this.formatLog("debug", message, context)}`);
    }
  }

  info(message: string, context?: Record<string, unknown>) {
    console.log(`\x1b[32m[INFO]\x1b[0m ${this.formatLog("info", message, context)}`);
  }

  warn(message: string, context?: Record<string, unknown>) {
    console.warn(`\x1b[33m[WARN]\x1b[0m ${this.formatLog("warn", message, context)}`);
  }

  error(message: string, context?: Record<string, unknown>, error?: unknown) {
    console.error(`\x1b[31m[ERROR]\x1b[0m ${this.formatLog("error", message, context, error)}`);
  }
}

export const logger = new Logger();
