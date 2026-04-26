import { okResponse } from "../utils/toolResponse.js";

export function registerServerInfoTool(server) {
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
          "server_info"
        ],
        providers: ["echo", "openai-compatible"]
      };
      const result = okResponse(payload, JSON.stringify(payload, null, 2));

      return {
        content: [{ type: "text", text: result.text }],
        structuredContent: result
      };
    }
  );
}
