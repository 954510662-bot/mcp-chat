import { BaseAgent, AgentCapability } from "./baseAgent.js";
import { ShellTool, FetchTool } from "../tools/toolManager.js";

export class HermesAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      id: "hermes",
      name: "Hermes",
      emoji: "🚀",
      title: "云服务器 & 部署专家",
      specialty: ["云服务器运维", "服务部署", "远程执行", "环境配置"],
      personality: "严谨务实，执行果断，擅长处理复杂的服务器操作",
      strengths: ["远程命令执行", "Docker部署", "Nginx配置", "服务监控"],
      weaknesses: ["不擅长前端开发", "不擅长架构设计"],
      maxContextLines: 500,
      maxContextChars: 25000
    });

    this.endpoint = options.endpoint || process.env.HERMES_ENDPOINT;
    this.registerTool(new ShellTool());
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
            message: `🚀 Hermes (云服务器) 执行完成\n\n${data.message || data.data || "执行完成"}`
          };
        }
      } catch (e) {
        // 远程调用失败，fallback 到本地模式
      }
    }

    if (lower.includes("部署") || lower.includes("服务器") || lower.includes("状态")) {
      return {
        status: "success",
        message: `🚀 Hermes - 部署专家\n\n本地模式运行中\n\n提示: 配置 HERMES_ENDPOINT=http://121.41.83.189:8787/execute 连接真实云服务器\n\n我可以帮你:\n  • 远程部署服务\n  • 服务器状态监控\n  • Docker 容器管理\n  • Nginx 配置\n\n已注册工具: ${this.getAvailableTools().map(t => t.name).join(", ")}`
      };
    }

    return {
      status: "success",
      message: `🚀 Hermes - 云服务器专家\n\n任务: ${instruction.slice(0, 100)}\n\n已注册工具: ${this.getAvailableTools().map(t => t.name).join(", ")}\n\n上下文使用: ${this.contextLines.length} 行`
    };
  }

  async receiveMessage(message) {
    this.receiveMessage(message.from, message.content.text || JSON.stringify(message.content));

    if (message.type === "agent_to_agent" && message.content.type === "question") {
      this.sendMessage(message.from, `收到，我是 Hermes，部署和服务器运维的事包在我身上！`);
    }

    return { status: "received" };
  }
}
