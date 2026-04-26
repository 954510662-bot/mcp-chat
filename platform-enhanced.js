#!/usr/bin/env node
import "dotenv/config";
import readline from "node:readline";
import { FileStore } from "./src/store/fileStore.js";
import { createProviderRegistry } from "./src/providers/index.js";
import { createConnectorRegistry, messageBus } from "./src/connectors/index.js";
import { GroupChatOrchestrator } from "./src/orchestrator/groupChat.js";
import { CollaborativeEngine } from "./src/platform/collaborativeEngine.js";
import { contextManager } from "./src/platform/contextManager.js";
import { AGENT_ROLES, getAgentIntro } from "./src/platform/agentRoles.js";

// ========== 初始化平台 ==========
const store = await FileStore.create("./data/platform-enhanced.json");
const providers = createProviderRegistry();
const connectors = createConnectorRegistry();
const orchestrator = new GroupChatOrchestrator({ store, providers });
const engine = new CollaborativeEngine({ store, connectors });

const group = orchestrator.createGroup({
  name: "多 Agent 协作平台",
  members: [{ name: "Coordinator", provider: "echo" }]
});

// ========== 监听事件 ==========
engine.on("planning", ({ instruction }) => {
  console.log(`\n🤔 正在分析需求: "${instruction.slice(0, 50)}..."`);
});

engine.on("plan_ready", ({ planText }) => {
  console.log("\n📋 规划完成！");
  console.log(planText);
  console.log("\n🚀 开始执行...\n");
});

engine.on("step_start", ({ step }) => {
  const role = AGENT_ROLES[step.agent];
  console.log(`⏳ ${role?.emoji || ""} ${role?.name || step.agent} 开始执行: ${step.description}`);
});

engine.on("step_complete", ({ step, result }) => {
  const role = AGENT_ROLES[step.agent];
  console.log(`✅ ${role?.emoji || ""} ${role?.name || step.agent} 完成！`);
});

engine.on("step_error", ({ step, error }) => {
  const role = AGENT_ROLES[step.agent];
  console.log(`❌ ${role?.emoji || ""} ${role?.name || step.agent} 出错: ${error}`);
});

engine.on("agent_talk", ({ from, to, message }) => {
  const fromRole = AGENT_ROLES[from];
  const toRole = AGENT_ROLES[to];
  console.log(`\n💬 ${fromRole?.emoji}${fromRole?.name} → ${toRole?.emoji}${toRole?.name}: ${message.slice(0, 80)}`);
});

// ========== 命令行交互 ==========
console.log("\n" + "=".repeat(70));
console.log("🚀 多 Agent 协作平台 - 增强版");
console.log("=".repeat(70));
console.log("");
console.log("👥 已注册的专家 Agent:");
for (const [name, role] of Object.entries(AGENT_ROLES)) {
  console.log(`   ${role.emoji} ${role.name} - ${role.title}`);
  console.log(`      擅长: ${role.specialty.join(", ")}`);
}
console.log("");
console.log("💡 你可以这样提问:");
console.log('   "帮我设计一个博客系统的架构"');
console.log('   "写一个 Hello World 网页并部署"');
console.log('   "查看云服务器的状态"');
console.log('   "三个 Agent 一起介绍一下自己"');
console.log("");
console.log("命令: /status 查看状态 /context 查看上下文 /help 帮助");
console.log("=".repeat(70) + "\n");

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

    if (cmd === "/status" || cmd === "状态") {
      const session = contextManager.getSession(group.id);
      const status = session.getAllContextStatus();
      console.log("\n📊 Agent 上下文状态:");
      for (const s of status) {
        const role = AGENT_ROLES[s.agent];
        console.log(`   ${role?.emoji} ${role?.name}: ${s.lines} 行, ${(s.chars / 1024).toFixed(1)}KB (${s.usagePercent}%)`);
      }
      console.log("");
      prompt();
      return;
    }

    if (cmd === "/help" || cmd === "帮助") {
      console.log("\n📖 可用命令:");
      console.log("   /status     - 查看各 Agent 上下文状态");
      console.log("   /context    - 查看上下文详情");
      console.log("   /agents     - 查看所有 Agent 介绍");
      console.log("   /help       - 显示帮助");
      console.log("   exit/quit   - 退出");
      console.log("");
      prompt();
      return;
    }

    if (cmd === "/agents") {
      console.log("\n👥 Agent 介绍:");
      for (const [name, role] of Object.entries(AGENT_ROLES)) {
        console.log(`\n${role.emoji} ${role.name} - ${role.title}`);
        console.log(`   擅长: ${role.specialty.join(", ")}`);
        console.log(`   性格: ${role.personality}`);
        console.log(`   强项: ${role.strengths.join(", ")}`);
      }
      console.log("");
      prompt();
      return;
    }

    if (!cmd) {
      prompt();
      return;
    }

    try {
      const { plan, summary } = await engine.executeTask(input, group.id);
      console.log("\n" + summary);
    } catch (e) {
      console.error(`\n❌ 执行出错: ${e.message}`);
    }

    console.log("");
    prompt();
  });
}

rl.on("close", () => {
  process.exit(0);
});

prompt();
