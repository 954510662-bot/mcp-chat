#!/usr/bin/env node
import "dotenv/config";
import readline from "node:readline";
import { FileStore } from "./src/store/fileStore.js";
import { createProviderRegistry } from "./src/providers/index.js";
import { createConnectorRegistry } from "./src/connectors/index.js";
import { GroupChatOrchestrator } from "./src/orchestrator/groupChat.js";
import { TaskDispatcher } from "./src/platform/taskDispatcher.js";
import { healthCheckAll, formatHealthCheck } from "./src/utils/healthCheck.js";
import { logger } from "./src/utils/logger.js";

const store = await FileStore.create("./data/native-chat-store.json");
const providers = createProviderRegistry();
const connectors = createConnectorRegistry();
const orchestrator = new GroupChatOrchestrator({ store, providers });
const dispatcher = new TaskDispatcher({ store, connectors });

const group = orchestrator.createGroup({
  name: "Native Chat Group",
  members: [{ name: "Coordinator", provider: "echo" }]
});

console.log("=".repeat(60));
console.log("🤖 多 Agent 协作平台 - 原生群聊模式");
console.log("=".repeat(60));
console.log(`Group ID: ${group.id}`);
console.log("");
console.log("💡 不用打命令，直接说人话：");
console.log("  ✅ 「帮我用三个 Agent 一起写个爬虫」 → 自动分发任务");
console.log("  ✅ 「大家怎么用？」 → 普通聊天");
console.log("  ✅ 「现在有哪些 Agent 在线？」 → 查状态");
console.log("  ✅ 「刚才做了什么任务？」 → 查历史");
console.log("=".repeat(60));
console.log("");

logger.info("平台启动", { groupId: group.id });

// 简单意图识别（可以接 LLM 更好
function detectIntent(text) {
  const t = text.toLowerCase();

  // 查询 Agent 状态（优先级最高）
  if (
    t.includes("状态") ||
    t.includes("在线") ||
    t.includes("哪些") ||
    t.includes("平台") ||
    t.includes("信息") ||
    t.includes("健康") ||
    t.includes("检查")
  ) {
    if (!t.includes("帮我") && !t.includes("写") && !t.includes("做")) {
      return { type: "info", confidence: 0.9 };
    }
  }

  // 查询任务状态
  if (
    (t.includes("任务") && (t.includes("状态") || t.includes("进度") || t.includes("历史") || t.includes("记录"))) ||
    t.includes("刚才做了什么") ||
    t.includes("看一下任务")
  ) {
    return { type: "tasks", confidence: 0.95 };
  }

  // 查记忆
  if (t.includes("记忆") || t.includes("记得") || t.includes("共享")) {
    return { type: "memory", confidence: 0.9 };
  }

  // 任务分发意图
  if (
    t.includes("帮我") ||
    t.includes("大家一起") ||
    t.includes("三个 agent") ||
    t.includes("一起写") ||
    t.includes("分发任务") ||
    t.includes("所有 agent")
  ) {
    return { type: "dispatch_task", confidence: 0.85 };
  }

  // 默认普通聊天
  return { type: "chat", confidence: 0.5 };
}

async function handleUserMessage(text) {
  const intent = detectIntent(text);

  switch (intent.type) {
    case "dispatch_task":
      console.log(`\n[平台] 🎯 识别到：任务分发 (置信度 ${Math.round(intent.confidence * 100)}%)`);
      console.log(`[平台] 正在分发给 ${Array.from(connectors.keys()).join(" / ")}...\n`);

      logger.info("任务分发开始", { instruction: text, groupId: group.id });

      try {
        const result = await dispatcher.dispatchTask({
          groupId: group.id,
          instruction: text
        });

        console.log(`✅ 任务完成 (${result.task.id})`);
        for (const r of result.task.results) {
          console.log(`\n━━━ ${r.connector.toUpperCase()} ━━━`);
          console.log(`状态: ${r.status}`);
          console.log(r.message);
          logger.agent(r.connector, r.message);
        }
        logger.task(result.task.id, "完成", `指令: ${text}`);
      } catch (e) {
        console.log(`❌ 错误: ${e.message}`);
        logger.error("任务执行失败", { error: e.message, instruction: text });
      }
      break;

    case "info":
      console.log(`\n📊 平台状态`);
      console.log(`━━━━━━━━━━━━━━━━━━━━`);
      console.log(`可用模型: ${Array.from(providers.keys()).join(", ")}`);
      const health = await healthCheckAll(connectors);
      console.log(formatHealthCheck(health));
      break;

    case "tasks":
      const tasks = store.listTasks(group.id);
      console.log(`\n📋 最近任务`);
      if (tasks.length === 0) {
        console.log("  还没有执行过任务哦");
      } else {
        for (const t of tasks.slice(-5).reverse()) {
          const statusIcon =
            t.status === "success" ? "✅" :
            t.status === "running" ? "⏳" :
            t.status === "pending" ? "📋" :
            t.status === "cancelled" ? "❌" : "⚠️";
          console.log(`  ${statusIcon} [${t.id.slice(0, 8)}...]`);
          console.log(`     指令: ${t.instruction.slice(0, 40)}${t.instruction.length > 40 ? "..." : ""}`);
          console.log(`     状态: ${t.status} | 进度: ${t.progress || 0}%`);
          console.log(`     时间: ${t.createdAt.slice(0, 19)}`);
          console.log("");
        }
      }
      break;

    case "memory":
      console.log(`\n🧠 共享记忆库`);
      if (group.sharedMemory && group.sharedMemory.size > 0) {
        for (const [key, value] of group.sharedMemory) {
          console.log(`  ${key}:`, value);
        }
      } else {
        console.log("  (空)");
      }
      break;

    case "chat":
    default:
      console.log(`\n[群聊]`);
      await orchestrator.sendMessage({
        groupId: group.id,
        userMessage: text
      });
      const messages = orchestrator.getMessages(group.id);
      for (const m of messages.slice(-group.members.length)) {
        console.log(`[${m.speaker}] ${m.content}`);
      }
      break;
  }

  console.log("");
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let isPrompting = false;

function prompt() {
  if (isPrompting || rl.closed) return;
  isPrompting = true;

  rl.question("你> ", async (input) => {
    isPrompting = false;

    if (rl.closed) return;

    const cmd = input.trim().toLowerCase();

    if (cmd === "exit" || cmd === "quit") {
      console.log("再见！");
      rl.close();
      process.exit(0);
    }

    await handleUserMessage(input.trim());
    prompt();
  });
}

rl.on("close", () => {
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("\n\n再见！");
  rl.close();
  process.exit(0);
});

prompt();
