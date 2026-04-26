import { BaseAgent, AgentCapability } from "./baseAgent.js";
import { ShellTool, FileTool, FetchTool } from "../tools/toolManager.js";
import { exec } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

const WORKSPACE = join(process.cwd(), "workspace", "openclaw");

try {
  if (!existsSync(WORKSPACE)) mkdirSync(WORKSPACE, { recursive: true });
} catch (e) {}

export class OpenClawAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      id: "openclaw",
      name: "OpenClaw",
      emoji: "🦅",
      title: "架构师 & 后端专家",
      specialty: ["系统架构设计", "后端开发", "API 设计", "数据库设计"],
      personality: "思维清晰，注重设计模式和可扩展性",
      strengths: ["架构设计", "API设计", "代码重构", "性能优化"],
      weaknesses: ["不擅长UI设计", "不擅长复杂前端交互"],
      maxContextLines: 1500,
      maxContextChars: 75000
    });

    this.endpoint = options.endpoint || process.env.OPENCLAW_ENDPOINT;
    this.workspace = WORKSPACE;
    this.registerTool(new ShellTool());
    this.registerTool(new FileTool());
    this.registerTool(new FetchTool());
  }

  async _execute(task) {
    const instruction = task.instruction || "";
    const lower = instruction.toLowerCase();

    this.addToContext(`[Task] ${instruction}`);

    if (this.endpoint) {
      try {
        const result = await this.useTool("fetch", {
          url: this.endpoint,
          method: "POST",
          body: {
            taskId: task.id,
            instruction: instruction,
            groupId: task.groupId || "unknown"
          }
        });

        if (result.success) {
          const data = JSON.parse(result.output.body);
          this.addToContext(`[Result] ${data.message?.slice(0, 200) || "执行完成"}`);
          return {
            status: "success",
            message: `🦅 OpenClaw 执行完成\n\n${data.message || "执行完成"}`
          };
        }
      } catch (e) {
        // 远程调用失败，fallback 到本地模式
      }
    }

    if (lower.includes("执行") || lower.includes("命令") || lower.includes("cmd") || lower.includes("run")) {
      const cmdMatch = instruction.match(/(?:执行|命令|run|cmd)[：: ]*(.+)/i);
      const cmd = cmdMatch ? cmdMatch[1].trim() : instruction.replace(/(执行|命令|run|cmd)/gi, "").trim();

      if (cmd) {
        const result = await this.execCmd(cmd);
        this.addToContext(`[Exec] ${cmd} → ${result.slice(0, 100)}`);
        return {
          status: "success",
          message: `🦅 OpenClaw 执行命令: ${cmd}\n\n${result}`
        };
      }
    }

    if (lower.includes("架构") || lower.includes("设计") || lower.includes("api")) {
      return {
        status: "success",
        message: `🦅 OpenClaw - 架构 & 后端专家\n\n关于 "${instruction.slice(0, 50)}"\n\n我可以帮你设计:\n  • 微服务架构\n  • RESTful API 设计\n  • 数据库表结构\n  • 系统模块划分\n\n工作区: ${this.workspace}\n已注册工具: ${this.getAvailableTools().map(t => t.name).join(", ")}`
      };
    }

    return {
      status: "success",
      message: `🦅 OpenClaw - 架构 & 后端专家\n\n任务: ${instruction.slice(0, 100)}\n\n工作区: ${this.workspace}\n已注册工具: ${this.getAvailableTools().map(t => t.name).join(", ")}\n上下文使用: ${this.contextLines.length} 行`
    };
  }

  execCmd(cmd) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve("❌ 命令执行超时"), 30000);
      exec(cmd, { cwd: this.workspace, timeout: 25000 }, (error, stdout, stderr) => {
        clearTimeout(timeout);
        if (error) {
          resolve(`❌ 错误: ${error.message}\n${stderr}`);
        } else {
          resolve(stdout || stderr || "(无输出)");
        }
      });
    });
  }

  async receiveMessage(message) {
    this.receiveMessage(message.from, message.content.text || JSON.stringify(message.content));

    if (message.type === "agent_to_agent" && message.content.type === "question") {
      this.sendMessage(message.from, `收到，我是 OpenClaw，架构和后端开发包在我身上！`);
    }

    return { status: "received" };
  }
}
