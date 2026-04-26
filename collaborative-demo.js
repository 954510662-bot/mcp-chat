#!/usr/bin/env node
import "dotenv/config";
import readline from "node:readline";
import { FileStore } from "./src/store/fileStore.js";
import { createProviderRegistry } from "./src/providers/index.js";
import { createConnectorRegistry, messageBus } from "./src/connectors/index.js";
import { GroupChatOrchestrator } from "./src/orchestrator/groupChat.js";
import { CollaborativeTask } from "./src/platform/collaborativeTask.js";

const store = await FileStore.create("./data/collaborative-store.json");
const providers = createProviderRegistry();
const connectors = createConnectorRegistry();
const orchestrator = new GroupChatOrchestrator({ store, providers });

const group = orchestrator.createGroup({
  name: "协作群",
  members: [{ name: "Coordinator", provider: "echo" }]
});

messageBus.on("message:to_user", (msg) => {
  console.log(`\n📩 [Agent → 用户] ${msg.from}:`);
  console.log(typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content, null, 2));
});

console.log("=".repeat(70));
console.log("🤝 多 Agent 双向协作平台 - 演示版");
console.log("=".repeat(70));
console.log(`Group ID: ${group.id}`);
console.log("");
console.log("✅ 已注册 Agent:", Array.from(connectors.keys()).join(", "));
console.log("");
console.log("💡 试试这些对话:");
console.log('  "帮我三个 Agent 一起写个网站，包含前后端和部署"');
console.log('  "现在有哪些 Agent 在线？"');
console.log('  "看看刚才的任务对话记录"');
console.log("=".repeat(70));
console.log("");

function detectIntent(text) {
  const t = text.toLowerCase();

  if (
    t.includes("状态") ||
    t.includes("在线") ||
    t.includes("哪些") ||
    t.includes("平台") ||
    t.includes("agent")
  ) {
    if (!t.includes("帮我") && !t.includes("写") && !t.includes("做")) {
      return "info";
    }
  }

  if (
    t.includes("对话") ||
    t.includes("记录") ||
    t.includes("消息") ||
    (t.includes("任务") && t.includes("看"))
  ) {
    return "conversation";
  }

  if (
    t.includes("帮我") ||
    t.includes("一起") ||
    t.includes("三个") ||
    t.includes("写个") ||
    t.includes("设计") ||
    t.includes("实现")
  ) {
    return "collaborative_task";
  }

  return "chat";
}

async function handleUserMessage(text) {
  const intent = detectIntent(text);

  switch (intent) {
    case "info":
      console.log(`\n📊 Agent 状态`);
      console.log("━━━━━━━━━━━━━━━━━━━━");
      for (const status of messageBus.getAgentStatus()) {
        console.log(`✅ ${status.name.toUpperCase()}`);
        console.log(`   状态: ${status.online ? "在线" : "离线"}`);
        console.log(`   地址: ${status.endpoint}`);
        console.log("");
      }
      break;

    case "conversation":
      console.log(`\n💬 最近对话记录`);
      console.log("━━━━━━━━━━━━━━━━━━━━");
      const messages = messageBus.messageHistory.slice(-20);
      if (messages.length === 0) {
        console.log("  还没有对话记录");
      } else {
        for (const m of messages) {
          const arrow = m.to === "all" ? "📢" : "→";
          console.log(`[${m.timestamp.slice(11, 19)}] ${m.from} ${arrow} ${m.to}:`);
          console.log(`  ${typeof m.content === "string" ? m.content.slice(0, 80) : m.content.type || m.content.question?.slice(0, 80)}`);
          console.log("");
        }
      }
      break;

    case "collaborative_task":
      console.log(`\n[平台] 🎯 启动协作任务`);
      console.log(`[平台] 参与 Agent: ${Array.from(connectors.keys()).join(", ")}`);
      console.log(`[平台] 开始协作执行...\n`);

      const task = new CollaborativeTask({
        groupId: group.id,
        instruction: text,
        targets: Array.from(connectors.keys()),
        store
      });

      const result = await task.execute();

      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`✅ 协作任务完成！`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      for (const r of result.results) {
        console.log(`━━━ ${r.connector.toUpperCase()} ━━━`);
        console.log(`状态: ${r.status}`);
        console.log(r.message);
        console.log("");
      }

      console.log(`💡 输入"看看对话记录"可以查看 Agent 之间的交流过程`);
      break;

    case "chat":
    default:
      console.log(`\n[对话模式]`);
      await orchestrator.sendMessage({
        groupId: group.id,
        userMessage: text
      });
      const messagesList = orchestrator.getMessages(group.id);
      const last = messagesList[messagesList.length - 1];
      console.log(last?.content || "收到");
      break;
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt() {
  rl.question("你> ", async (input) => {
    const cmd = input.trim().toLowerCase();

    if (cmd === "exit" || cmd === "quit") {
      console.log("再见！");
      rl.close();
      process.exit(0);
    }

    await handleUserMessage(input.trim());
    console.log("");
    prompt();
  });
}

rl.on("close", () => {
  process.exit(0);
});

prompt();
