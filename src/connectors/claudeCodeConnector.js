import { BaseConnector } from "./baseConnector.js";
import { exec } from "child_process";
import { writeFile } from "fs/promises";
import { existsSync, mkdirSync } from "fs";

const WORKSPACE = "D:\\ClaudeCode\\mcp-chat\\workspace\\claude-code";

try {
  if (!existsSync(WORKSPACE)) mkdirSync(WORKSPACE, { recursive: true });
} catch (e) {}

export class ClaudeCodeConnector extends BaseConnector {
  constructor(options = {}) {
    super("claude_code", options.timeoutMs ?? 120000);
    this.cliPath = options.cliPath || "claude";
    this.cwd = options.cwd || process.env.CLAUDE_CODE_CWD || process.cwd();
    this.workspace = WORKSPACE;
  }

  async executeTask({ task, group }) {
    const instruction = task.instruction || "";
    const lower = instruction.toLowerCase();

    // 1. 尝试调用真实的 Claude CLI
    if (lower.includes("claude") || lower.includes("ai") || lower.includes("代码") || lower.includes("写")) {
      try {
        const result = await this.callClaudeCLI(instruction);
        if (result) {
          return {
            status: "success",
            message: `⚡ Claude Code (本地 AI) 响应:\n\n${result}`
          };
        }
      } catch (e) {
        // Claude CLI 不可用，fallback 到模拟模式
      }
    }

    // 2. 执行命令
    if (lower.includes("执行") || lower.includes("命令") || lower.includes("cmd") || lower.includes("run")) {
      const cmdMatch = instruction.match(/(?:执行|命令|run|cmd)[：: ]*(.+)/i);
      const cmd = cmdMatch ? cmdMatch[1].trim() : instruction.replace(/(执行|命令|run|cmd)/gi, "").trim();

      if (cmd) {
        return {
          status: "success",
          message: `⚡ Claude Code (本地) 执行命令: ${cmd}\n\n${await this.execCmd(cmd)}`
        };
      }
    }

    // 3. 写文件
    if (lower.includes("写文件") || lower.includes("创建文件") || lower.includes("write file")) {
      const lines = instruction.split("\n");
      let filename = "output.txt";
      let content = instruction;

      for (const line of lines) {
        if (line.includes("文件名") || line.includes("文件名:") || line.includes("文件名:")) {
          filename = line.replace(/.*文件名[：:] */, "").trim();
        }
      }

      const filepath = `${this.workspace}\\${filename}`;
      try {
        await writeFile(filepath, content, "utf8");
        return {
          status: "success",
          message: `⚡ Claude Code (本地) 已写文件: ${filepath}\n\n内容:\n${content.slice(0, 500)}${content.length > 500 ? "..." : ""}`
        };
      } catch (e) {
        return {
          status: "failed",
          message: `写文件失败: ${e.message}`
        };
      }
    }

    // 4. 代码帮助
    if (lower.includes("帮助") || lower.includes("怎么") || lower.includes("怎么写")) {
      return {
        status: "success",
        message: `⚡ Claude Code (本地) - 全栈代码专家\n\n关于 "${instruction.slice(0, 50)}"\n\n我可以帮你写:\n  • 前端: React/Vue/HTML/CSS/JS\n  • 后端: Node.js/Python/Go\n  • 脚本: PowerShell/Bash\n  • 重构和代码优化`
      };
    }

    // 默认模式
    return {
      status: "success",
      message: `⚡ Claude Code (本地) - 全栈代码专家\n\n工作区: ${this.workspace}\n\n收到指令: ${instruction.slice(0, 100)}\n\n我擅长:\n  • 写各种语言的代码\n  • 代码重构和优化\n  • 命令行工具调用`
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
    console.log(`\n[Claude Code] 收到来自 ${message.from} 的消息:`);
    console.log(message.content);

    if (message.type === "agent_to_agent" && message.content.type === "question") {
      this.sendToAgent(message.from, {
        type: "answer",
        answer: `收到，我是 Claude Code，全栈开发包在我身上！`
      });
    }

    return { status: "received" };
  }
}
