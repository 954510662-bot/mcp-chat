import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MemoryStore } from "./store/memoryStore.js";
import { FileStore } from "./store/fileStore.js";
import { createProviderRegistry } from "./providers/index.js";
import { createConnectorRegistry } from "./connectors/index.js";
import { GroupChatOrchestrator } from "./orchestrator/groupChat.js";
import { TaskDispatcher } from "./platform/taskDispatcher.js";
import { registerCreateGroupTool } from "./tools/createGroup.js";
import { registerSendMessageTool } from "./tools/sendMessage.js";
import { registerGetMessagesTool } from "./tools/getMessages.js";
import { registerSummarizeGroupTool } from "./tools/summarizeGroup.js";
import { registerServerInfoTool } from "./tools/serverInfo.js";
import { registerListGroupsTool } from "./tools/listGroups.js";
import { registerDeleteGroupTool } from "./tools/deleteGroup.js";
import { registerCleanupGroupsTool } from "./tools/cleanupGroups.js";
import { registerDispatchTaskTool } from "./tools/dispatchTask.js";
import { registerGetTaskTool } from "./tools/getTask.js";
import { startHttpServer } from "./transports/httpServer.js";

function buildServer(store, retentionDays) {
  const server = new McpServer({
    name: "mcp-chat-server",
    version: "1.2.0"
  });

  const providers = createProviderRegistry();
  const connectors = createConnectorRegistry();
  const orchestrator = new GroupChatOrchestrator({ store, providers, retentionDays });
  const dispatcher = new TaskDispatcher({ store, connectors });

  registerCreateGroupTool(server, orchestrator);
  registerSendMessageTool(server, orchestrator);
  registerGetMessagesTool(server, orchestrator);
  registerSummarizeGroupTool(server, orchestrator);
  registerListGroupsTool(server, orchestrator);
  registerDeleteGroupTool(server, orchestrator);
  registerCleanupGroupsTool(server, orchestrator);
  registerDispatchTaskTool(server, dispatcher);
  registerGetTaskTool(server, dispatcher);
  registerServerInfoTool(server, dispatcher);

  return server;
}

async function main() {
  const persistence = (process.env.MCP_PERSISTENCE ?? "file").toLowerCase();
  const retentionDays = Number(process.env.MCP_RETENTION_DAYS ?? 0);
  const store =
    persistence === "memory"
      ? new MemoryStore()
      : await FileStore.create(process.env.MCP_STORE_FILE ?? "./data/store.json");

  const mode = (process.env.MCP_TRANSPORT ?? "stdio").toLowerCase();
  if (mode === "http") {
    if (retentionDays > 0) {
      const providers = createProviderRegistry();
      const cleanupOrchestrator = new GroupChatOrchestrator({ store, providers, retentionDays });
      const cleanupResult = cleanupOrchestrator.cleanupExpiredGroups();
      if (cleanupResult.deletedCount > 0) {
        console.error(`startup cleanup deleted ${cleanupResult.deletedCount} groups`);
      }

      const deletedTasks = store.cleanupExpiredTasks(retentionDays * 24 * 60 * 60 * 1000);
      if (deletedTasks > 0) {
        console.error(`startup cleanup deleted ${deletedTasks} expired tasks`);
      }
    }

    await startHttpServer({
      buildServer: () => buildServer(store, retentionDays),
      port: Number(process.env.MCP_PORT ?? 3000)
    });
    return;
  }

  if (retentionDays > 0) {
    const providers = createProviderRegistry();
    const cleanupOrchestrator = new GroupChatOrchestrator({ store, providers, retentionDays });
    const cleanupResult = cleanupOrchestrator.cleanupExpiredGroups();
    if (cleanupResult.deletedCount > 0) {
      console.error(`startup cleanup deleted ${cleanupResult.deletedCount} groups`);
    }

    const deletedTasks = store.cleanupExpiredTasks(retentionDays * 24 * 60 * 60 * 1000);
    if (deletedTasks > 0) {
      console.error(`startup cleanup deleted ${deletedTasks} expired tasks`);
    }
  }

  const server = buildServer(store, retentionDays);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `mcp-chat-server running on stdio transport (MCP_TRANSPORT=stdio, persistence=${persistence})`
  );
}

main().catch((error) => {
  console.error("Fatal server error:", error);
  process.exit(1);
});
