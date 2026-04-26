import { exec } from "child_process";
import { writeFile, readFile, readdir, stat } from "fs/promises";
import { platform, homedir } from "os";
import { join } from "path";

export class ToolResult {
  constructor(success, output, error = null) {
    this.success = success;
    this.output = output;
    this.error = error;
    this.timestamp = Date.now();
  }
}

export class BaseTool {
  constructor(config) {
    this.name = config.name;
    this.description = config.description;
    this.category = config.category || "general";
    this.timeout = config.timeout || 30000;
    this.enabled = config.enabled !== false;
  }

  async execute(params) {
    throw new Error("execute must be implemented");
  }
}

// ========== Shell 命令工具 ==========
export class ShellTool extends BaseTool {
  constructor() {
    super({
      name: "shell",
      description: "执行本地 Shell 命令",
      category: "system",
      timeout: 60000
    });
  }

  async execute({ command, cwd }) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(new ToolResult(false, null, "Command timeout"));
      }, this.timeout);

      exec(command, { cwd: cwd || process.cwd() }, (error, stdout, stderr) => {
        clearTimeout(timeout);
        if (error) {
          resolve(new ToolResult(false, null, stderr || error.message));
        } else {
          resolve(new ToolResult(true, stdout.trim()));
        }
      });
    });
  }
}

// ========== 文件读写工具 ==========
export class FileTool extends BaseTool {
  constructor() {
    super({
      name: "file",
      description: "文件读写、目录查看",
      category: "file_system"
    });
    this.workspace = join(homedir(), "agent-workspace");
  }

  async execute({ action, path, content }) {
    try {
      const fullPath = join(this.workspace, path || ".");

      switch (action) {
        case "read":
          const data = await readFile(fullPath, "utf-8");
          return new ToolResult(true, data);

        case "write":
          await writeFile(fullPath, content || "", "utf-8");
          return new ToolResult(true, `File written: ${path}`);

        case "list":
          const files = await readdir(fullPath);
          return new ToolResult(true, files.join("\n"));

        case "stat":
          const stats = await stat(fullPath);
          return new ToolResult(true, JSON.stringify(stats, null, 2));

        default:
          return new ToolResult(false, null, `Unknown action: ${action}`);
      }
    } catch (error) {
      return new ToolResult(false, null, error.message);
    }
  }
}

// ========== 网络请求工具 ==========
export class FetchTool extends BaseTool {
  constructor() {
    super({
      name: "fetch",
      description: "发送 HTTP/HTTPS 请求",
      category: "network"
    });
  }

  async execute({ url, method = "GET", body, headers = {} }) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method,
        body: body ? JSON.stringify(body) : undefined,
        headers: { "Content-Type": "application/json", ...headers },
        signal: controller.signal
      });

      clearTimeout(timeout);

      const text = await response.text();
      return new ToolResult(true, {
        status: response.status,
        statusText: response.statusText,
        body: text
      });
    } catch (error) {
      return new ToolResult(false, null, error.message);
    }
  }
}

// ========== 工具管理器 ==========
export class ToolManager {
  constructor() {
    this.tools = new Map();
  }

  register(tool) {
    if (!(tool instanceof BaseTool)) {
      throw new Error("Tool must extend BaseTool");
    }
    if (!tool.enabled) return;

    this.tools.set(tool.name, tool);
    console.log(`✅ 工具已注册: ${tool.name} (${tool.category})`);
  }

  async execute(toolName, params) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return new ToolResult(false, null, `Tool not found: ${toolName}`);
    }

    console.log(`🔧 调用工具: ${toolName}`);
    return tool.execute(params);
  }

  listTools() {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      category: t.category
    }));
  }

  getToolNames() {
    return Array.from(this.tools.keys());
  }
}

// 预设工具包
export const standardTools = [
  new ShellTool(),
  new FileTool(),
  new FetchTool()
];
