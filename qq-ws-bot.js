#!/usr/bin/env node
import "dotenv/config";
import WebSocket from "ws";
import { FileStore } from "./src/store/fileStore.js";
import { createProviderRegistry } from "./src/providers/index.js";
import { createConnectorRegistry, messageBus } from "./src/connectors/index.js";
import { GroupChatOrchestrator } from "./src/orchestrator/groupChat.js";
import { CollaborativeTask } from "./src/platform/collaborativeTask.js";

// ========== 配置 ==========
const CONFIG = {
  // NapCat WebSocket 地址（正向 WebSocket）
  wsUrl: "ws://localhost:3001",
  // NapCat HTTP API 地址（用来发消息）
  onebotApiUrl: "http://localhost:3000/send_msg",
  // 机器人 QQ 号
  botQQ: null
};

// ========== 初始化平台 ==========
const store = await FileStore.create("./data/qq-ws-bot-store.json");
const providers = createProviderRegistry();
const connectors = createConnectorRegistry();
const orchestrator = new GroupChatOrchestrator({ store, providers });

const group = orchestrator.createGroup({
  name: "QQ 协作群",
  members: [{ name: "Coordinator", provider: "echo" }]
});

console.log("=".repeat(60));
console.log("🤖 QQ 多 Agent 协作机器人 (WebSocket 版)");
console.log("=".repeat(60));
console.log(`✅ 已注册 Agent: ${Array.from(connectors.keys()).join(", ")}`);
console.log(`📍 WebSocket 地址: ${CONFIG.wsUrl}`);
console.log(`📍 OneBot API: ${CONFIG.onebotApiUrl}`);
console.log("");
console.log("💡 NapCat 配置:");
console.log("   启用正向 WebSocket: ws://localhost:3001");
console.log("   启用 HTTP API: http://localhost:3000");
console.log("");
console.log("📱 使用方式:");
console.log('   QQ 私聊机器人说: "帮我三个 Agent 一起写个爬虫"');
console.log("=".repeat(60));
console.log("");

// ========== WebSocket 连接 ==========
let ws = null;
let reconnectTimer = null;

function connectWebSocket() {
  console.log("🔌 正在连接 NapCat WebSocket...");

  ws = new WebSocket(CONFIG.wsUrl);

  ws.on("open", () => {
    console.log("✅ WebSocket 已连接！");
    console.log("现在可以在 QQ 上给机器人发消息了！\n");
  });

  ws.on("message", async (data) => {
    try {
      const event = JSON.parse(data.toString());
      handleQQMessage(event);
    } catch (e) {
      console.error("解析消息失败:", e.message);
    }
  });

  ws.on("error", (error) => {
    console.error("❌ WebSocket 错误:", error.message);
  });

  ws.on("close", () => {
    console.log("❌ WebSocket 断开，5 秒后重连...");
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connectWebSocket, 5000);
  });
}

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

  sendQQMessage(event, `你好！我是多 Agent 协作机器人。\n\n试着对我说:\n"现在有哪些 Agent 在线？"\n"帮我三个 Agent 一起写个网站"`);
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

// ========== 启动 ==========
connectWebSocket();
