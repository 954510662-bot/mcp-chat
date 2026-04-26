import * as z from "zod/v4";
import { okResponse, withToolResponse } from "../utils/toolResponse.js";

export function registerCleanupGroupsTool(server, orchestrator) {
  server.registerTool(
    "cleanup_groups",
    {
      description: "Delete old groups by age or retention policy",
      inputSchema: {
        confirm: z
          .boolean()
          .default(false)
          .describe("Safety guard. Must be true to perform cleanup"),
        maxAgeDays: z
          .number()
          .positive()
          .optional()
          .describe("Delete groups older than this age (days)")
      }
    },
    async ({ maxAgeDays, confirm }) => {
      const result = await withToolResponse(async () => {
        if (!confirm) {
          throw new Error("Cleanup blocked. Pass confirm=true to run group cleanup.");
        }
        const cleanup =
          typeof maxAgeDays === "number"
            ? orchestrator.cleanupOlderThan(maxAgeDays * 24 * 60 * 60 * 1000)
            : orchestrator.cleanupExpiredGroups();

        return okResponse(cleanup, `Deleted ${cleanup.deletedCount} groups`);
      });

      return {
        content: [{ type: "text", text: result.text }],
        structuredContent: result
      };
    }
  );
}
