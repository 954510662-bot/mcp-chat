#!/usr/bin/env node
import "dotenv/config";
import readline from "node:readline";
import { MultiAgentPlatform } from "./src/index.js";

console.log("\n" + "=".repeat(70));
console.log("🚀 MCP 多 Agent 协作平台");
console.log("=".repeat(70));

// 初始化平台
const platform = new MultiAgentPlatform();
await platform.init();

// 监听事件
platform.on("task_start", ({ taskId, prompt }) => {
  console.log(`\n📋 开始任务 [${taskId.slice(0, 8)}]: ${prompt.slice(0, 50)}...`);
});

platform.on("step_start", ({ step, agent }) => {
  console.log(`⏳ ${agent} 执行: ${step.description.slice(0, 40)}`);
});

platform.on("step_complete", ({ step, result }) => {
  console.log(`✅ ${step.agent} 完成`);
});

platform.on("user_feedback_required", ({ question }) => {
  console.log(`\n🤔 ${question.agentId} 询问: ${question.question}`);
  if (question.options) {
    console.log(`   选项: ${question.options.join(" / ")}`);
  }
});

// 命令行交互
console.log("\n💡 使用方法: 直接输入需求，Agent 们会协作完成");
console.log("   命令: /agents 查看Agent /plugins 插件市场 /status 状态 /exit 退出");
console.log("=".repeat(70) + "\n");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt() {
  rl.question("> ", async (input) => {
    const cmd = input.trim().toLowerCase();

    if (cmd === "exit" || cmd === "quit") {
      console.log("再见！");
      await platform.destroy();
      rl.close();
      process.exit(0);
    }

    if (cmd === "/agents") {
      console.log("\n👥 可用 Agent:");
      for (const agent of platform.listAgents()) {
        console.log(`   ${agent.emoji} ${agent.name} - ${agent.title}`);
        console.log(`      上下文: ${agent.context.lines} 行 / ${agent.context.usagePercent}%`);
      }
      console.log("");
      prompt();
      return;
    }

    if (cmd === "/plugins") {
      console.log("\n🏪 插件市场:");
      for (const plugin of platform.listPlugins()) {
        const status = plugin.installed ? "✅" : "📦";
        console.log(`   ${status} ${plugin.name} - ${plugin.description}`);
      }
      console.log("");
      prompt();
      return;
    }

    if (cmd === "/status") {
      console.log("\n📊 平台状态:");
      console.log(`   Agent 数量: ${platform.listAgents().length}`);
      console.log(`   任务数: ${platform.listTasks().length}`);
      console.log(`   待回答问题: ${platform.getPendingQuestions().length}`);
      console.log("");
      prompt();
      return;
    }

    if (!cmd) {
      prompt();
      return;
    }

    // 执行任务
    try {
      const result = await platform.execute(input);
      console.log(`\n${"=".repeat(50)}`);
      console.log(`✅ 任务完成！耗时 ${result.duration}ms`);
      console.log(`${"=".repeat(50)}\n`);

      for (const r of result.results) {
        if (r.result.message) {
          console.log(`[${r.agent}]:`);
          const lines = r.result.message.split("\n").slice(0, 5);
          for (const line of lines) {
            console.log(`  ${line}`);
          }
          if (r.result.message.split("\n").length > 5) {
            console.log("  ...");
          }
          console.log("");
        }
      }
    } catch (e) {
      console.error(`\n❌ 错误: ${e.message}`);
    }

    console.log("");
    prompt();
  });
}

rl.on("close", async () => {
  await platform.destroy();
  process.exit(0);
});

prompt();
