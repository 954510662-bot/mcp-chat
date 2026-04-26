#!/usr/bin/env node
import http from "node:http";
import { FileStore } from "./src/store/fileStore.js";
import { createProviderRegistry } from "./src/providers/index.js";
import { createConnectorRegistry } from "./src/connectors/index.js";
import { GroupChatOrchestrator } from "./src/orchestrator/groupChat.js";
import { TaskDispatcher } from "./src/platform/taskDispatcher.js";

// 初始化平台
const store = await FileStore.create("./data/qq-store.json");
const providers = createProviderRegistry();
const connectors = createConnectorRegistry();
const orchestrator = new GroupChatOrchestrator({ store, providers });
const dispatcher = new TaskDispatcher({ store, connectors });

const defaultGroup = orchestrator.createGroup({
  name: "QQ Main Group",
  members: [{ name: "Coordinator", provider: "echo" }]
});

console.log("平台已启动，Group ID:", defaultGroup.id);

// HTTP Server 接收 OneBot 消息
const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/") {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
    }

    try {
      const event = JSON.parse(body);
      await handleEvent(event);
    } catch (e) {
      console.error("Event error:", e);
    }
    res.writeHead(200);
    res.end("OK");
    return;
  }
  res.writeHead(404);
  res.end("Not Found");
});

async function handleEvent(event) {
  const isGroupAt =
    event.message_type === "group" &&
    event.message?.some?.((m) => m.type === "at" && m.data?.qq === String(event.self_id));

  const isPrivate = event.message_type === "private";

  if (!isGroupAt && !isPrivate) return;

  const text = event.message
    .filter((m) => m.type === "text")
    .map((m) => m.data?.text ?? "")
    .join(" ")
    .trim();

  if (!text) return;

  const sender = event.sender?.nickname || event.user_id;
  console.log(`\n[QQ] ${sender}: ${text}`);

  // 处理命令
  if (text.startsWith("/task")) {
    const instruction = text.slice(5).trim();
    if (!instruction) {
      reply(event, "用法: /task 你的指令");
      return;
    }

    reply(event, `[平台] 收到「${instruction}」\n正在分发给 Claude Code / OpenClaw / Hermes...`);

    try {
      const result = await dispatcher.dispatchTask({
        groupId: defaultGroup.id,
        instruction
      });

      let msg = `✅ 任务完成 (${result.task.id})\n`;
      for (const r of result.task.results) {
        msg += `\n━━━ ${r.connector.toUpperCase()} ━━━\n`;
        msg += `状态: ${r.status}\n`;
        msg += r.message;
      }
      reply(event, msg);
    } catch (e) {
      reply(event, `❌ 错误: ${e.message}`);
    }
  } else if (text === "/help") {
    reply(event, "🤖 多 Agent 协作平台\n\n可用命令:\n/task [指令] - 分发任务给所有 Agent\n/help - 显示帮助");
  } else {
    // 普通对话直接聊天
    await orchestrator.sendMessage({
      groupId: defaultGroup.id,
      userMessage: text
    });

    const messages = orchestrator.getMessages(defaultGroup.id);
    const lastReply = messages[messages.length - 1];
    if (lastReply) {
      reply(event, lastReply.content);
    }
  }
}

function reply(event, message) {
  console.log(`[回复]\n${message}\n`);

  // ========== 部署时取消下面注释 ==========
  // 调用 OneBot HTTP API 发消息
  // fetch("http://localhost:5700/send_msg", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({
  //     message_type: event.message_type,
  //     group_id: event.group_id,
  //     user_id: event.user_id,
  //     message: message
  //   })
  // });
}

server.listen(3001, () => {
  console.log("\n📡 QQ Bot 适配器已启动");
  console.log("📍 监听地址: http://localhost:3001");
  console.log("🔧 请配置 NapCat/LLOneBot:");
  console.log("   - HTTP 上报地址: http://localhost:3001");
  console.log("   - HTTP API 地址: http://localhost:5700");
  console.log("\n🎮 测试命令:");
  console.log("   - /task 帮我写一个 hello world");
  console.log("   - /help");
});
