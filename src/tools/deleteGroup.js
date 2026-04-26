import * as z from "zod/v4";
import { okResponse, withToolResponse } from "../utils/toolResponse.js";

export function registerDeleteGroupTool(server, orchestrator) {
  server.registerTool(
    "delete_group",
    {
      description: "Delete one group by groupId",
      inputSchema: {
        groupId: z.string().min(1),
        confirm: z
          .boolean()
          .default(false)
          .describe("Safety guard. Must be true to perform deletion")
      }
    },
    async ({ groupId, confirm }) => {
      const result = await withToolResponse(async () => {
        if (!confirm) {
          throw new Error("Deletion blocked. Pass confirm=true to delete this group.");
        }
        const group = orchestrator.deleteGroup(groupId);
        return okResponse({ groupId: group.id, name: group.name }, `Deleted group ${group.name}`);
      });

      return {
        content: [{ type: "text", text: result.text }],
        structuredContent: result
      };
    }
  );
}
