import * as z from "zod/v4";
import { okResponse, withToolResponse } from "../utils/toolResponse.js";

export function registerCreateGroupTool(server, orchestrator) {
  server.registerTool(
    "create_group",
    {
      description: "Create a multi-AI chat group",
      inputSchema: {
        name: z.string().min(1).describe("Group name"),
        members: z
          .array(
            z.object({
              id: z.string().optional(),
              name: z.string().min(1),
              provider: z.string().default("echo"),
              role: z.string().optional(),
              rolePrompt: z.string().optional()
            })
          )
          .min(1)
          .describe("AI members in the group")
      }
    },
    async ({ name, members }) => {
      const result = await withToolResponse(async () => {
        const group = orchestrator.createGroup({ name, members });
        return okResponse(
          group,
          `Group created: ${group.name} (${group.id}) with ${group.members.length} members`
        );
      });

      return {
        content: [{ type: "text", text: result.text }],
        structuredContent: result
      };
    }
  );
}
