import { BaseAgent, AgentCapability } from "./baseAgent.js";
import { ShellTool, FileTool, FetchTool } from "../tools/toolManager.js";
import { exec } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

const WORKSPACE = join(process.cwd(), "workspace", "claude-code");

try {
  if (!existsSync(WORKSPACE)) mkdirSync(WORKSPACE, { recursive: true });
} catch (e) {}

export class ClaudeCodeAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      id: "claude_code",
      name: "Claude Code",
      emoji: "⚡",
      title: "全栈代码专家",
      specialty: ["全栈开发", "代码生成", "Bug 修复", "代码重构"],
      personality: "高效敏捷，注重代码质量和最佳实践",
      strengths: ["快速写代码", "多语言精通", "调试修复", "IDE集成"],
      weaknesses: ["不擅长深度架构决策", "不擅长运维部署"],
      maxContextLines: 2000,
      maxContextChars: 100000
    });

    this.cliPath = options.cliPath || "claude";
    this.cwd = options.cwd || process.env.CLAUDE_CODE_CWD || process.cwd();
    this.workspace = WORKSPACE;
    this.registerTool(new ShellTool());
    this.registerTool(new FileTool());
    this.registerTool(new FetchTool());
  }

  async _execute(task) {
    const instruction = task.instruction || "";
    const lower = instruction.toLowerCase();

    this.addToContext(`[Task] ${instruction}`);

    if (lower.includes("claude") || lower.includes("ai") || lower.includes("代码") || lower.includes("写")) {
      try {
        const result = await this.callClaudeCLI(instruction);
        if (result) {
          this.addToContext(`[Claude CLI] ${result.slice(0, 200)}`);
          return {
            status: "success",
            message: `⚡ Claude Code (本地 AI) 响应:\n\n${result}`
          };
        }
      } catch (e) {
        // Claude CLI 不可用，fallback 到模拟模式
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
          message: `⚡ Claude Code 执行命令: ${cmd}\n\n${result}`
        };
      }
    }

    if (lower.includes("帮助") || lower.includes("怎么") || lower.includes("怎么写")) {
      return {
        status: "success",
        message: `⚡ Claude Code - 全栈代码专家\n\n关于 "${instruction.slice(0, 50)}"\n\n我可以帮你写:\n  • 前端: React/Vue/HTML/CSS/JS\n  • 后端: Node.js/Python/Go\n  • 脚本: PowerShell/Bash\n  • 重构和代码优化\n\n工作区: ${this.workspace}\n已注册工具: ${this.getAvailableTools().map(t => t.name).join(", ")}`
      };
    }

    return {
      status: "success",
      message: `⚡ Claude Code - 全栈代码专家\n\n任务: ${instruction.slice(0, 100)}\n\n工作区: ${this.workspace}\n已注册工具: ${this.getAvailableTools().map(t => t.name).join(", ")}\n上下文使用: ${this.contextLines.length} 行`
    };
  }

  async callClaudeCLI(prompt) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => resolve(null), 30000);
      exec(
        `${this.cliPath} send "${prompt.replace(/"/g, "'")}"`,
        { cwd: this.cwd, timeout: 25000 },
        (error, stdout, stderr) => {
          clearTimeout(timeout);
          if (error) {
            resolve(null);
          } else {
            resolve(stdout || stderr || null);
          }
        }
      );
    });
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
      this.sendMessage(message.from, `收到，我是 Claude Code，全栈开发包在我身上！`);
    }

    return { status: "received" };
  }
}
