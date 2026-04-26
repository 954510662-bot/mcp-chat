import * as z from "zod/v4";
import { okResponse, withToolResponse } from "../utils/toolResponse.js";

export function registerSummarizeGroupTool(server, orchestrator) {
  server.registerTool(
    "summarize_group",
    {
      description: "Summarize current group discussion",
      inputSchema: {
        groupId: z.string().min(1)
      }
    },
    async ({ groupId }) => {
      const result = await withToolResponse(async () => {
        const summary = await orchestrator.summarize(groupId);
        return okResponse({ groupId, summary }, summary);
      });

      return {
        content: [{ type: "text", text: result.text }],
        structuredContent: result
      };
    }
  );
}
