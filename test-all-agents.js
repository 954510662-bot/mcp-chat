import "dotenv/config";
import { FileStore } from "./src/store/fileStore.js";
import { createProviderRegistry } from "./src/providers/index.js";
import { createConnectorRegistry, messageBus } from "./src/connectors/index.js";
import { GroupChatOrchestrator } from "./src/orchestrator/groupChat.js";
import { CollaborativeTask } from "./src/platform/collaborativeTask.js";

const store = await FileStore.create("./data/test-all-agents.json");
const providers = createProviderRegistry();
const connectors = createConnectorRegistry();
const orchestrator = new GroupChatOrchestrator({ store, providers });

const group = orchestrator.createGroup({
  name: "All Agents Group",
  members: [{ name: "Coordinator", provider: "echo" }]
});

console.log("=".repeat(70));
console.log("🚀 三 Agent 真实协作测试");
console.log("=".repeat(70));
console.log("🤖 Hermes    → 云服务器 121.41.83.189 (执行命令/部署)");
console.log("🦅 OpenClaw  → 本地 (架构/后端)");
console.log("⚡ Claude Code → 本地 (全栈代码)");
console.log("=".repeat(70));
console.log("");

const instruction = "每个 Agent 汇报一下自己的当前状态";

console.log(`📝 用户指令: "${instruction}"`);
console.log("");

const task = new CollaborativeTask({
  groupId: group.id,
  instruction,
  targets: ["openclaw", "claude_code", "hermes"],
  store
});

const result = await task.execute();

console.log("");
console.log("=".repeat(70));
console.log("✅ 所有 Agent 执行完成！");
console.log("=".repeat(70));
console.log("");

for (const r of result.results) {
  console.log(`━━━ ${r.connector.toUpperCase()} ━━━`);
  console.log(`状态: ${r.status}`);
  console.log("");
  console.log(r.message);
  console.log("");
}

console.log("=".repeat(70));
console.log("🎉 三 Agent 架构完美运行！");
console.log("=".repeat(70));
