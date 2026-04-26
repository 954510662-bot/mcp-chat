import { okResponse, withToolResponse } from "../utils/toolResponse.js";

export function registerListGroupsTool(server, orchestrator) {
  server.registerTool(
    "list_groups",
    {
      description: "List all groups ordered by creation time",
      inputSchema: {}
    },
    async () => {
      const result = await withToolResponse(async () => {
        const groups = orchestrator.listGroups();
        return okResponse(
          { totalGroups: groups.length, groups },
          `Found ${groups.length} groups`
        );
      });

      return {
        content: [{ type: "text", text: result.text }],
        structuredContent: result
      };
    }
  );
}
