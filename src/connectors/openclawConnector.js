import { BaseConnector } from "./baseConnector.js";
import { exec } from "child_process";
import { writeFile, readFile } from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

const WORKSPACE = "D:\\ClaudeCode\\mcp-chat\\workspace\\openclaw";

try {
  if (!existsSync(WORKSPACE)) mkdirSync(WORKSPACE, { recursive: true });
} catch (e) {}

export class OpenClawConnector extends BaseConnector {
  constructor(options = {}) {
    super("openclaw", options.timeoutMs ?? 60000);
    this.endpoint = options.endpoint || process.env.OPENCLAW_ENDPOINT;
    this.workspace = WORKSPACE;
  }

  async executeTask({ task, group }) {
    if (this.endpoint) {
      try {
        const response = await fetch(this.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: task.id,
            instruction: task.instruction,
            groupId: group.id
          })
        });
        const result = await response.json();
        return {
          status: result.status || "success",
          message: result.message || "执行完成"
        };
      } catch (error) {
        // 远程调用失败，fallback 到本地模式
      }
    }

    // ========== 本地模式 ==========
    const instruction = task.instruction || "";
    const lower = instruction.toLowerCase();

    // 1. 执行命令
    if (lower.includes("执行") || lower.includes("命令") || lower.includes("cmd") || lower.includes("run")) {
      const cmdMatch = instruction.match(/(?:执行|命令|run|cmd)[：: ]*(.+)/i);
      const cmd = cmdMatch ? cmdMatch[1].trim() : instruction.replace(/(执行|命令|run|cmd)/gi, "").trim();

      if (cmd) {
        return {
          status: "success",
          message: `🦅 OpenClaw (本地) 执行命令: ${cmd}\n\n${await this.execCmd(cmd)}`
        };
      }
    }

    // 2. 写文件
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
          message: `🦅 OpenClaw (本地) 已写文件: ${filepath}\n\n内容:\n${content.slice(0, 500)}${content.length > 500 ? "..." : ""}`
        };
      } catch (e) {
        return {
          status: "failed",
          message: `写文件失败: ${e.message}`
        };
      }
    }

    // 3. 系统状态
    if (lower.includes("状态") || lower.includes("系统信息")) {
      return {
        status: "success",
        message: `🦅 OpenClaw (本地) 系统状态\n\n━━━ 工作区 ━━━\n${this.workspace}\n\n━━━ 可用功能 ━━━\n  • 执行命令\n  • 写文件\n  • 查看文件列表\n\n提示: 我负责代码架构和后端开发！`
      };
    }

    // 4. 列出文件
    if (lower.includes("文件") || lower.includes("列表") || lower.includes("ls") || lower.includes("dir")) {
      const files = await this.execCmd(`dir /b "${this.workspace}"`);
      return {
        status: "success",
        message: `🦅 OpenClaw (本地) 工作区文件列表:\n\n${files}`
      };
    }

    // 默认
    return {
      status: "success",
      message: `🦅 OpenClaw (本地) - 架构 & 后端专家\n\n收到任务: ${instruction.slice(0, 100)}\n\n我可以帮你:\n  • 执行系统命令\n  • 写代码文件\n  • 查看工作区文件`
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
    console.log(`\n[OpenClaw] 收到来自 ${message.from} 的消息:`);
    console.log(message.content);

    if (message.type === "agent_to_agent" && message.content.type === "question") {
      this.sendToAgent(message.from, {
        type: "answer",
        answer: `收到，我是 OpenClaw，架构和后端开发包在我身上！`
      });
    }

    return { status: "received" };
  }
}
