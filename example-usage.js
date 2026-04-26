#!/usr/bin/env node
import "dotenv/config";
import { MultiAgentPlatform } from "./src/index.js";

console.log("=".repeat(60));
console.log("📦 MCP 平台 - API 使用示例");
console.log("=".repeat(60));

// 1. 创建平台实例
console.log("\n1️⃣  创建平台实例...");
const platform = new MultiAgentPlatform({
  platform: {
    maxConcurrentTasks: 5
  }
});

// 2. 初始化
console.log("\n2️⃣  初始化平台...");
await platform.init();

// 3. 查看 Agent 列表
console.log("\n3️⃣  可用 Agent:");
for (const agent of platform.listAgents()) {
  console.log(`   ${agent.emoji} ${agent.name} - ${agent.title}`);
}

// 4. 查看插件市场
console.log("\n4️⃣  插件市场:");
for (const plugin of platform.listPlugins()) {
  const status = plugin.installed ? "✅" : "📦";
  console.log(`   ${status} ${plugin.name}`);
}

// 5. 执行任务
console.log("\n5️⃣  执行测试任务...");
const result = await platform.execute(
  "三个 Agent 分别介绍一下自己的能力",
  { taskId: "test_001" }
);

console.log(`\n✅ 任务执行完成！`);
console.log(`   任务 ID: ${result.taskId}`);
console.log(`   耗时: ${result.duration}ms`);
console.log(`   步骤数: ${result.results.length}`);

// 6. 查看任务状态
console.log("\n6️⃣  任务历史:");
console.log(`   总任务数: ${platform.listTasks().length}`);

// 7. 清理
console.log("\n7️⃣  关闭平台...");
await platform.destroy();

console.log("\n" + "=".repeat(60));
console.log("✨ 示例运行完成！");
console.log("=".repeat(60));
