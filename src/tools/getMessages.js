import * as z from "zod/v4";
import { okResponse, withToolResponse } from "../utils/toolResponse.js";

export function registerGetMessagesTool(server, orchestrator) {
  server.registerTool(
    "get_messages",
    {
      description: "Get full transcript for a group",
      inputSchema: {
        groupId: z.string().min(1)
      }
    },
    async ({ groupId }) => {
      const result = await withToolResponse(async () => {
        const messages = orchestrator.getMessages(groupId);
        return okResponse(
          {
            groupId,
            totalMessages: messages.length,
            messages
          },
          messages.map((m) => `[${m.createdAt}] ${m.speaker}: ${m.content}`).join("\n")
        );
      });

      return {
        content: [{ type: "text", text: result.text }],
        structuredContent: result
      };
    }
  );
}
