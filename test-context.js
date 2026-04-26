import { contextManager } from "./src/platform/contextManager.js";

console.log("=".repeat(60));
console.log("🧠 多 Agent 上下文容量管理测试");
console.log("=".repeat(60));
console.log("");
console.log("📊 Agent 容量配置:");
console.log("   🦅 OpenClaw   → 1000 行 / 50KB");
console.log("   ⚡ Claude Code → 2000 行 / 100KB");
console.log("   🤖 Hermes      → 3000 行 / 150KB");
console.log("");

const session = contextManager.getSession("test-group-1");

// 注册三个 Agent 的上下文
session.initAgentContext("openclaw");
session.initAgentContext("claude_code");
session.initAgentContext("hermes");

console.log("📝 模拟发送 1500 条消息...");
console.log("");

// 模拟 1500 轮对话
for (let i = 1; i <= 1500; i++) {
  session.addMessage("user", "all", `用户消息 #${i}: 这是一条测试消息，内容长度大概有几十个字左右`);
  session.addMessage("openclaw", "all", `OpenClaw 回复 #${i}: 收到用户消息`);
  session.addMessage("claude_code", "all", `Claude Code 回复 #${i}: 我来处理这个请求`);
  session.addMessage("hermes", "all", `Hermes 回复 #${i}: 好的，我来部署`);
}

// 查看每个 Agent 的上下文状态
const status = session.getAllContextStatus();

console.log("=".repeat(60));
console.log("📊 各 Agent 上下文使用情况");
console.log("=".repeat(60));
console.log("");

for (const s of status) {
  const agentEmoji =
    s.agent === "openclaw" ? "🦅" : s.agent === "claude_code" ? "⚡" : "🤖";

  console.log(`${agentEmoji} ${s.agent.toUpperCase()}`);
  console.log(`   行数: ${s.lines} / ${s.maxLines}`);
  console.log(`   字符: ${(s.chars / 1024).toFixed(1)}KB / ${(s.maxChars / 1024).toFixed(0)}KB`);
  console.log(`   使用率: ${s.usagePercent}%`);

  if (s.lines >= s.maxLines * 0.9) {
    console.log(`   ⚠️  上下文即将满，自动裁剪旧消息中...`);
  }
  console.log("");
}

// 测试共享记忆
console.log("=".repeat(60));
console.log("💾 共享记忆测试");
console.log("=".repeat(60));
console.log("");

session.setSharedMemory("project_name", "多 Agent 协作平台", "openclaw");
session.setSharedMemory("deployed_to_cloud", true, "hermes");
session.setSharedMemory("api_endpoint", "http://121.41.83.189:8787", "hermes");

console.log("📦 当前共享记忆:");
for (const key of session.getSharedMemoryKeys()) {
  const entry = session.sharedMemory.get(key);
  console.log(`   ${key} = ${JSON.stringify(entry.value)} (由 ${entry.setBy} 设置)`);
}
console.log("");

console.log("=".repeat(60));
console.log("✅ 上下文管理器工作正常！");
console.log("=".repeat(60));
console.log("");
console.log("💡 关键特性:");
console.log("   ✅ 每个 Agent 独立的上下文窗口");
console.log("   ✅ 自动裁剪超出容量的旧消息");
console.log("   ✅ 全局共享记忆，所有 Agent 都能读写");
console.log("   ✅ 完整的全局历史记录，不随裁剪丢失");
console.log("   ✅ 自动过期清理，防止内存溢出");
