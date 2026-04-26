import "dotenv/config";
import { FileStore } from "./src/store/fileStore.js";
import { createProviderRegistry } from "./src/providers/index.js";
import { createConnectorRegistry, messageBus } from "./src/connectors/index.js";
import { GroupChatOrchestrator } from "./src/orchestrator/groupChat.js";
import { CollaborativeTask } from "./src/platform/collaborativeTask.js";

const store = await FileStore.create("./data/test-hermes.json");
const providers = createProviderRegistry();
const connectors = createConnectorRegistry();
const orchestrator = new GroupChatOrchestrator({ store, providers });

const group = orchestrator.createGroup({
  name: "Test Hermes Group",
  members: [{ name: "Coordinator", provider: "echo" }]
});

console.log("=".repeat(60));
console.log("🧪 测试真实 Hermes Agent (云服务器 121.41.83.189)");
console.log("=".repeat(60));
console.log(`Group ID: ${group.id}`);
console.log("");

const task = new CollaborativeTask({
  groupId: group.id,
  instruction: "查看系统状态",
  targets: ["hermes"],
  store
});

console.log("🚀 发送指令: 查看系统状态");
console.log("");

const result = await task.execute();

console.log("");
console.log("=".repeat(60));
console.log("✅ 任务完成！");
console.log("=".repeat(60));
console.log("");

for (const r of result.results) {
  console.log(`━━━ ${r.connector.toUpperCase()} ━━━`);
  console.log(`状态: ${r.status}`);
  console.log("");
  console.log(r.message);
  console.log("");
}
