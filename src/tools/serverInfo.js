import { okResponse } from "../utils/toolResponse.js";

export function registerServerInfoTool(server, dispatcher) {
  server.registerTool(
    "server_info",
    {
      description: "Return server capabilities and compatibility metadata",
      inputSchema: {}
    },
    async () => {
      const payload = {
        name: "mcp-chat-server",
        version: "1.2.0",
        transports: ["stdio", "http-streamable"],
        tools: [
          "create_group",
          "send_message",
          "get_messages",
          "summarize_group",
          "list_groups",
          "delete_group",
          "cleanup_groups",
          "dispatch_task",
          "get_task",
          "server_info"
        ],
        providers: ["echo", "openai-compatible"],
        connectors: dispatcher
          ? Array.from(dispatcher.connectors.keys()).map((name) => ({
              name,
              timeout: dispatcher.connectors.get(name)?.timeoutMs ?? 30000
            }))
          : [],
        features: [
          "concurrent-task-execution",
          "connector-timeout",
          "shared-memory",
          "task-ttl-cleanup",
          "store-interface-unification"
        ]
      };
      const result = okResponse(payload, JSON.stringify(payload, null, 2));

      return {
        content: [{ type: "text", text: result.text }],
        structuredContent: result
      };
    }
  );
}
