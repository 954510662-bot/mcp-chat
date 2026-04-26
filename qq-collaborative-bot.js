#!/usr/bin/env node
import "dotenv/config";
import http from "node:http";
import { FileStore } from "./src/store/fileStore.js";
import { createProviderRegistry } from "./src/providers/index.js";
import { createConnectorRegistry, messageBus } from "./src/connectors/index.js";
import { GroupChatOrchestrator } from "./src/orchestrator/groupChat.js";
import { CollaborativeTask } from "./src/platform/collaborativeTask.js";

// ========== 配置 ==========
const CONFIG = {
  // 我们接收 NapCat 上报的端口
  receivePort: 3001,
  // NapCat HTTP API 地址（用来发消息）
  onebotApiUrl: "http://localhost:3000/send_msg",
  // 机器人 QQ 号（自动识别，不用填）
  botQQ: null
};

// ========== 初始化平台 ==========
const store = await FileStore.create("./data/qq-bot-store.json");
const providers = createProviderRegistry();
const connectors = createConnectorRegistry();
const orchestrator = new GroupChatOrchestrator({ store, providers });

const group = orchestrator.createGroup({
  name: "QQ 协作群",
  members: [{ name: "Coordinator", provider: "echo" }]
});

console.log("=".repeat(60));
console.log("🤖 QQ 多 Agent 协作机器人");
console.log("=".repeat(60));
console.log(`✅ 已注册 Agent: ${Array.from(connectors.keys()).join(", ")}`);
console.log(`📍 接收端口: ${CONFIG.receivePort}`);
console.log(`📍 OneBot API: ${CONFIG.onebotApiUrl}`);
console.log("");
console.log("💡 请确认 NapCat 配置:");
console.log("   HTTP 上报地址: http://localhost:3001");
console.log("   HTTP API 端口: 3000");
console.log("");
console.log("📱 使用方式:");
console.log('   QQ 群里 @机器人 说: "帮我三个 Agent 一起写个爬虫"');
console.log("=".repeat(60));
console.log("");

// ========== 消息处理 ==========
async function handleQQMessage(event) {
  if (event.post_type !== "message") return;

  const isGroupAt =
    event.message_type === "group" &&
    event.message?.some?.((m) => m.type === "at" && m.data?.qq === String(event.self_id));

  const isPrivate = event.message_type === "private";

  if (!isGroupAt && !isPrivate) return;

  if (!CONFIG.botQQ) {
    CONFIG.botQQ = String(event.self_id);
    console.log(`✅ 识别到机器人 QQ: ${CONFIG.botQQ}`);
  }

  const text = event.message
    .filter((m) => m.type === "text")
    .map((m) => m.data?.text ?? "")
    .join(" ")
    .trim();

  if (!text) return;

  const sender = event.sender?.nickname || event.user_id;
  const groupName = event.group_id ? `群 ${event.group_id}` : "私聊";

  console.log(`\n[QQ] ${groupName} - ${sender}: ${text}`);

  try {
    await processCommand(text, event);
  } catch (e) {
    console.error("处理消息出错:", e);
    sendQQMessage(event, `⚠️ 出错了: ${e.message}`);
  }
}

async function processCommand(text, event) {
  const t = text.toLowerCase();

  if (t.includes("在线") || t.includes("状态") || t.includes("哪些 agent")) {
    let msg = "📊 Agent 状态\n\n";
    for (const status of messageBus.getAgentStatus()) {
      msg += `✅ ${status.name.toUpperCase()}\n`;
      msg += `   状态: ${status.online ? "在线" : "离线"}\n`;
      msg += `   地址: ${status.endpoint}\n\n`;
    }
    sendQQMessage(event, msg);
    return;
  }

  if (
    t.includes("帮我") ||
    t.includes("一起") ||
    t.includes("写个") ||
    t.includes("设计") ||
    t.includes("实现")
  ) {
    sendQQMessage(event, `🎯 收到协作任务，正在分发给 Agent...\n指令: ${text}`);

    const task = new CollaborativeTask({
      groupId: group.id,
      instruction: text,
      targets: Array.from(connectors.keys()),
      store
    });

    const result = await task.execute();

    let msg = `✅ 协作任务完成！\n\n`;
    for (const r of result.results) {
      msg += `━━━ ${r.connector.toUpperCase()} ━━━\n`;
      msg += `状态: ${r.status}\n`;
      msg += r.message + "\n\n";
    }
    msg += `💡 提示: Agent 之间已经自动进行了协作讨论！`;
    sendQQMessage(event, msg);
    return;
  }

  sendQQMessage(event, `你好！我是多 Agent 协作机器人。\n\n试着对我说:\n"现在有哪些 Agent 在线？"\n"帮我三个 Agent 一起写个网站"\n\n💡 私聊不用 @，直接发消息就行！`);
}

// ========== 发 QQ 消息 ==========
async function sendQQMessage(event, message) {
  try {
    const response = await fetch(CONFIG.onebotApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message_type: event.message_type,
        group_id: event.group_id,
        user_id: event.user_id,
        message: [
          {
            type: "text",
            data: { text: message }
          }
        ]
      })
    });

    const result = await response.json();
    if (result.retcode === 0) {
      console.log(`[回复成功] ${message.slice(0, 50)}...`);
    } else {
      console.error(`[回复失败]`, result);
    }
  } catch (e) {
    console.error(`发送 QQ 消息失败: ${e.message}`);
    console.log(`[控制台回复] ${message}`);
  }
}

// ========== HTTP 服务器（接收 NapCat 上报） ==========
const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/") {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
    }

    try {
      const event = JSON.parse(body);
      handleQQMessage(event);
    } catch (e) {
      console.error("解析事件失败:", e);
    }

    res.writeHead(200);
    res.end("OK");
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

server.listen(CONFIG.receivePort, () => {
  console.log(`✅ QQ Bot 服务器已启动，正在监听端口 ${CONFIG.receivePort}`);
  console.log(`现在可以在 QQ 里 @机器人 说话了！\n`);
});
