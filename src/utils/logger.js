import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const COLORS = {
  reset: "\x1b[0m",
  debug: "\x1b[36m",
  info: "\x1b[32m",
  warn: "\x1b[33m",
  error: "\x1b[31m"
};

class Logger {
  constructor(options = {}) {
    this.level = options.level || "info";
    this.logFile = options.logFile || "./logs/app.log";
    this.consoleEnabled = options.console !== false;
    this.fileEnabled = options.file !== false;
    this.logDir = dirname(this.logFile);
    this.initialized = false;
  }

  async init() {
    if (this.initialized || !this.fileEnabled) return;
    try {
      await mkdir(this.logDir, { recursive: true });
      this.initialized = true;
    } catch (e) {
      console.warn("日志目录创建失败:", e.message);
      this.fileEnabled = false;
    }
  }

  shouldLog(level) {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  format(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length
      ? " " + JSON.stringify(meta)
      : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  async write(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const formatted = this.format(level, message, meta);

    if (this.consoleEnabled) {
      const color = COLORS[level] || COLORS.reset;
      console.log(`${color}${formatted}${COLORS.reset}`);
    }

    if (this.fileEnabled) {
      await this.init();
      try {
        await appendFile(this.logFile, formatted + "\n", "utf8");
      } catch (e) {
        // 静默失败
      }
    }
  }

  debug(message, meta) {
    return this.write("debug", message, meta);
  }

  info(message, meta) {
    return this.write("info", message, meta);
  }

  warn(message, meta) {
    return this.write("warn", message, meta);
  }

  error(message, meta) {
    return this.write("error", message, meta);
  }

  task(taskId, action, message) {
    return this.info(`[任务 ${taskId}] ${action}: ${message}`);
  }

  agent(agentName, message) {
    return this.info(`[Agent ${agentName}] ${message}`);
  }
}

export const logger = new Logger({
  level: process.env.LOG_LEVEL || "info",
  logFile: "./logs/mcp-chat.log"
});

export default logger;
