import http from "node:http";
import { randomUUID } from "node:crypto";

export class OneBotAdapter {
  constructor({ dispatcher, orchestrator, port = 3001) {
    this.dispatcher = dispatcher;
    this.orchestrator = orchestrator;
    this.port = port;
    this.groups = new Map(); // qqGroupId -> platformGroupId
    this.server = null;
  }

  async start() {
    this.server = http.createServer(async (req, res) => {
      if (req.method === "POST" && req.url === "/onebot") {
        let body = "";
        for await (const chunk of req) {
          body += chunk;
        }

        try {
          const event = JSON.parse(body);
          await this.handleEvent(event);
        } catch (e) {
          console.error("Parse OneBot event error:", e);
        }
        res.writeHead(200);
        res.end("OK");
        return;
      }

      res.writeHead(404);
      res.end("Not Found");
    });

    await new Promise((resolve) => this.server.listen(this.port, resolve));
    console.error(`OneBot adapter running on http://localhost:${this.port}/onebot`);
  }

  async handleEvent(event) {
    // 只处理群聊 @机器人 的消息
    if (
      event.post_type === "message" &&
      event.message_type === "group" &&
      event.message?.some?.((m) => m.type === "at" && m.data?.qq === String(event.self_id))
    ) {
      return this.handleGroupMessage(event);
    }

    // 处理私聊消息
    if (
      event.post_type === "message" && event.message_type === "private") {
      return this.handlePrivateMessage(event);
    }
  }

  async handleGroupMessage(event) {
    const qqGroupId = String(event.group_id);
    const userId = String(event.user_id);
    const text = event.message
      .filter((m) => m.type === "text")
      .map((m) => m.data?.text ?? "")
      .join(" ")
      .trim();

    if (!text) return;

    // 指令解析
    if (text.startsWith("/task")) {
      const instruction = text.slice(5).trim();
      await this.executeTask(qqGroupId, userId, instruction, event);
    } else if (text === "/help") {
      await this.replyQQ(event, `可用命令：\n/task [指令] - 分发任务给所有 Agent\n/help - 显示帮助`);
    }
  }

  async handlePrivateMessage(event) {
    const userId = String(event.user_id);
    const text = event.message
      .filter((m) => m.type === "text")
      .map((m) => m.data?.text ?? "")
      .join(" ")
      .trim();

    if (text.startsWith("/task")) {
      const instruction = text.slice(5).trim();
      await this.executeTask(`private-${userId}`, userId, instruction, event);
    } else if (text === "/help") {
      await this.replyQQ(event, `可用命令：\n/task [指令] - 分发任务给所有 Agent\n/help - 显示帮助`);
    }
  }

  async executeTask(qqGroupId, userId, instruction, event) {
    // 获取或创建平台 group
    let platformGroupId = this.groups.get(qqGroupId);
    if (!platformGroupId) {
      const group = this.orchestrator.createGroup({
        name: `QQ Group ${qqGroupId}`,
        members: [{ name: "Coordinator", provider: "echo" }]
      });
      platformGroupId = group.id;
      this.groups.set(qqGroupId, platformGroupId);
    }

    await this.replyQQ(event, `[平台] 收到任务，正在分发给 Claude Code / OpenClaw / Hermes...`);

    try {
      const result = await this.dispatcher.dispatchTask({
        groupId: platformGroupId,
        instruction
      });

      const response = this.formatTaskResult(result);
      await this.replyQQ(event, response);
    } catch (error) {
      await this.replyQQ(event, `[错误] ${error.message}`);
    }
  }

  formatTaskResult(result) {
    const lines = [`[任务完成]`;
    for (const r of result.task.results) {
      lines.push(`\n=== ${r.connector.toUpperCase()} ===`);
      lines.push(`状态: ${r.status}`);
      lines.push(r.message);
    }
    return lines.join("\n");
  }

  async replyQQ(event, message) {
    // 简单实现：调用 OneBot HTTP API 发消息
    // 实际使用时需要配置 OneBot 的 HTTP API 地址
    console.error(`[QQ -> ${event.group_id || event.user_id}] ${message}`);
  }
}
