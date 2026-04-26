import * as z from "zod/v4";
import { okResponse, withToolResponse } from "../utils/toolResponse.js";

export function registerSendMessageTool(server, orchestrator) {
  server.registerTool(
    "send_message",
    {
      description: "Send a user message to the group and run multi-AI rounds",
      inputSchema: {
        groupId: z.string().min(1),
        message: z.string().min(1),
        maxRounds: z.number().int().min(1).max(5).default(1)
      }
    },
    async ({ groupId, message, maxRounds }) => {
      const result = await withToolResponse(async () => {
        const messages = await orchestrator.sendMessage({
          groupId,
          userMessage: message,
          maxRounds
        });

        const latest = messages.slice(-8);
        return okResponse(
          {
            groupId,
            totalMessages: messages.length,
            latest
          },
          latest.map((m) => `${m.speaker}: ${m.content}`).join("\n")
        );
      });

      return {
        content: [{ type: "text", text: result.text }],
        structuredContent: result
      };
    }
  );
}
