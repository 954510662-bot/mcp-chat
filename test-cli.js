#!/usr/bin/env node
import readline from "node:readline";
import { FileStore } from "./src/store/fileStore.js";
import { createProviderRegistry } from "./src/providers/index.js";
import { createConnectorRegistry } from "./src/connectors/index.js";
import { GroupChatOrchestrator } from "./src/orchestrator/groupChat.js";
import { TaskDispatcher } from "./src/platform/taskDispatcher.js";

// 初始化平台
const store = await FileStore.create("./data/test-store.json");
const providers = createProviderRegistry();
const connectors = createConnectorRegistry();
const orchestrator = new GroupChatOrchestrator({ store, providers });
const dispatcher = new TaskDispatcher({ store, connectors });

const group = orchestrator.createGroup({
  name: "Test Group",
  members: [{ name: "Coordinator", provider: "echo" }]
});

console.log("=".repeat(60));
console.log("🤖 多 Agent 协作平台 - 命令行测试工具");
console.log("=".repeat(60));
console.log(`Group ID: ${group.id}`);
console.log("");
console.log("可用命令:");
console.log("  /task [指令]  → 分发任务给所有 Agent");
console.log("  /chat [内容]  → 普通群聊对话");
console.log("  /info         → 查看平台状态");
console.log("  /tasks        → 查看历史任务");
console.log("  /help         → 显示帮助");
console.log("  exit / quit   → 退出");
console.log("=".repeat(60));
console.log("");

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
      return;
    }

    if (cmd === "/help") {
      console.log(`
可用命令:
  /task [指令]  → 分发任务给所有 Agent (Claude Code / OpenClaw / Hermes)
  /chat [内容]  → 普通群聊对话
  /info         → 查看平台信息
  /tasks        → 查看历史任务
  /memory       → 查看共享记忆库
  /help         → 显示帮助
  exit / quit   → 退出
`);
      prompt();
      return;
    }

    if (cmd === "/info") {
      console.log(`
📊 平台状态
━━━━━━━━━━━━━━━━━━━━
Connectors: ${Array.from(connectors.keys()).join(", ")}
Providers: ${Array.from(providers.keys()).join(", ")}
Store: ${store.constructor.name}
Group: ${group.name} (${group.id})
`);
      prompt();
      return;
    }

    if (cmd === "/tasks") {
      const tasks = store.listTasks(group.id);
      console.log(`\n📋 历史任务 (${tasks.length} 个)`);
      for (const t of tasks.slice(-5)) {
        console.log(`  [${t.status}] ${t.createdAt.slice(0, 19)} - ${t.instruction.slice(0, 30)}...`);
      }
      console.log("");
      prompt();
      return;
    }

    if (cmd === "/memory") {
      console.log(`\n🧠 共享记忆库`);
      if (group.sharedMemory && group.sharedMemory.size > 0) {
        for (const [key, value] of group.sharedMemory) {
          console.log(`  ${key}:`, value);
        }
      } else {
        console.log("  (空)");
      }
      console.log("");
      prompt();
      return;
    }

    if (cmd.startsWith("/task")) {
      const instruction = input.slice(5).trim();
      if (!instruction) {
        console.log("用法: /task 你的指令");
        prompt();
        return;
      }

      console.log(`\n[平台] 收到任务：${instruction}`);
      console.log(`[平台] 正在分发给 ${Array.from(connectors.keys()).join(" / ")}...\n`);

      try {
        const result = await dispatcher.dispatchTask({
          groupId: group.id,
          instruction
        });

        console.log(`✅ 任务完成 (${result.task.id})`);
        for (const r of result.task.results) {
          console.log(`\n━━━ ${r.connector.toUpperCase()} ━━━`);
          console.log(`状态: ${r.status}`);
          console.log(r.message);
        }
        console.log("");
      } catch (e) {
        console.log(`❌ 错误: ${e.message}\n`);
      }
      prompt();
      return;
    }

    if (cmd.startsWith("/chat")) {
      const text = input.slice(5).trim();
      console.log(`\n[你] ${text}`);

      await orchestrator.sendMessage({
        groupId: group.id,
        userMessage: text
      });

      const messages = orchestrator.getMessages(group.id);
      for (const m of messages.slice(-group.members.length - 1)) {
        if (m.speaker !== "user") {
          console.log(`[${m.speaker}] ${m.content}`);
        }
      }
      console.log("");
      prompt();
      return;
    }

    // 默认：当成普通对话
    console.log(`\n[你] ${input}`);
    await orchestrator.sendMessage({
      groupId: group.id,
      userMessage: input
    });
    const messages = orchestrator.getMessages(group.id);
    for (const m of messages.slice(-group.members.length)) {
      console.log(`[${m.speaker}] ${m.content}`);
    }
    console.log("");
    prompt();
  });
}

prompt();
