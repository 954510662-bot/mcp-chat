import { BaseConnector } from "./baseConnector.js";

export class HermesConnector extends BaseConnector {
  constructor(options = {}) {
    super("hermes", options.timeoutMs ?? 60000);
    this.endpoint = options.endpoint || process.env.HERMES_ENDPOINT;
  }

  async executeTask({ task, group }) {
    if (!this.endpoint) {
      return {
        status: "success",
        message: `🤖 Hermes (Mock 模式)\n提示: 配置 HERMES_ENDPOINT=http://121.41.83.189:8787/execute 连接真实云服务器`
      };
    }

    try {
      console.log(`[Hermes] 调用云服务器: ${this.endpoint}`);
      console.log(`[Hermes] 指令: ${task?.instruction}`);

      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task?.id || "unknown",
          instruction: task?.instruction || "",
          groupId: group?.id || "unknown"
        })
      });

      const result = await response.json();
      console.log(`[Hermes] 响应状态: ${result.status}`);

      return {
        status: result.status || "success",
        message: result.message || result.data || "执行完成"
      };
    } catch (error) {
      console.error(`[Hermes] 错误: ${error.message}`);
      return {
        status: "failed",
        message: `连接 Hermes 失败: ${error.message}`
      };
    }
  }

  async receiveMessage(message) {
    console.log(`\n[Hermes] 收到来自 ${message.from} 的消息:`);
    console.log(message.content);

    if (message.type === "agent_to_agent" && message.content.type === "question") {
      this.sendToAgent(message.from, {
        type: "answer",
        answer: `收到，我是 Hermes，部署和服务器运维的事包在我身上！`
      });
    }

    return { status: "received" };
  }
}
