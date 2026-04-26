import * as z from "zod/v4";
import { okResponse, withToolResponse } from "../utils/toolResponse.js";

export function registerGetTaskTool(server, dispatcher) {
  server.registerTool(
    "get_task",
    {
      description: "Get multi-agent task status and connector results",
      inputSchema: {
        taskId: z.string().min(1)
      }
    },
    async ({ taskId }) => {
      const result = await withToolResponse(async () => {
        const task = dispatcher.getTask(taskId);
        return okResponse(task, `Task ${task.id} status: ${task.status}`);
      });

      return {
        content: [{ type: "text", text: result.text }],
        structuredContent: result
      };
    }
  );
}
