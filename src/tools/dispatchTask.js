import * as z from "zod/v4";
import { okResponse, withToolResponse } from "../utils/toolResponse.js";

export function registerDispatchTaskTool(server, dispatcher) {
  server.registerTool(
    "dispatch_task",
    {
      description: "Dispatch one instruction to OpenClaw, Claude Code, Hermes together",
      inputSchema: {
        groupId: z.string().min(1),
        instruction: z.string().min(1),
        targets: z
          .array(z.enum(["openclaw", "claude_code", "hermes"]))
          .optional()
          .describe("Optional target list, defaults to all connectors")
      }
    },
    async ({ groupId, instruction, targets }) => {
      const result = await withToolResponse(async () => {
        const data = await dispatcher.dispatchTask({
          groupId,
          instruction,
          targets
        });
        return okResponse(data, data.receipts.join("\n"));
      });

      return {
        content: [{ type: "text", text: result.text }],
        structuredContent: result
      };
    }
  );
}
